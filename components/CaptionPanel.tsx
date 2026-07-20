import type { NarrationState } from "@/hooks/useLecture";

export const STATUS_LABEL: Record<NarrationState, string> = {
  idle: "Slide",
  loading: "The professor is preparing the explanation…",
  narrating: "The professor is explaining…",
  paused: "Paused",
  asking: "Yes?",
  answering: "The professor is answering…",
  error: "Error",
};

export function CaptionPanel({
  scriptText,
  narrationState,
}: {
  scriptText: string;
  narrationState: NarrationState;
}) {
  if (narrationState !== "error" || !scriptText) return null;

  return (
    <div className="border-b border-border bg-red-950/40 px-6 py-3">
      <p className="text-sm text-red-400">{scriptText}</p>
    </div>
  );
}
