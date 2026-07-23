import Link from "next/link";
import type { DeckMeta } from "@/lib/data/deckStore";
import { DeleteDeckButton } from "./DeleteDeckButton";

function DownloadIcon({ className }: { className?: string }) {
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
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

export function DeckList({ decks }: { decks: DeckMeta[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {decks.map((deck) => (
        <li key={deck.id} className="flex items-stretch gap-2">
          <Link
            href={`/decks/${deck.id}`}
            className="flex flex-1 items-center justify-between rounded border border-border px-4 py-3 text-text transition-colors hover:border-border-strong hover:bg-panel"
          >
            <span className="font-medium">{deck.title}</span>
            <span className="label-mono text-xs text-text-muted">
              {deck.slideCount} slides · {deck.language.toUpperCase()}
            </span>
          </Link>
          <a
            href={`/api/decks/${deck.id}/export`}
            download
            aria-label={`Export “${deck.title}” as .lecture file`}
            title="Export lecture (PDF + narrations + Q&A as a .lecture file)"
            className="grid shrink-0 place-items-center rounded border border-border px-3 text-text-muted transition-colors hover:border-border-strong hover:text-text"
          >
            <DownloadIcon className="block h-4 w-4" />
          </a>
          <DeleteDeckButton deckId={deck.id} title={deck.title} />
        </li>
      ))}
    </ul>
  );
}
