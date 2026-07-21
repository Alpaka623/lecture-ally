"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Language, QnaEntry } from "@/lib/data/deckStore";

export type NarrationState =
  | "idle"
  | "loading"
  | "narrating"
  | "paused"
  | "asking"
  | "answering"
  | "error";

export function useLecture(deckId: string, slideCount: number, language: Language) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [narrationState, setNarrationState] = useState<NarrationState>("loading");
  const [scriptText, setScriptText] = useState("");
  const [qnaHistory, setQnaHistory] = useState<QnaEntry[]>([]);
  const [isAskOpen, setIsAskOpen] = useState(false);

  // The main slide narration and the Q&A cue/answer are two independent audio
  // tracks: asking a question pauses (not stops) the main track so it can be
  // resumed later, while the Q&A track is transient and replaced each time.
  const mainAudioRef = useRef<HTMLAudioElement | null>(null);
  const qnaAudioRef = useRef<HTMLAudioElement | null>(null);
  const loadTokenRef = useRef(0);

  const slideNumber = slideIndex + 1;

  // Reset UI state synchronously during render when the slide changes, per
  // React's documented "adjusting state when a prop changes" pattern — this
  // avoids the extra render an equivalent reset inside useEffect would cause.
  const [renderedSlideNumber, setRenderedSlideNumber] = useState(slideNumber);
  if (slideNumber !== renderedSlideNumber) {
    setRenderedSlideNumber(slideNumber);
    setNarrationState("loading");
    setScriptText("");
    setIsAskOpen(false);
    setQnaHistory([]);
  }

  const stopMainAudio = useCallback(() => {
    const audio = mainAudioRef.current;
    if (audio) {
      audio.onended = null;
      audio.pause();
      audio.src = "";
      mainAudioRef.current = null;
    }
  }, []);

  const stopQnaAudio = useCallback(() => {
    const audio = qnaAudioRef.current;
    if (audio) {
      audio.onended = null;
      audio.pause();
      audio.src = "";
      qnaAudioRef.current = null;
    }
  }, []);

  useEffect(() => {
    loadTokenRef.current += 1;
    const token = loadTokenRef.current;
    // Aborting on cleanup is what actually matters here: React (Strict Mode,
    // dev only) invokes this effect twice per slide change, and without an
    // abort the first invocation's requests keep running — racing the second
    // invocation's requests against the same server-side cache files and
    // occasionally corrupting a JSON response. It also cancels wasted
    // Gemini/TTS calls when the user navigates again before a slide finishes
    // generating.
    const controller = new AbortController();

    stopMainAudio();
    stopQnaAudio();

    fetch(`/api/decks/${deckId}/slides/${slideNumber}/qna`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (token !== loadTokenRef.current) return;
        setQnaHistory(data.qna ?? []);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (token !== loadTokenRef.current) return;
        setQnaHistory([]);
      });

    fetch(`/api/decks/${deckId}/slides/${slideNumber}/explain`, {
      method: "POST",
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(body.error ?? "Failed to generate explanation");
        }
        return res.json() as Promise<{ script: string; audioUrl: string }>;
      })
      .then((data) => {
        if (token !== loadTokenRef.current) return;
        setScriptText(data.script);
        const audio = new Audio(data.audioUrl);
        mainAudioRef.current = audio;
        audio.onended = () => {
          if (token !== loadTokenRef.current) return;
          setNarrationState("paused");
        };
        audio.play().catch(() => {});
        setNarrationState("narrating");
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (token !== loadTokenRef.current) return;
        setScriptText(err instanceof Error ? err.message : "Failed to generate explanation");
        setNarrationState("error");
      });

    // Warm the (cheap, local) slide-image cache for the neighbouring slides
    // so Next/Previous shows the image immediately instead of waiting on
    // on-demand PDF rendering. Deliberately not done for /explain — that
    // calls the rate-limited Gemini + TTS APIs and shouldn't run speculatively.
    if (slideNumber < slideCount) {
      fetch(`/api/decks/${deckId}/slides/${slideNumber + 1}/image`, { signal: controller.signal }).catch(() => {});
    }
    if (slideNumber > 1) {
      fetch(`/api/decks/${deckId}/slides/${slideNumber - 1}/image`, { signal: controller.signal }).catch(() => {});
    }

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId, slideNumber]);

  const goNext = useCallback(() => {
    stopMainAudio();
    stopQnaAudio();
    setSlideIndex((i) => Math.min(i + 1, slideCount - 1));
  }, [slideCount, stopMainAudio, stopQnaAudio]);

  const goPrev = useCallback(() => {
    stopMainAudio();
    stopQnaAudio();
    setSlideIndex((i) => Math.max(i - 1, 0));
  }, [stopMainAudio, stopQnaAudio]);

  // Play/Pause controls only the main narration. If a question is in
  // progress (the "Ja?" cue or an answer is playing), pressing it aborts
  // that and resumes the main narration instead.
  const togglePlayPause = useCallback(() => {
    if (narrationState === "asking" || narrationState === "answering") {
      stopQnaAudio();
      setIsAskOpen(false);
      const audio = mainAudioRef.current;
      if (audio) {
        if (audio.ended) audio.currentTime = 0;
        audio.play().catch(() => {});
      }
      setNarrationState("narrating");
      return;
    }

    const audio = mainAudioRef.current;
    if (!audio) return;

    if (audio.paused) {
      if (audio.ended) audio.currentTime = 0;
      audio.play().catch(() => {});
      setNarrationState("narrating");
    } else {
      audio.pause();
      setNarrationState("paused");
    }
  }, [narrationState, stopQnaAudio]);

  // Asking a question always interrupts whatever is currently playing (the
  // main narration, or an earlier "Ja?"/answer if one was already running)
  // and plays a short "Ja?" acknowledgement while the input opens.
  const openAsk = useCallback(() => {
    const token = loadTokenRef.current;
    mainAudioRef.current?.pause();
    stopQnaAudio();

    const audio = new Audio(`/api/prompts/ja?lang=${language}`);
    qnaAudioRef.current = audio;
    audio.play().catch(() => {});
    audio.onended = () => {
      if (token !== loadTokenRef.current) return;
    };

    setNarrationState("asking");
    setIsAskOpen(true);
  }, [language, stopQnaAudio]);

  const closeAsk = useCallback(() => {
    stopQnaAudio();
    setIsAskOpen(false);
    setNarrationState("paused");
  }, [stopQnaAudio]);

  const submitQuestion = useCallback(
    async (question: string) => {
      const token = loadTokenRef.current;
      stopQnaAudio();
      setIsAskOpen(false);
      setNarrationState("answering");

      try {
        const res = await fetch(`/api/decks/${deckId}/slides/${slideNumber}/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(body.error ?? "Failed to generate answer");
        }
        const data: { qnaId: string; answer: string; audioUrl: string } = await res.json();
        if (token !== loadTokenRef.current) return;

        setQnaHistory((prev) => [
          ...prev,
          { id: data.qnaId, question, answer: data.answer, askedAt: new Date().toISOString() },
        ]);

        const audio = new Audio(data.audioUrl);
        qnaAudioRef.current = audio;
        audio.onended = () => {
          if (token !== loadTokenRef.current) return;
          setNarrationState("paused");
        };
        audio.play().catch(() => {});
      } catch {
        if (token !== loadTokenRef.current) return;
        setNarrationState("paused");
      }
    },
    [deckId, slideNumber, stopQnaAudio],
  );

  return {
    slideIndex,
    slideNumber,
    narrationState,
    scriptText,
    qnaHistory,
    isAskOpen,
    canGoNext: slideIndex < slideCount - 1,
    canGoPrev: slideIndex > 0,
    goNext,
    goPrev,
    togglePlayPause,
    openAsk,
    closeAsk,
    submitQuestion,
  };
}
