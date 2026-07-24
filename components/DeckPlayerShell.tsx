"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getDeckMeta } from "@/lib/data/deckDb";
import { LANGUAGE_NAMES, type DeckMeta } from "@/lib/data/types";
import { buildDeckArchive, downloadDeckArchive } from "@/lib/data/deckArchiveClient";
import { LectureViewer } from "./LectureViewer";
import { Logo } from "./Logo";
import { ApiSettingsDialog } from "./ApiSettingsDialog";

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

/**
 * Client shell for the player page: loads the deck's metadata from the
 * IndexedDB cache by id (there is no server deck store anymore) and handles
 * the "this deck is no longer cached" case locally.
 */
export function DeckPlayerShell({ deckId }: { deckId: string }) {
  // undefined = still loading from the cache; null = not present.
  const [deck, setDeck] = useState<DeckMeta | null | undefined>(undefined);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getDeckMeta(deckId)
      .then((meta) => {
        if (!cancelled) setDeck(meta);
      })
      .catch(() => {
        if (!cancelled) setDeck(null);
      });
    return () => {
      cancelled = true;
    };
  }, [deckId]);

  async function handleExport() {
    if (!deck || exporting) return;
    setExporting(true);
    setExportError(null);
    try {
      const { blob, fileName } = await buildDeckArchive(deck);
      downloadDeckArchive(blob, fileName);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  if (deck === undefined) {
    return (
      <div className="grid h-dvh place-items-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (deck === null) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <span aria-hidden className="text-3xl">
          🗂️
        </span>
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-2xl text-text">This lecture isn’t cached here</h1>
          <p className="max-w-sm text-sm leading-relaxed text-text-muted">
            Lectures live in this browser’s cache — it may have been cleared, or the link belongs
            to another device. Upload the slides (or a .lecture export) again to continue.
          </p>
        </div>
        <Link
          href="/"
          className="rounded bg-accent px-5 py-2.5 text-sm font-semibold tracking-wide text-accent-foreground transition-opacity hover:opacity-90"
        >
          ← Back to upload
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <Logo />
          <span className="label-mono hidden text-xs text-text-muted sm:inline">
            {LANGUAGE_NAMES[deck.language]}
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <span className="label-mono max-w-[8.5rem] truncate text-xs text-text-muted sm:max-w-[220px]">
            {deck.title}
          </span>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            aria-label="Export lecture as .lecture file"
            title={exportError ?? "Export lecture (PDF + narrations + Q&A as a .lecture file)"}
            className="grid h-8 w-8 shrink-0 place-items-center rounded border border-border text-text-muted transition-colors hover:border-border-strong hover:text-text disabled:opacity-50"
          >
            {exporting ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <DownloadIcon className="h-4 w-4" />
            )}
          </button>
          <ApiSettingsDialog />
          <Link
            href="/"
            className="label-mono shrink-0 text-xs text-text-muted hover:text-text"
            aria-label="Exit lecture"
          >
            ✕<span className="ml-1 hidden sm:inline">Exit</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-[1800px] flex-1 flex-col px-4 py-4 sm:px-6">
        <LectureViewer deckId={deck.id} slideCount={deck.slideCount} language={deck.language} />
      </main>
    </div>
  );
}
