import type { QnaEntry } from "@/lib/data/types";

export function QnaTranscript({ qna }: { qna: QnaEntry[] }) {
  if (qna.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="label-mono text-xs text-text-muted">Questions about this slide</h3>
      {qna.map((entry) => (
        <div key={entry.id} className="flex flex-col gap-1 rounded-lg border border-border p-3 text-sm">
          <p className="font-medium text-text">You: {entry.question}</p>
          <p className="text-text-muted">Professor: {entry.answer}</p>
        </div>
      ))}
    </div>
  );
}
