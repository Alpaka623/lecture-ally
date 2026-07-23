"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function SeekBar({
  currentTime,
  duration,
  disabled,
  onSeek,
}: {
  currentTime: number;
  duration: number;
  disabled: boolean;
  onSeek: (time: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragRatio, setDragRatio] = useState<number | null>(null);
  const [hoverRatio, setHoverRatio] = useState<number | null>(null);

  const ready = !disabled && Number.isFinite(duration) && duration > 0;
  const playheadRatio = dragRatio ?? (ready ? clamp(currentTime / duration, 0, 1) : 0);
  const tooltipRatio = dragRatio ?? hoverRatio;

  const ratioFromEvent = (event: { clientX: number }) => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    return clamp((event.clientX - rect.left) / rect.width, 0, 1);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!ready) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragRatio(ratioFromEvent(event));
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!ready) return;
    const ratio = ratioFromEvent(event);
    setHoverRatio(ratio);
    setDragRatio((prev) => (prev === null ? null : ratio));
  };

  const handlePointerUp = () => {
    if (dragRatio === null) return;
    onSeek(dragRatio * duration);
    setDragRatio(null);
  };

  const handlePointerLeave = () => {
    setHoverRatio(null);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!ready) return;
    let next: number | null = null;
    if (event.key === "ArrowRight") next = currentTime + 5;
    else if (event.key === "ArrowLeft") next = currentTime - 5;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = duration;
    if (next !== null) {
      event.preventDefault();
      onSeek(clamp(next, 0, duration));
    }
  };

  return (
    <div
      ref={trackRef}
      role="slider"
      aria-label="Seek within the explanation"
      aria-valuemin={0}
      aria-valuemax={ready ? Math.floor(duration) : 0}
      aria-valuenow={ready ? Math.floor((dragRatio ?? currentTime / duration) * duration) : 0}
      aria-valuetext={
        ready
          ? `${formatTime((dragRatio ?? currentTime / duration) * duration)} of ${formatTime(duration)}`
          : undefined
      }
      tabIndex={ready ? 0 : -1}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onKeyDown={handleKeyDown}
      className={`group relative flex h-6 w-full touch-none items-center rounded outline-none select-none focus-visible:ring-2 focus-visible:ring-white/70 sm:h-4 ${
        ready ? "cursor-pointer" : "cursor-default opacity-40"
      }`}
    >
      <div className="relative h-1 w-full rounded-full bg-white/25 transition-[height] duration-150 group-hover:h-1.5">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-accent"
          style={{ width: `${playheadRatio * 100}%` }}
        />
        <div
          className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow transition-transform duration-100 sm:h-3 sm:w-3 ${
            dragRatio !== null ? "scale-125" : "max-sm:scale-100 scale-0 group-hover:scale-100"
          }`}
          style={{ left: `${playheadRatio * 100}%` }}
        />
      </div>

      {ready && tooltipRatio !== null && (
        <div
          className="pointer-events-none absolute bottom-full mb-2 -translate-x-1/2 rounded bg-black/85 px-2 py-0.5 font-mono text-xs tabular-nums text-white"
          style={{ left: `${clamp(tooltipRatio, 0.04, 0.96) * 100}%` }}
        >
          {formatTime(tooltipRatio * duration)}
        </div>
      )}
    </div>
  );
}
