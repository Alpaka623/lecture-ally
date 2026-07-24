"use client";

import { useEffect, useRef, useState, type SVGProps } from "react";
import type { NarrationState } from "@/hooks/useLecture";
import type { WordTiming } from "@/lib/data/types";
import { openApiSettings } from "@/lib/llmSettings";
import { SlideImage } from "./SlideImage";
import { KaraokeCaptions } from "./KaraokeCaptions";
import { SeekBar, formatTime } from "./SeekBar";

const STATUS_LABEL: Record<NarrationState, string> = {
  idle: "Slide",
  loading: "Preparing the explanation",
  narrating: "Explaining",
  paused: "Paused",
  answering: "Answering",
  error: "Error",
};

// No captions while "answering": the main track is stopped for the answer
// audio, so its time is frozen at 0 and the script captions would show the
// wrong words while the professor speaks the answer.
const CAPTION_STATES: NarrationState[] = ["narrating", "paused"];

// YouTube-style idle hide: while the narration plays, the chrome fades out
// after this long without activity. Once the pointer has left the player
// entirely we tuck it away sooner.
const CHROME_HIDE_DELAY = 3000;
const CHROME_HIDE_DELAY_AFTER_LEAVE = 1000;

function Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props} />
  );
}

const PlayIcon = (p: SVGProps<SVGSVGElement>) => <Icon {...p}><path d="M8 5v14l11-7z" /></Icon>;
const PauseIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></Icon>
);
const VolumeIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2a4.5 4.5 0 0 0-2.5-4.03v8.06A4.5 4.5 0 0 0 16.5 12zM14 3.23v2.06a7 7 0 0 1 0 13.42v2.06a9 9 0 0 0 0-17.54z" />
  </Icon>
);
const MuteIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M3 10v4h4l5 5V5L7 10H3zm13.59 2L19 9.41 17.59 8l-2.59 2.59L12.41 8 11 9.41 13.59 12 11 14.59 12.41 16l2.59-2.59L17.59 16 19 14.59 16.59 12z" />
  </Icon>
);
const CcIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M19 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM7.5 13.5h2v1.5h-2a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h2v1.5h-2a.5.5 0 0 0-.5.5v2a.5.5 0 0 0 .5.5zm7 0h2v1.5h-2a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h2v1.5h-2a.5.5 0 0 0-.5.5v2a.5.5 0 0 0 .5.5z" />
  </Icon>
);
const EnterFsIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
  </Icon>
);
const ExitFsIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
  </Icon>
);
const ChevronLeft = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12z" /></Icon>
);
const ChevronRight = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="m8.6 16.6 1.4 1.4 6-6-6-6-1.4 1.4L13.2 12z" /></Icon>
);
const QuestionIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...p}
  >
    <circle cx="12" cy="12" r="9.2" />
    <path d="M9.4 9.3a2.7 2.7 0 0 1 5.2 1c0 1.8-2.6 2.1-2.6 3.9" />
    <path d="M12 17.1h.01" />
  </svg>
);

