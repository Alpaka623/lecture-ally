"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type State = "idle" | "confirm" | "deleting" | "error";

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

/**
 * Two-step delete: first click arms the button ("Delete?"), second click
 * actually deletes. Blur disarms, so a stray click elsewhere never destroys
 * a deck by accident.
 */
export function DeleteDeckButton({ deckId, title }: { deckId: string; title: string }) {
  const router = useRouter();
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (state === "deleting") return;
    if (state === "idle" || state === "error") {
      setState("confirm");
      setError(null);
      return;
    }

    // state === "confirm" — the user clicked the armed button: delete.
    setState("deleting");
    try {
      const res = await fetch(`/api/decks/${deckId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Delete failed" }));
        throw new Error(body.error ?? "Delete failed");
      }
      // Re-run the server component so the deck disappears from the list.
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setState("error");
    }
  }

  const armed = state === "confirm" || state === "deleting";

  return (
    <button
      type="button"
      onClick={handleClick}
      onBlur={() => setState((s) => (s === "confirm" ? "idle" : s))}
      disabled={state === "deleting"}
      aria-label={state === "confirm" ? `Really delete “${title}”?` : `Delete “${title}”`}
      title={error ?? (state === "confirm" ? "Click again to delete" : "Delete lecture")}
      className={`shrink-0 rounded border px-3 text-xs transition-colors disabled:opacity-50 ${
        armed
          ? "border-red-400/60 bg-red-400/10 font-semibold text-red-400"
          : state === "error"
            ? "border-red-400/60 text-red-400"
            : "border-border text-text-muted hover:border-border-strong hover:text-text"
      }`}
    >
      {state === "deleting" ? (
        "Deleting…"
      ) : state === "confirm" ? (
        "Delete?"
      ) : state === "error" ? (
        "Retry?"
      ) : (
        <TrashIcon className="block h-4 w-4" />
      )}
    </button>
  );
}
