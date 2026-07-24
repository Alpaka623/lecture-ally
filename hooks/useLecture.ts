"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Language, QnaEntry, WordTiming } from "@/lib/data/types";
import {
  appendSlideQna,
  getSlideAudioBlob,
  getSlideQna,
  getSlideScript,
  saveQnaAudio,
  saveSlideAudio,
  saveSlideScript,
} from "@/lib/data/deckDb";
import { getOrRenderSlideImage } from "@/lib/pdf/slideImageClient";
import {
  chatCompletion,
  chatCompletionStream,
  LANGUAGE_LINE,
  LlmError,
  MISSING_API_KEY_CODE,
  professorSystemPrompt,
} from "@/lib/llm/clientChat";
import { synthesize } from "@/lib/tts/ttsClient";

export type NarrationState =
  | "idle"
  | "loading"
  | "narrating"
  | "paused"
  | "answering"
  | "error";

interface PreparedExplanation {
  script: string;
  audio: Blob;
  captions: WordTiming[];
}

// In-flight "prepare this slide's explanation" runs, keyed by deck + slide.
// The player prefetches the next slide while the current one plays; if the
// user advances before that prefetch settles, the navigation's real
// preparation must join the running one instead of starting a second LLM +
// TTS run (double cost, and two writers racing the same cache entry). React
// Strict Mode's dev-only double effect lands here for the same reason.
const inflight = new Map<string, Promise<PreparedExplanation>>();

function prepareExplanation(
  deckId: string,
  slideNumber: number,
  slideCount: number,
  language: Language,
): Promise<PreparedExplanation> {
  const key = `${deckId}:${slideNumber}`;
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = doPrepare(deckId, slideNumber, slideCount, language).finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, promise);
  return promise;
}

// The client-side equivalent of the old /explain route: reuse the cached
// script/audio when present, otherwise render the slide, ask the model, and
// synthesize the narration — caching each artefact in IndexedDB as it goes.
async function doPrepare(
  deckId: string,
  slideNumber: number,
  slideCount: number,
  language: Language,
): Promise<PreparedExplanation> {
  let script = await getSlideScript(deckId, slideNumber);
  let audio = await getSlideAudioBlob(deckId, slideNumber);

  if (!script) {
    const imagePng = await getOrRenderSlideImage(deckId, slideNumber);
    const previous = slideNumber > 1 ? await getSlideScript(deckId, slideNumber - 1) : null;
    const text = await chatCompletion(
      {
        system: professorSystemPrompt(language),
        text: `Slide ${slideNumber} of ${slideCount}.${
          previous ? ` Previous slide covered: ${previous.text}` : ""
        } Explain this slide to the student.`,
        imagePng,
      },
      { maxTokens: 500 },
    );
    script = { text, generatedAt: new Date().toISOString() };
    await saveSlideScript(deckId, slideNumber, script);
  }

  // Captions (word timings) are tied to the audio, so synthesize whenever
  // either is missing. Audio and captions always come from the same synthesis
  // run, so they can't drift apart.
  if (!audio || !script.captions?.length) {
    const result = await synthesize(script.text, language);
    audio = result.audio;
    await saveSlideAudio(deckId, slideNumber, audio);
    script = { ...script, captions: result.captions };
    await saveSlideScript(deckId, slideNumber, script);
  }

  return { script: script.text, audio, captions: script.captions ?? [] };
}

