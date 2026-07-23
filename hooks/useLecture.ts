"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { QnaEntry, WordTiming } from "@/lib/data/deckStore";
import { geminiAuthHeaders, MISSING_API_KEY_CODE } from "@/lib/geminiSettings";
import { slideAudioUrl } from "@/lib/http/slideUrls";

// Error from our own API routes, carrying the machine-readable `code` so the
// UI can distinguish "no API key configured" from generic failures.
class ApiError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

// The /ask route answers with an NDJSON stream (one event per line): text
// deltas while Gemini generates, then `done` with the audio once TTS finishes
// (or `error` if something breaks mid-stream).
type AskStreamEvent =
  | { type: "delta"; text: string }
  | { type: "done"; qnaId: string; audioUrl: string }
  | { type: "error"; error: string; code?: string };

export type NarrationState =
  | "idle"
  | "loading"
  | "narrating"
  | "paused"
  | "answering"
  | "error";

export function useLecture(deckId: string, slideCount: number) {
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
  // True while the server reports that no API key was sent along — the player
  // shows an "add your key" overlay instead of a plain error.
  const [missingApiKey, setMissingApiKey] = useState(false);
  // Bumped by retry() to re-run the slide-load effect after settings change.
  const [reloadToken, setReloadToken] = useState(0);

  // The main slide narration and the Q&A answer are two independent audio
  // tracks. Sending a question *stops* the main track so the professor goes
  // quiet while the answer plays; pressing play afterwards reloads it from
  // cache. The Q&A track is transient and replaced on every question.
  const mainAudioRef = useRef<HTMLAudioElement | null>(null);
  const qnaAudioRef = useRef<HTMLAudioElement | null>(null);
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
  }, []);

  const stopQnaAudio = useCallback(() => {
    const audio = qnaAudioRef.current;
    if (audio) {
      audio.onended = null;
      audio.pause();
      audio.src = "";
      qnaAudioRef.current = null;
    }
    setSpeakingQnaId(null);
  }, []);

  // (Re)load the slide's explanation audio and start it from the top. Shared by
  // the slide-change effect and the "resume after a question" path in
  // togglePlayPause, because submitting a question stops (not pauses) the main
  // track — the professor stops talking so the answer can be heard.
  const loadAndPlayMain = useCallback(
    (token: number, audioUrl: string, onPlaybackStarted?: () => void) => {
      const audio = new Audio(audioUrl);
      audio.volume = volumeRef.current;
      mainAudioRef.current = audio;
      probingRef.current = true;

      audio.addEventListener("timeupdate", () => {
        if (token !== loadTokenRef.current || probingRef.current) return;
        // Values above the sentinel are the duration probe below, not real
        // progress.
        if (audio.currentTime > 1e9) return;
        setAudioTime(audio.currentTime);
      });
      // The TTS WebMs carry no duration metadata, so browsers can (re)discover
      // the true length later on — once the file is fully buffered or after a
      // seek near the end. Mirror every such discovery into the UI so the
      // displayed duration self-heals even if the probe below came up short.
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

      // The WebM files produced by the TTS service originally carried no
      // duration metadata, so browsers reported `Infinity` — which breaks
      // both the seek bar and seeking itself. The app now writes the
      // duration into the header (at synthesis time, backfilled on first
      // serve), so the finite-duration fast path above is the norm and
      // this probe is the fallback for unpatched files: seeking to an
      // absurd timestamp makes the browser fetch the tail of the file
      // (via Range requests) and compute the real duration before
      // playback starts. `seeked` marks the seek — and the duration
      // recompute — as settled; if the length is still unknown
      // afterwards, probe again: a single probe that lands while the
      // file is still downloading would otherwise report a too-short
      // duration and never correct itself.
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
          // Probing exhausted — play anyway; the duration fills in via the
          // `durationchange` listener once the browser knows it.
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
      headers: geminiAuthHeaders(),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: "Unknown error" }));
          throw new ApiError(body.error ?? "Failed to generate explanation", body.code);
        }
        return res.json() as Promise<{
          script: string;
          audioUrl: string;
          captions?: WordTiming[];
        }>;
      })
      .then((data) => {
        if (token !== loadTokenRef.current) return;
        setMissingApiKey(false);
        setScriptText(data.script);
        setCaptions(data.captions ?? []);
        loadAndPlayMain(token, data.audioUrl, () => {
          // Warm the neighbouring slides' image cache only once this slide's
          // narration is actually playing: rendering a slide PNG is CPU-heavy
          // (pdfjs + PNG encode, in a worker thread), and starting it before
          // playback runs means competing with the current slide's decode and
          // with the click-time requests of a fast-forwarding user. If
          // autoplay is blocked (play() rejects) this never fires — the next
          // image then renders on demand, which the worker keeps cheap.
          if (slideNumber < slideCount) {
            fetch(`/api/decks/${deckId}/slides/${slideNumber + 1}/image`).catch(() => {});
          }
          if (slideNumber > 1) {
            fetch(`/api/decks/${deckId}/slides/${slideNumber - 1}/image`).catch(() => {});
          }
        });

        // Speculatively prepare the next slide's explanation while this one
        // plays, so pressing Next starts instantly from the server-side
        // cache. Fire-and-forget by design:
        // - Not tied to this effect's AbortController — advancing to the
        //   next slide is exactly when the prefetch must keep running, and
        //   even if the user goes elsewhere the on-disk cache keeps the
        //   completed result from being wasted.
        // - Errors are ignored: without an API key the call fails with a
        //   cheap 400, and any real failure resurfaces through the actual
        //   request when the user navigates.
        // - Concurrent duplicates (Strict Mode's double effect, navigation
        //   while the prefetch is still generating) are coalesced into one
        //   Gemini + TTS run server-side.
        if (slideNumber < slideCount) {
          fetch(`/api/decks/${deckId}/slides/${slideNumber + 1}/explain`, {
            method: "POST",
            headers: geminiAuthHeaders(),
          }).catch(() => {});
        }
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (token !== loadTokenRef.current) return;
        if (err instanceof ApiError && err.code === MISSING_API_KEY_CODE) {
          setMissingApiKey(true);
        }
        setScriptText(err instanceof Error ? err.message : "Failed to generate explanation");
        setNarrationState("error");
      });

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId, slideNumber, loadAndPlayMain, reloadToken]);

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
  // track was stopped when the question was sent, so resuming reloads it.
  const togglePlayPause = useCallback(() => {
    if (narrationState === "answering") {
      stopQnaAudio();
      loadAndPlayMain(loadTokenRef.current, slideAudioUrl(deckId, slideNumber));
      return;
    }

    const audio = mainAudioRef.current;
    if (!audio) {
      // Stopped after a question: reload from cache (no Gemini call).
      loadAndPlayMain(loadTokenRef.current, slideAudioUrl(deckId, slideNumber));
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
  }, [narrationState, stopQnaAudio, loadAndPlayMain, deckId, slideNumber]);

  const submitQuestion = useCallback(
    async (question: string) => {
      stopQnaAudio();
      // Silence the professor immediately so the answer isn't talked over.
      stopMainAudio();
      setNarrationState("answering");
      const token = loadTokenRef.current;

      // Optimistic, WhatsApp-style: the question shows up at once and the
      // professor's slot shows a typing indicator until the first token of
      // the streamed answer arrives — then the text grows in live.
      const tempId = `pending-${crypto.randomUUID()}`;
      setQnaHistory((prev) => [
        ...prev,
        { id: tempId, question, answer: "", askedAt: new Date().toISOString(), pending: true },
      ]);

      try {
        const res = await fetch(`/api/decks/${deckId}/slides/${slideNumber}/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...geminiAuthHeaders() },
          body: JSON.stringify({ question }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: "Unknown error" }));
          throw new ApiError(body.error ?? "Failed to generate answer", body.code);
        }
        if (!res.body) throw new ApiError("Failed to generate answer");

        let qnaId = "";
        let audioUrl = "";
        const handleEvent = (event: AskStreamEvent) => {
          if (event.type === "delta") {
            setQnaHistory((prev) =>
              prev.map((entry) =>
                entry.id === tempId ? { ...entry, answer: entry.answer + event.text } : entry,
              ),
            );
          } else if (event.type === "done") {
            qnaId = event.qnaId;
            audioUrl = event.audioUrl;
          } else {
            throw new ApiError(event.error, event.code);
          }
        };

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (line.trim()) handleEvent(JSON.parse(line) as AskStreamEvent);
          }
        }
        if (buffer.trim()) handleEvent(JSON.parse(buffer) as AskStreamEvent);

        // Promote the optimistic entry to the persisted one (drops `pending`,
        // which removes the blinking cursor). If the user already navigated
        // away, the history was reset and this map is a harmless no-op.
        setQnaHistory((prev) =>
          prev.map((entry) =>
            entry.id === tempId
              ? {
                  id: qnaId || entry.id,
                  question,
                  answer: entry.answer,
                  askedAt: entry.askedAt,
                }
              : entry,
          ),
        );

        // Don't talk over the next slide's narration if the user moved on
        // while the answer was still streaming in.
        if (token !== loadTokenRef.current) return;

        if (audioUrl) {
          // Starts the answer's typewriter animation in the chat panel — the
          // text types out while this audio plays.
          if (qnaId) setSpeakingQnaId(qnaId);
          const audio = new Audio(audioUrl);
          audio.volume = volumeRef.current;
          qnaAudioRef.current = audio;
          audio.onended = () => {
            setNarrationState("paused");
            setSpeakingQnaId(null);
          };
          audio.play().catch(() => {});
        } else {
          setNarrationState("paused");
        }
      } catch (err) {
        if (err instanceof ApiError && err.code === MISSING_API_KEY_CODE) {
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
    [deckId, slideNumber, stopQnaAudio, stopMainAudio],
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
