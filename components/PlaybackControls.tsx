import type { NarrationState } from "@/hooks/useLecture";

const PLAY_PAUSE_LABEL: Record<NarrationState, string> = {
  idle: "▷ Play",
  loading: "⏳ Loading…",
  narrating: "⏸ Pause",
  paused: "▷ Play",
  asking: "▷ Resume slide",
  answering: "▷ Resume slide",
  error: "▷ Play",
};

export function PlaybackControls({
  slideIndex,
  slideCount,
  narrationState,
  onTogglePlayPause,
  onAsk,
}: {
  slideIndex: number;
  slideCount: number;
  narrationState: NarrationState;
  onTogglePlayPause: () => void;
  onAsk: () => void;
}) {
  const isLoading = narrationState === "loading";
  const playPauseDisabled = isLoading || narrationState === "error";

  return (
    <div className="flex items-center gap-4">
      <div className="flex flex-1 items-center gap-3">
        <div className="flex flex-1 gap-1">
          {Array.from({ length: slideCount }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${i <= slideIndex ? "bg-accent" : "bg-border"}`}
            />
          ))}
        </div>
        <span className="label-mono text-xs text-text-muted">
          {slideIndex + 1} / {slideCount}
        </span>
      </div>

      <button
        type="button"
        onClick={onTogglePlayPause}
        disabled={playPauseDisabled}
        className={`label-mono rounded border px-4 py-2 text-xs transition-colors ${
          isLoading
            ? "animate-pulse border-accent text-accent"
            : "border-border text-text hover:border-border-strong disabled:opacity-30"
        }`}
      >
        {PLAY_PAUSE_LABEL[narrationState]}
      </button>

      <button
        type="button"
        onClick={onAsk}
        className="label-mono rounded bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground"
      >
        💬 Ask a question
      </button>
    </div>
  );
}