function ChromeButton({
  label,
  active,
  className = "",
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  className?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className={`grid h-9 w-9 place-items-center rounded-full text-white/85 transition-all duration-150 hover:scale-110 hover:bg-white/10 hover:text-white active:scale-95 ${
        active ? "text-accent hover:text-accent" : ""
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function LecturePlayer({
  deckId,
  slideNumber,
  slideCount,
  canGoPrev,
  canGoNext,
  goPrev,
  goNext,
  narrationState,
  scriptText,
  captions,
  audioTime,
  audioDuration,
  volume,
  missingApiKey,
  seekTo,
  setVolume,
  onTogglePlayPause,
  onOpenChat,
}: {
  deckId: string;
  slideNumber: number;
  slideCount: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  goPrev: () => void;
  goNext: () => void;
  narrationState: NarrationState;
  scriptText: string;
  captions: WordTiming[];
  audioTime: number;
  audioDuration: number;
  volume: number;
  missingApiKey: boolean;
  seekTo: (t: number) => void;
  setVolume: (v: number) => void;
  onTogglePlayPause: () => void;
  onOpenChat: () => void;
}) {
  const playerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // On portrait phones we fake full screen with a fixed, rotated overlay
  // instead of the Fullscreen API: the API can't rotate a phone, and in
  // desktop responsive-devtools a real fullscreen targets the (landscape)
  // monitor — so the YouTube-style turn would never show there. The overlay
  // keys off the portrait viewport, so it works on a real phone and in
  // devtools alike. `anyFs` is what the chrome reacts to.
  const [pseudoFs, setPseudoFs] = useState(false);
  const anyFs = isFullscreen || pseudoFs;
  const isPortraitPhone = () =>
    typeof window !== "undefined" && matchMedia("(orientation: portrait) and (max-width: 1023px)").matches;
  // The slide's aspect ratio, measured from the image once it loads. On
  // phones in portrait the stage sizes itself by this instead of flexing to
  // fill the screen — a 16:10 slide in a tall, narrow player would otherwise
  // be mostly letterboxing (and the freed space goes to the chat below).
  // 16 / 9 is the placeholder until the first slide reports in.
  const [slideAspect, setSlideAspect] = useState("16 / 9");
  // Captions preference lives in localStorage; read it lazily at mount (same
  // pattern as the volume preference in useLecture). The player only mounts
  // client-side — after the deck shell loads its cache — so this can never
  // mismatch server-rendered HTML.
  const [showCaptions, setShowCaptions] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return localStorage.getItem("la-captions") !== "0";
    } catch {
      return true;
    }
  });
  // Chrome visibility for the YouTube-style idle hide (see effects below).
  const [chromeVisible, setChromeVisible] = useState(true);
  const chromeVisibleRef = useRef(chromeVisible);
  // Big play/pause glyph that flashes over the stage when playback is
  // toggled by tapping the slide itself.
  const [flash, setFlash] = useState<{ kind: "play" | "pause"; key: number } | null>(null);
  const flashKeyRef = useRef(0);
  // Timestamp of the last user activity, read by the idle-hide tick above.
  const lastActivityRef = useRef(0);
  // How long to wait before hiding; shortened when the pointer leaves.
  const hideDelayRef = useRef(CHROME_HIDE_DELAY);
  // True while keyboard focus sits on a control inside the player.
  const focusInsideRef = useRef(false);
  // Set on pointerdown when that tap's only job is revealing the chrome, so
  // the follow-up click on the stage skips the play/pause toggle.
  const revealTapRef = useRef(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === playerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Escape closes the pseudo full screen (the real Fullscreen API has its own
  // Escape handling).
  useEffect(() => {
    if (!pseudoFs) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPseudoFs(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pseudoFs]);

  useEffect(() => {
    chromeVisibleRef.current = chromeVisible;
  }, [chromeVisible]);

  // Idle hide: active only while the chrome is up and the narration actually
  // runs — paused, loading or error states keep the controls within reach.
  // Pointer activity doesn't restart a timeout per mouse tick (that would
  // re-render on every movement); it only refreshes a timestamp that the
  // single running timeout checks, postponing the hide when needed.
  useEffect(() => {
    if (narrationState !== "narrating" || !chromeVisible) return;
    lastActivityRef.current = Date.now();
    let timer = 0;
    const tick = () => {
      // Keyboard focus inside the chrome keeps it up (re-checked on a short
      // leash so focus loss is noticed promptly).
      if (focusInsideRef.current) {
        timer = window.setTimeout(tick, 500);
        return;
      }
      const idleFor = Date.now() - lastActivityRef.current;
      if (idleFor < hideDelayRef.current) {
        timer = window.setTimeout(tick, hideDelayRef.current - idleFor);
        return;
      }
      setChromeVisible(false);
    };
    timer = window.setTimeout(tick, hideDelayRef.current);
    return () => window.clearTimeout(timer);
  }, [narrationState, chromeVisible]);

  useEffect(() => {
    const el = playerRef.current;
    if (!el) return;
    // Registers activity without re-rendering; only the hidden→visible
    // transition itself touches state.
    const wake = () => {
      lastActivityRef.current = Date.now();
      hideDelayRef.current = CHROME_HIDE_DELAY;
      if (!chromeVisibleRef.current) setChromeVisible(true);
    };
    const onPointerDown = () => {
      // Touch has no hover to reveal the chrome, so a tap on the hidden
      // player only brings the controls back — the click that follows must
      // not immediately toggle playback.
      revealTapRef.current = !chromeVisibleRef.current;
      wake();
    };
    const onPointerLeave = (e: PointerEvent) => {
      // Touch pointers "leave" the moment the finger lifts — that must not
      // shorten the post-tap visibility window.
      if (e.pointerType === "touch") return;
      lastActivityRef.current = Date.now();
      hideDelayRef.current = CHROME_HIDE_DELAY_AFTER_LEAVE;
    };
    const onFocusIn = () => {
      // Only keyboard focus (:focus-visible) pins the chrome — a mouse click
      // on a control must not stop the idle hide.
      const active = document.activeElement;
      focusInsideRef.current =
        active instanceof HTMLElement && el.contains(active) && active.matches(":focus-visible");
    };
    const onFocusOut = () => {
      focusInsideRef.current = false;
      wake();
    };
    el.addEventListener("pointermove", wake);
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointerleave", onPointerLeave);
    el.addEventListener("focusin", onFocusIn);
    el.addEventListener("focusout", onFocusOut);
    return () => {
      el.removeEventListener("pointermove", wake);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointerleave", onPointerLeave);
      el.removeEventListener("focusin", onFocusIn);
      el.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  const toggleCaptions = () =>
    setShowCaptions((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("la-captions", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });

  const toggleFullscreen = () => {
    if (pseudoFs) {
      setPseudoFs(false);
      return;
    }
    if (isPortraitPhone()) {
      setPseudoFs(true);
      return;
    }
    const el = playerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen().catch(() => {});
  };

  // Asking needs the user's eyes on the chat input, so leave full screen first
  // (otherwise the chat drawer/sidebar sits outside the full-screen element).
  const handleAsk = async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        /* ignore */
      }
    }
    setPseudoFs(false);
    onOpenChat();
  };

  const isLoading = narrationState === "loading";
  const isPlaying = narrationState === "narrating";
  const playDisabled = isLoading || narrationState === "error";
  const muted = volume === 0;
  const showCaptionText = showCaptions && !!scriptText && CAPTION_STATES.includes(narrationState);

  // Tapping the slide toggles the narration — the same contract as YouTube's
  // player. If the chrome was hidden, the tap only revealed it (handled via
  // revealTapRef) and playback stays untouched.
  const handleStageClick = () => {
    if (revealTapRef.current) {
      revealTapRef.current = false;
      return;
    }
    if (playDisabled) return;
    flashKeyRef.current += 1;
    setFlash({ kind: isPlaying ? "pause" : "play", key: flashKeyRef.current });
    onTogglePlayPause();
  };

  return (
    <div
      ref={playerRef}
      data-la-player
      className={`relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#05070a] ${
        anyFs ? "rounded-none" : "rounded-xl border border-border max-lg:portrait:flex-none"
      } ${pseudoFs ? "la-pseudo-fs" : ""} ${chromeVisible ? "" : "cursor-none"}`}
    >
      {/* Ambient stage: a soft warm glow behind the letterboxed slide */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_-10%,rgba(242,182,50,0.10),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_120%,rgba(242,182,50,0.06),transparent_60%)]" />

      {/* Top status scrim */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/70 via-black/25 to-transparent px-4 py-3 transition-[opacity,transform] duration-300 ease-out ${
          chromeVisible ? "" : "-translate-y-2 opacity-0"
        }`}
      >
        <div className="flex items-center justify-between">
          <span
            className={`label-mono pointer-events-auto inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] backdrop-blur-sm ${
              narrationState === "error"
                ? "bg-red-500/15 text-red-300"
                : "bg-black/35 text-white/85"
            }`}
          >
            {isLoading && (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            )}
            {STATUS_LABEL[narrationState]}
          </span>
          <span className="label-mono pointer-events-auto rounded-full bg-black/35 px-3 py-1 text-[11px] text-white/70 backdrop-blur-sm">
            {String(slideNumber).padStart(2, "0")}
            <span className="text-white/35"> / {String(slideCount).padStart(2, "0")}</span>
          </span>
        </div>
      </div>

      {/* Stage */}
      <div
        onClick={handleStageClick}
        style={{ aspectRatio: slideAspect }}
        className={`relative flex min-h-0 flex-1 items-center justify-center px-2 py-2 ${
          chromeVisible ? "cursor-pointer" : ""
        } ${anyFs ? "" : "max-lg:portrait:max-h-[45dvh] max-lg:portrait:flex-none"}`}
      >
        {/* suppressHydrationWarning: browser extensions sometimes strip the
            `disabled` attribute from buttons before React hydrates, which
            trips a mismatch warning even though the server HTML is correct.
            goPrev/goNext guard against the un-disabled click, so behavior
            stays correct either way. */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          disabled={!canGoPrev}
          suppressHydrationWarning
          aria-label="Previous slide"
          className={`absolute left-2 z-10 grid h-10 w-10 place-items-center rounded-full bg-black/30 text-white/80 backdrop-blur-sm transition-all duration-200 hover:bg-black/55 hover:text-white disabled:cursor-default ${
            chromeVisible ? "opacity-100 disabled:opacity-0" : "pointer-events-none opacity-0"
          }`}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <SlideImage
          deckId={deckId}
          slideNumber={slideNumber}
          onNaturalSize={(w, h) => setSlideAspect(`${w} / ${h}`)}
        />

        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#05070a]/80 px-6 backdrop-blur-sm">
            <span className="h-9 w-9 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            {/* The spinner already reads as "loading", so the caption is
                desktop-only — on a narrow phone it would overflow the stage.
                text-center + max-w-full keep it inside the container if the
                player is ever narrow enough to wrap it. */}
            <p className="label-mono hidden max-w-full text-center text-xs text-accent sm:block">
              The professor is preparing the explanation…
            </p>
          </div>
        )}

        {missingApiKey && narrationState === "error" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-[#05070a]/90 px-6 text-center backdrop-blur-sm">
            <span aria-hidden className="text-3xl">
              🔑
            </span>
            <div className="flex flex-col gap-1.5">
              <p className="label-mono text-xs text-accent">Your API key is needed</p>
              <p className="max-w-sm text-sm leading-relaxed text-text-muted">
                LectureAlly ships without a built-in key, so your usage stays yours. Add your own
                key — it is stored only in this browser.
              </p>
            </div>
            <button
              type="button"
              onClick={openApiSettings}
              className="rounded bg-accent px-5 py-2.5 text-sm font-semibold tracking-wide text-accent-foreground transition-opacity hover:opacity-90"
            >
              Open API settings
            </button>
            <p className="text-xs text-text-faint">
              No key yet? Get a free one at{" "}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-muted underline hover:text-text"
              >
                aistudio.google.com/apikey
              </a>
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          disabled={!canGoNext}
          suppressHydrationWarning
          aria-label="Next slide"
          className={`absolute right-2 z-10 grid h-10 w-10 place-items-center rounded-full bg-black/30 text-white/80 backdrop-blur-sm transition-all duration-200 hover:bg-black/55 hover:text-white disabled:cursor-default ${
            chromeVisible ? "opacity-100 disabled:opacity-0" : "pointer-events-none opacity-0"
          }`}
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        {/* Play/pause flash after a tap on the slide */}
        {flash && (
          <div
            key={flash.key}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
          >
            <span
              className="chrome-flash grid h-20 w-20 place-items-center rounded-full bg-black/60 text-white shadow-2xl backdrop-blur-sm"
              onAnimationEnd={() => setFlash(null)}
            >
              {flash.kind === "play" ? (
                <PlayIcon className="h-10 w-10 translate-x-0.5" />
              ) : (
                <PauseIcon className="h-10 w-10" />
              )}
            </span>
          </div>
        )}
      </div>

      {/* Captions overlay (CC): karaoke-style word-by-word when timings are
          available, full-text fallback otherwise */}
      {showCaptionText && (
        <div
          className={`pointer-events-none absolute inset-x-0 z-10 flex justify-center px-4 transition-[bottom] duration-300 ease-out sm:px-6 ${
            chromeVisible ? "bottom-24 sm:bottom-28" : "bottom-6"
          }`}
        >
          {captions.length > 0 ? (
            <KaraokeCaptions words={captions} time={audioTime} />
          ) : (
            <p className="max-w-3xl rounded-md bg-black/75 px-3 py-1 text-center text-sm leading-snug text-white shadow-lg sm:px-4 sm:py-1.5 sm:text-lg">
              {scriptText}
            </p>
          )}
        </div>
      )}

      {/* Bottom control bar */}
      <div
        className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-2 pb-2 pt-5 transition-[opacity,transform] duration-300 ease-out sm:px-3 sm:pb-2.5 sm:pt-10 ${
          chromeVisible ? "" : "pointer-events-none translate-y-3 opacity-0"
        }`}
      >
        <SeekBar
          currentTime={audioTime}
          duration={audioDuration}
          disabled={audioDuration <= 0}
          onSeek={seekTo}
        />

        <div className="mt-1 flex items-center gap-1">
          <ChromeButton
            label={isPlaying ? "Pause" : "Play"}
            onClick={onTogglePlayPause}
          >
            <span className={playDisabled ? "opacity-40" : ""}>
              {isPlaying ? <PauseIcon className="h-7 w-7" /> : <PlayIcon className="h-7 w-7" />}
            </span>
          </ChromeButton>

          {/* Volume: speaker + expand-on-hover slider */}
          <div className="group/vol flex items-center">
            <ChromeButton
              label={muted ? "Unmute" : "Mute"}
              onClick={() => setVolume(muted ? 1 : 0)}
            >
              {muted ? <MuteIcon className="h-6 w-6" /> : <VolumeIcon className="h-6 w-6" />}
            </ChromeButton>
            <div className="grid grid-cols-[0fr] transition-[grid-template-columns] duration-200 ease-out group-hover/vol:grid-cols-[1fr] group-focus-within/vol:grid-cols-[1fr]">
              <div className="overflow-hidden">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  aria-label="Volume"
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="volume-slider ml-1 mr-2 h-4 w-20 cursor-pointer focus:outline-none"
                />
              </div>
            </div>
          </div>

          <span className="ml-1 select-none font-mono text-[13px] tabular-nums text-white/90">
            {formatTime(audioTime)}
            <span className="text-white/45"> / {formatTime(audioDuration)}</span>
          </span>

          <div className="ml-auto flex items-center gap-1">
            <ChromeButton label="Captions" active={showCaptions} onClick={toggleCaptions}>
              <CcIcon className="h-6 w-6" />
            </ChromeButton>

            {/* Only shown on landscape phones — there the chat sits in a
                drawer behind this button. On desktop the sidebar is always
                visible and in portrait the chat is inline below the player,
                so the button would be redundant in both. */}
            <ChromeButton
              label="Ask the professor"
              className="lg:hidden portrait:max-lg:hidden"
              onClick={handleAsk}
            >
              <QuestionIcon className="h-6 w-6" />
            </ChromeButton>

            <ChromeButton
              label={anyFs ? "Exit full screen" : "Full screen"}
              onClick={toggleFullscreen}
            >
              {anyFs ? <ExitFsIcon className="h-6 w-6" /> : <EnterFsIcon className="h-6 w-6" />}
            </ChromeButton>
          </div>
        </div>
      </div>
    </div>
  );
}
