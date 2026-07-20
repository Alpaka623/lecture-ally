import Link from "next/link";
import type { DeckMeta } from "@/lib/data/deckStore";

export function DeckList({ decks }: { decks: DeckMeta[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {decks.map((deck) => (
        <li key={deck.id}>
          <Link
            href={`/decks/${deck.id}`}
            className="flex items-center justify-between rounded border border-border px-4 py-3 text-text transition-colors hover:border-border-strong hover:bg-panel"
          >
            <span className="font-medium">{deck.title}</span>
            <span className="label-mono text-xs text-text-muted">
              {deck.slideCount} slides · {deck.language.toUpperCase()}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
