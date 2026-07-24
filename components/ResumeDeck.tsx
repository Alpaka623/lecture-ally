"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getActiveDeckMeta } from "@/lib/data/deckDb";
import type { DeckMeta } from "@/lib/data/types";

/**
 * The cache holds at most one active deck. When there is one, offer to jump
 * straight back into it — the closest thing to a "library" this app has
 * (permanent storage is the .lecture export).
 */
export function ResumeDeck() {
  const [deck, setDeck] = useState<DeckMeta | null>(null);

  useEffect(() => {
    let cancelled = false;
    getActiveDeckMeta()
      .then((meta) => {
        if (!cancelled) setDeck(meta);
      })
      .catch(() => {
        /* no cache — nothing to resume */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!deck) return null;

  return (
    <Link
      href={`/decks/${deck.id}`}
      className="group flex w-full items-center justify-between gap-3 rounded border border-border px-4 py-3 text-text transition-colors hover:border-border-strong hover:bg-panel"
    >
      <span className="flex min-w-0 items-center gap-2">
        <span aria-hidden className="text-accent">
          ▶
        </span>
        <span className="min-w-0 truncate font-medium">Continue “{deck.title}”</span>
      </span>
      <span className="label-mono shrink-0 whitespace-nowrap text-xs text-text-muted">
        {deck.slideCount} slides · {deck.language.toUpperCase()}
      </span>
    </Link>
  );
}
