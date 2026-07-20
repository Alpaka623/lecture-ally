"use client";

import { useState } from "react";

export function AskQuestionPanel({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (question: string) => void;
}) {
  const [question, setQuestion] = useState("");

  if (!isOpen) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setQuestion("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-lg border border-accent/40 bg-panel p-4"
    >
      <label className="label-mono text-xs text-accent">Your question for the professor</label>
      <textarea
        autoFocus
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        rows={3}
        className="rounded border border-border bg-transparent px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-border-strong focus:outline-none"
        placeholder="What would you like to know?"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded px-3 py-2 text-sm text-text-muted hover:text-text"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
        >
          Ask
        </button>
      </div>
    </form>
  );
}
