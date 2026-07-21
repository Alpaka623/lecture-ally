"use client";

import { useEffect, useRef, useState, type SVGProps } from "react";
import type { NarrationState } from "@/hooks/useLecture";
import { SlideImage } from "./SlideImage";
import { SeekBar, formatTime } from "./SeekBar";

const STATUS_LABEL: Record<NarrationState, string> = {
  idle: "Slide",
  loading: "Preparing the explanation",
  narrating: "Explaining",
  paused: "Paused",
  answering: "Answering",
  error: "Error",
};

const CAPTION_STATES: NarrationState[] = ["narrating", "paused", "answering"];

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
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
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
      }`}
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
  audioTime,
  audioDuration,
  volume,
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
  audioTime: number;
  audioDuration: number;
  volume: number;
  seekTo: (t: number) => void;
  setVolume: (v: number) => void;
  onTogglePlayPause: () => void;
  onOpenChat: () => void;
}) {
  const playerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCaptions, setShowCaptions] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return localStorage.getItem("la-captions") !== "0";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === playerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
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
    onOpenChat();
  };

  const isLoading = narrationState === "loading";
  const isPlaying = narrationState === "narrating";
  const playDisabled = isLoading || narrationState === "error";
  const muted = volume === 0;
  const showCaptionText = showCaptions && !!scriptText && CAPTION_STATES.includes(narrationState);

  return (
    <div
      ref={playerRef}
      className={`group relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#05070a] ${
        isFullscreen ? "rounded-none" : "rounded-xl border border-border"
      }`}
    >
      {/* Ambient stage: a soft warm glow behind the letterboxed slide */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_-10%,rgba(242,182,50,0.10),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_120%,rgba(242,182,50,0.06),transparent_60%)]" />

      {/* Top status scrim */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/70 via-black/25 to-transparent px-4 py-3">
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
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 py-2">
        <button
          type="button"
          onClick={goPrev}
          disabled={!canGoPrev}
          aria-label="Previous slide"
          className="absolute left-2 z-10 grid h-10 w-10 place-items-center rounded-full bg-black/30 text-white/80 opacity-0 backdrop-blur-sm transition-all duration-200 hover:bg-black/55 hover:text-white enabled:group-hover:opacity-100 disabled:cursor-default"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <SlideImage deckId={deckId} slideNumber={slideNumber} />

        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#05070a]/80 backdrop-blur-sm">
            <span className="h-9 w-9 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="label-mono text-xs text-accent">The professor is preparing the explanation…</p>
          </div>
        )}

        <button
          type="button"
          onClick={goNext}
          disabled={!canGoNext}
          aria-label="Next slide"
          className="absolute right-2 z-10 grid h-10 w-10 place-items-center rounded-full bg-black/30 text-white/80 opacity-0 backdrop-blur-sm transition-all duration-200 hover:bg-black/55 hover:text-white disabled:opacity-0 group-hover:opacity-100 enabled:group-hover:opacity-100"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>

      {/* Captions overlay (CC) */}
      {showCaptionText && (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 z-10 flex justify-center px-6">
          <p className="max-w-3xl rounded-md bg-black/75 px-4 py-1.5 text-center text-base leading-snug text-white shadow-lg sm:text-lg">
            {scriptText}
          </p>
        </div>
      )}

      {/* Bottom control bar */}
      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-3 pb-2.5 pt-10">
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
                  className="ml-1 mr-2 h-1 w-20 cursor-pointer accent-[var(--color-accent)]"
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

            <ChromeButton label="Ask the professor" onClick={handleAsk}>
              <QuestionIcon className="h-6 w-6" />
            </ChromeButton>

            <ChromeButton
              label={isFullscreen ? "Exit full screen" : "Full screen"}
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <ExitFsIcon className="h-6 w-6" /> : <EnterFsIcon className="h-6 w-6" />}
            </ChromeButton>
          </div>
        </div>
      </div>
    </div>
  );
}