export function useLecture(deckId: string, slideCount: number, language: Language) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [narrationState, setNarrationState] = useState<NarrationState>("loading");
  const [scriptText, setScriptText] = useState("");
  // Word-level timings for karaoke-style captions, matching the slide audio.
  const [captions, setCaptions] = useState<WordTiming[]>([]);
  const [qnaHistory, setQnaHistory] = useState<QnaEntry[]>([]);
  // The Q&A entry whose answer audio is currently playing. The chat panel
  // types that answer out at speaking pace while it plays, so text and voice
  // appear together; historical entries render without animation.
  const [speakingQnaId, setSpeakingQnaId] = useState<string | null>(null);
  const [audioTime, setAudioTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  // True when no API key was configured — the player shows an "add your key"
  // overlay instead of a plain error.
  const [missingApiKey, setMissingApiKey] = useState(false);
  // Bumped by retry() to re-run the slide-load effect after settings change.
  const [reloadToken, setReloadToken] = useState(0);

  // The main slide narration and the Q&A answer are two independent audio
  // tracks. Sending a question *stops* the main track so the professor goes
  // quiet while the answer plays; pressing play afterwards reloads it from
  // cache. The Q&A track is transient and replaced on every question.
  const mainAudioRef = useRef<HTMLAudioElement | null>(null);
  const qnaAudioRef = useRef<HTMLAudioElement | null>(null);
  // Object URLs handed to the audio elements — revoked when the track stops so
  // the cached blobs don't leak. mainAudioBlobRef keeps the current slide's
  // audio so resuming after a question needs no IndexedDB round trip.
  const mainAudioUrlRef = useRef<string | null>(null);
  const qnaAudioUrlRef = useRef<string | null>(null);
  const mainAudioBlobRef = useRef<Blob | null>(null);
  const loadTokenRef = useRef(0);
  // True while the main track is parked at its end to measure the duration
  // (see loadAndPlayMain); position updates are ignored during that probe so
  // the seek bar doesn't flash the probe position.
  const probingRef = useRef(false);

  // Volume is read lazily from localStorage on first client render (SSR has no
  // `window` and falls back to 1). A ref mirror lets async audio-creation
  // callbacks read the current level without a stale closure.
  const [volume, setVolumeState] = useState(() => {
    if (typeof window === "undefined") return 1;
    try {
      const raw = localStorage.getItem("la-volume");
      if (raw !== null) {
        const parsed = Number(raw);
        if (Number.isFinite(parsed)) return Math.min(Math.max(parsed, 0), 1);
      }
    } catch {
      /* ignore unavailable storage */
    }
    return 1;
  });
  const volumeRef = useRef(volume);

  const setVolume = useCallback((value: number) => {
    const clamped = Math.min(Math.max(value, 0), 1);
    volumeRef.current = clamped;
    setVolumeState(clamped);
    try {
      localStorage.setItem("la-volume", String(clamped));
    } catch {
      /* ignore */
    }
    if (mainAudioRef.current) mainAudioRef.current.volume = clamped;
    if (qnaAudioRef.current) qnaAudioRef.current.volume = clamped;
  }, []);

  const slideNumber = slideIndex + 1;

  // Reset UI state synchronously during render when the slide changes, per
  // React's documented "adjusting state when a prop changes" pattern — this
  // avoids the extra render an equivalent reset inside useEffect would cause.
  const [renderedSlideNumber, setRenderedSlideNumber] = useState(slideNumber);
  if (slideNumber !== renderedSlideNumber) {
    setRenderedSlideNumber(slideNumber);
    setNarrationState("loading");
    setScriptText("");
    setCaptions([]);
    setQnaHistory([]);
    setSpeakingQnaId(null);
    setAudioTime(0);
    setAudioDuration(0);
    setMissingApiKey(false);
  }

  const stopMainAudio = useCallback(() => {
    const audio = mainAudioRef.current;
    if (audio) {
      audio.onended = null;
      audio.pause();
      audio.src = "";
      mainAudioRef.current = null;
      probingRef.current = false;
      setAudioTime(0);
      setAudioDuration(0);
    }
    if (mainAudioUrlRef.current) {
      URL.revokeObjectURL(mainAudioUrlRef.current);
      mainAudioUrlRef.current = null;
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
    if (qnaAudioUrlRef.current) {
      URL.revokeObjectURL(qnaAudioUrlRef.current);
      qnaAudioUrlRef.current = null;
    }
    setSpeakingQnaId(null);
  }, []);

  // (Re)load the slide's explanation audio and start it from the top. Shared by
  // the slide-change effect and the "resume after a question" path in
  // togglePlayPause, because submitting a question stops (not pauses) the main
  // track — the professor stops talking so the answer can be heard.
  const loadAndPlayMain = useCallback(
    (token: number, audioBlob: Blob, onPlaybackStarted?: () => void) => {
      // Revoke the previous track's object URL before minting a new one.
      if (mainAudioUrlRef.current) URL.revokeObjectURL(mainAudioUrlRef.current);
      const audioUrl = URL.createObjectURL(audioBlob);
      mainAudioUrlRef.current = audioUrl;

      const audio = new Audio(audioUrl);
      audio.volume = volumeRef.current;
      mainAudioRef.current = audio;
      probingRef.current = true;

      audio.addEventListener("timeupdate", () => {
        if (token !== loadTokenRef.current || probingRef.current) return;
        if (audio.currentTime > 1e9) return;
        setAudioTime(audio.currentTime);
      });
      audio.addEventListener("durationchange", () => {
        if (token !== loadTokenRef.current) return;
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          setAudioDuration(audio.duration);
        }
      });
      audio.onended = () => {
        if (token !== loadTokenRef.current) return;
        if (Number.isFinite(audio.duration)) setAudioTime(audio.duration);
        setNarrationState("paused");
      };

      const startPlayback = () => {
        if (token !== loadTokenRef.current) return;
        probingRef.current = false;
        audio
          .play()
          .then(() => onPlaybackStarted?.())
          .catch(() => {});
      };

      // The TTS relay writes the duration into the WebM header, so a blob URL
      // reports a finite length immediately and this fast path is the norm;
      // the multi-seek probe below is the fallback for any unpatched file.
      const ensureDurationAndPlay = () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          setAudioDuration(audio.duration);
          startPlayback();
          return;
        }
        let attempts = 0;
        const resolveDuration = () => {
          audio.removeEventListener("seeked", resolveDuration);
          if (token !== loadTokenRef.current) return;
          if (Number.isFinite(audio.duration) && audio.duration > 0) {
            setAudioDuration(audio.duration);
            audio.currentTime = 0;
            startPlayback();
            return;
          }
          if (attempts++ < 3) {
            audio.addEventListener("seeked", resolveDuration);
            audio.currentTime = Number.MAX_SAFE_INTEGER;
            return;
          }
          audio.currentTime = 0;
          startPlayback();
        };
        audio.addEventListener("seeked", resolveDuration);
        audio.currentTime = Number.MAX_SAFE_INTEGER;
      };

      if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
        ensureDurationAndPlay();
      } else {
        audio.addEventListener("loadedmetadata", ensureDurationAndPlay, { once: true });
      }

      setNarrationState("narrating");
    },
    [volumeRef],
  );

  useEffect(() => {
    loadTokenRef.current += 1;
    const token = loadTokenRef.current;

    stopMainAudio();
    stopQnaAudio();

    // Q&A history comes straight from the cache.
    getSlideQna(deckId, slideNumber)
      .then((list) => {
        if (token !== loadTokenRef.current) return;
        setQnaHistory(list);
      })
      .catch(() => {
        if (token !== loadTokenRef.current) return;
        setQnaHistory([]);
      });

    prepareExplanation(deckId, slideNumber, slideCount, language)
      .then((prepared) => {
        if (token !== loadTokenRef.current) return;
        setMissingApiKey(false);
        setScriptText(prepared.script);
        setCaptions(prepared.captions);
        mainAudioBlobRef.current = prepared.audio;
        loadAndPlayMain(token, prepared.audio, () => {
          // Warm the neighbouring slides' render cache only once this slide's
          // narration is actually playing — rendering is CPU-heavy and we
          // don't want to compete with the current slide's decode. If autoplay
          // is blocked this never fires; the neighbour renders on demand.
          if (slideNumber < slideCount) {
            getOrRenderSlideImage(deckId, slideNumber + 1).catch(() => {});
          }
          if (slideNumber > 1) {
            getOrRenderSlideImage(deckId, slideNumber - 1).catch(() => {});
          }
        });

        // Speculatively prepare the next slide's explanation while this one
        // plays, so pressing Next starts instantly from the cache. Fire-and-
        // forget: errors resurface through the real request, and a completed
        // prefetch is cached even if the user navigates elsewhere.
        if (slideNumber < slideCount) {
          prepareExplanation(deckId, slideNumber + 1, slideCount, language).catch(() => {});
        }
      })
      .catch((err) => {
        if (token !== loadTokenRef.current) return;
        if (err instanceof LlmError && err.code === MISSING_API_KEY_CODE) {
          setMissingApiKey(true);
        }
        setScriptText(err instanceof Error ? err.message : "Failed to generate explanation");
        setNarrationState("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId, slideNumber, slideCount, language, loadAndPlayMain, reloadToken]);

  // `timeupdate` only fires ~4 times a second, which makes the seek bar
  // stutter; while the narration runs, read the position every frame.
  useEffect(() => {
    if (narrationState !== "narrating") return;
    const audio = mainAudioRef.current;
    if (!audio) return;
    let frame = 0;
    const tick = () => {
      if (!probingRef.current && audio.currentTime <= 1e9) setAudioTime(audio.currentTime);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [narrationState]);

  const seekTo = useCallback((time: number) => {
    const audio = mainAudioRef.current;
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const target = Math.min(Math.max(time, 0), audio.duration);
    audio.currentTime = target;
    setAudioTime(target);
  }, []);

  // The guards matter beyond deduplication: browser extensions can strip the
  // `disabled` attribute from the nav buttons before hydration, making them
  // clickable at the boundaries — without the early return, clicking them
  // there would stop the narration without changing the slide (the index
  // clamps to itself, so no reload happens) and leave it dead.
  const goNext = useCallback(() => {
    if (slideIndex >= slideCount - 1) return;
    stopMainAudio();
    stopQnaAudio();
    setSlideIndex((i) => Math.min(i + 1, slideCount - 1));
  }, [slideIndex, slideCount, stopMainAudio, stopQnaAudio]);

  const goPrev = useCallback(() => {
    if (slideIndex <= 0) return;
    stopMainAudio();
    stopQnaAudio();
    setSlideIndex((i) => Math.max(i - 1, 0));
  }, [slideIndex, stopMainAudio, stopQnaAudio]);

  // Play/Pause controls only the main narration. If an answer is still playing,
  // pressing it aborts that answer and (re)starts the main narration — the main
  // track was stopped when the question was sent, so resuming reloads it from
  // the cached blob (no new LLM/TTS call).
  const togglePlayPause = useCallback(() => {
    const resumeFromCache = () => {
      const blob = mainAudioBlobRef.current;
      if (blob) loadAndPlayMain(loadTokenRef.current, blob);
    };

    if (narrationState === "answering") {
      stopQnaAudio();
      resumeFromCache();
      return;
    }

    const audio = mainAudioRef.current;
    if (!audio) {
      // Stopped after a question: reload from cache.
      resumeFromCache();
      return;
    }

    if (audio.paused) {
      if (audio.ended) audio.currentTime = 0;
      audio.play().catch(() => {});
      setNarrationState("narrating");
    } else {
      audio.pause();
      setNarrationState("paused");
    }
  }, [narrationState, stopQnaAudio, loadAndPlayMain]);

  const submitQuestion = useCallback(
    async (question: string) => {
      stopQnaAudio();
      // Silence the professor immediately so the answer isn't talked over.
      stopMainAudio();
      setNarrationState("answering");
      const token = loadTokenRef.current;

      // Optimistic, WhatsApp-style: the question shows up at once and the
      // professor's slot shows a typing indicator until the first token of the
      // streamed answer arrives — then the text grows in live.
      const tempId = `pending-${crypto.randomUUID()}`;
      setQnaHistory((prev) => [
        ...prev,
        { id: tempId, question, answer: "", askedAt: new Date().toISOString(), pending: true },
      ]);

      try {
        const imagePng = await getOrRenderSlideImage(deckId, slideNumber);
        const script = await getSlideScript(deckId, slideNumber);

        // chatCompletionStream throws (rather than yielding) on an immediate
        // failure, so a missing key surfaces as a JSON-style error before any
        // tokens are shown.
        const deltas = await chatCompletionStream(
          {
            system: `You are the same warm, engaging university professor who just narrated this slide. A student is now asking a follow-up question. ${LANGUAGE_LINE[language]} Answer conversationally and briefly, staying consistent with what you already said. No markdown.`,
            text: `This is slide ${slideNumber} of ${slideCount}. What you already narrated for this slide: "${script?.text ?? ""}"\n\nStudent's question: ${question}`,
            imagePng,
          },
          { maxTokens: 400 },
        );

        let answer = "";
        for await (const text of deltas) {
          answer += text;
          setQnaHistory((prev) =>
            prev.map((entry) =>
              entry.id === tempId ? { ...entry, answer: entry.answer + text } : entry,
            ),
          );
        }

        const qnaId = crypto.randomUUID();
        const { audio } = await synthesize(answer, language);
        await saveQnaAudio(deckId, slideNumber, qnaId, audio);
        await appendSlideQna(deckId, slideNumber, {
          id: qnaId,
          question,
          answer,
          askedAt: new Date().toISOString(),
        });

        // Promote the optimistic entry to the persisted one (drops `pending`,
        // which removes the blinking cursor). If the user already navigated
        // away, the history was reset and this map is a harmless no-op.
        setQnaHistory((prev) =>
          prev.map((entry) =>
            entry.id === tempId
              ? { id: qnaId, question, answer: entry.answer, askedAt: entry.askedAt }
              : entry,
          ),
        );

        // Don't talk over the next slide's narration if the user moved on
        // while the answer was still streaming in.
        if (token !== loadTokenRef.current) return;

        // Starts the answer's typewriter animation in the chat panel — the
        // text types out while this audio plays.
        setSpeakingQnaId(qnaId);
        if (qnaAudioUrlRef.current) URL.revokeObjectURL(qnaAudioUrlRef.current);
        const url = URL.createObjectURL(audio);
        qnaAudioUrlRef.current = url;
        const audioEl = new Audio(url);
        audioEl.volume = volumeRef.current;
        qnaAudioRef.current = audioEl;
        audioEl.onended = () => {
          setNarrationState("paused");
          setSpeakingQnaId(null);
        };
        audioEl.play().catch(() => {});
      } catch (err) {
        if (err instanceof LlmError && err.code === MISSING_API_KEY_CODE) {
          setMissingApiKey(true);
        }
        setQnaHistory((prev) =>
          prev.map((entry) =>
            entry.id === tempId ? { ...entry, pending: false, failed: true } : entry,
          ),
        );
        if (token === loadTokenRef.current) setNarrationState("paused");
      }
    },
    [deckId, slideNumber, slideCount, language, stopQnaAudio, stopMainAudio],
  );

  // Re-run the current slide's generation — used after the user adds their
  // API key, so they don't have to leave the slide and come back.
  const retry = useCallback(() => {
    setMissingApiKey(false);
    setNarrationState("loading");
    setScriptText("");
    setCaptions([]);
    setReloadToken((t) => t + 1);
  }, []);

  // Revoke any live object URLs on unmount so cached blobs don't leak.
  useEffect(() => {
    return () => {
      if (mainAudioUrlRef.current) URL.revokeObjectURL(mainAudioUrlRef.current);
      if (qnaAudioUrlRef.current) URL.revokeObjectURL(qnaAudioUrlRef.current);
    };
  }, []);

  return {
    slideIndex,
    slideNumber,
    narrationState,
    scriptText,
    captions,
    qnaHistory,
    speakingQnaId,
    audioTime,
    audioDuration,
    volume,
    missingApiKey,
    canGoNext: slideIndex < slideCount - 1,
    canGoPrev: slideIndex > 0,
    goNext,
    goPrev,
    togglePlayPause,
    seekTo,
    setVolume,
    submitQuestion,
    retry,
  };
}
