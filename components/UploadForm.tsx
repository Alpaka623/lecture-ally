"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { DeckMeta, Language } from "@/lib/data/types";
import { FEATURED_LANGUAGES, LANGUAGES, LANGUAGE_INFO } from "@/lib/data/types";
import { putDeck } from "@/lib/data/deckDb";
import { getPdfPageCount } from "@/lib/pdf/clientRender";
import { importDeckArchive } from "@/lib/data/deckArchiveClient";

function LanguageTile({
  code,
  selected,
  onSelect,
}: {
  code: Language;
  selected: boolean;
  onSelect: () => void;
}) {
  const info = LANGUAGE_INFO[code];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`rounded border px-4 py-3 text-left transition-colors ${
        selected
          ? "border-accent bg-accent/10 text-accent"
          : "border-border text-text hover:border-border-strong"
      }`}
    >
      <div className="text-sm font-semibold">{info.native}</div>
      <div className="text-xs text-text-muted">{info.english}</div>
    </button>
  );
}

function formatSize(bytes: number): string {
  return `${Math.round(bytes / 1024)} KB`;
}

// A .lecture/.zip file is a deck export to re-import (title, language and
// scripts come from its manifest); anything else is treated as a PDF upload.
function isDeckArchive(file: File): boolean {
  return /\.(lecture|zip)$/i.test(file.name) || file.type === "application/zip";
}

export function UploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [language, setLanguage] = useState<Language>("en");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The selected language lives behind the "More" tile when it isn't one of
  // the featured ones — the tile then doubles as its indicator.
  const extendedSelected = !FEATURED_LANGUAGES.includes(language);

  useEffect(() => {
    if (!pickerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPickerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pickerOpen]);

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  }

  // Everything happens in the browser: a PDF is counted and cached in
  // IndexedDB, a .lecture export is validated and unpacked there — nothing is
  // uploaded to the server. The deck then opens from the cache.
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("Please select a PDF or .lecture file.");
      return;
    }

    setIsUploading(true);
    try {
      let meta: DeckMeta;
      if (isDeckArchive(file)) {
        meta = await importDeckArchive(new Uint8Array(await file.arrayBuffer()));
      } else {
        if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
          throw new Error("File must be a PDF or a .lecture export.");
        }
        const slideCount = await getPdfPageCount(file);
        if (slideCount < 1) throw new Error("This PDF has no pages.");
        meta = {
          id: crypto.randomUUID(),
          title: title.trim() || file.name.replace(/\.pdf$/i, ""),
          slideCount,
          language,
          createdAt: new Date().toISOString(),
        };
        await putDeck(meta, file);
      }
      router.push(`/decks/${meta.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setIsUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-8">
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h2 className="label-mono text-xs text-text-muted">
            <span className="text-accent">01</span> — Lecture Language
          </h2>
          {/* Five featured languages plus a "More" tile — the full list would
              swamp the start page, so it opens in a picker on demand. */}
          <div className="grid grid-cols-2 gap-2">
            {FEATURED_LANGUAGES.map((code) => (
              <LanguageTile
                key={code}
                code={code}
                selected={language === code}
                onSelect={() => setLanguage(code)}
              />
            ))}
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              aria-haspopup="dialog"
              className={`rounded border px-4 py-3 text-left transition-colors ${
                extendedSelected
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-text hover:border-border-strong"
              }`}
            >
              <div className="text-sm font-semibold">More…</div>
              <div className="text-xs text-text-muted">
                {extendedSelected
                  ? LANGUAGE_INFO[language].native
                  : `+${LANGUAGES.length - FEATURED_LANGUAGES.length} languages`}
              </div>
            </button>
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="rounded border border-border bg-transparent px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-border-strong focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="label-mono text-xs text-text-muted">
            <span className="text-accent">02</span> — Upload Lecture
          </h2>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.lecture,.zip,application/zip"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />

          {/* Phones have nothing to drag from, so a big drop zone is dead
              space there — a compact tap-to-browse row does the job. */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer items-center gap-3 rounded border-2 border-dashed border-accent/60 bg-panel px-4 py-3.5 transition-colors active:border-accent sm:hidden"
          >
            <span aria-hidden className={`text-2xl ${file ? "text-accent" : "text-text-faint"}`}>
              📄
            </span>
            <div className="min-w-0 flex-1">
              {file ? (
                <>
                  <p className="truncate text-sm font-medium text-text">{file.name}</p>
                  <p className="text-xs text-text-muted">{formatSize(file.size)}</p>
                </>
              ) : (
                <p className="text-sm text-text-muted">Tap to choose a PDF or .lecture export</p>
              )}
            </div>
            {file && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="shrink-0 text-xs text-accent underline"
              >
                remove
              </button>
            )}
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="hidden min-h-[180px] flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded border-2 border-dashed border-accent/60 bg-panel px-4 py-6 text-center transition-colors hover:border-accent active:border-accent sm:flex"
          >
            {file ? (
              <>
                <span aria-hidden className="text-2xl text-accent">
                  📄
                </span>
                <p className="max-w-full truncate text-sm font-medium text-text">{file.name}</p>
                <p className="text-xs text-text-muted">{formatSize(file.size)}</p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-xs text-accent underline"
                >
                  remove
                </button>
              </>
            ) : (
              <>
                <span aria-hidden className="text-2xl text-text-faint">
                  📄
                </span>
                <p className="text-sm text-text-muted">
                  Drag a PDF or a .lecture export here, or click to browse
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={isUploading}
        className="w-full rounded bg-accent px-6 py-4 text-center text-sm font-semibold tracking-wide text-accent-foreground transition-opacity disabled:opacity-50"
      >
        {isUploading ? "Processing…" : "Start Lecture →"}
      </button>

      {pickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPickerOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Choose a language"
            className="flex max-h-[90dvh] w-full max-w-md flex-col rounded-lg border border-border bg-panel p-5 shadow-xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="label-mono text-xs text-text-muted">
                <span className="text-accent">A–Z</span> — All {LANGUAGES.length} Languages
              </h2>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                aria-label="Close"
                className="text-xs text-text-muted transition-colors hover:text-text"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
              {LANGUAGES.map((code) => (
                <LanguageTile
                  key={code}
                  code={code}
                  selected={language === code}
                  onSelect={() => {
                    setLanguage(code);
                    setPickerOpen(false);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
