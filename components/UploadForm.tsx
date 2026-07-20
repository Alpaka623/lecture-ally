"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { Language } from "@/lib/data/deckStore";

const LANGUAGES: { value: Language; native: string; english: string }[] = [
  { value: "en", native: "English", english: "English" },
  { value: "de", native: "Deutsch", english: "German" },
  { value: "fr", native: "Français", english: "French" },
  { value: "es", native: "Español", english: "Spanish" },
  { value: "it", native: "Italiano", english: "Italian" },
];

function formatSize(bytes: number): string {
  return `${Math.round(bytes / 1024)} KB`;
}

export function UploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [language, setLanguage] = useState<Language>("en");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("Please select a PDF file.");
      return;
    }

    const formData = new FormData();
    formData.set("file", file);
    formData.set("language", language);
    formData.set("title", title);

    setIsUploading(true);
    try {
      const res = await fetch("/api/decks", { method: "POST", body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(body.error ?? "Upload failed");
      }
      const { deckId } = await res.json();
      router.push(`/decks/${deckId}`);
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
          <div className="grid grid-cols-2 gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.value}
                type="button"
                onClick={() => setLanguage(lang.value)}
                className={`rounded border px-4 py-3 text-left transition-colors ${
                  language === lang.value
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-text hover:border-border-strong"
                }`}
              >
                <div className="text-sm font-semibold">{lang.native}</div>
                <div className="text-xs text-text-muted">{lang.english}</div>
              </button>
            ))}
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
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="flex min-h-[180px] flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded border-2 border-dashed border-accent/60 bg-panel px-4 py-6 text-center transition-colors hover:border-accent"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
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
                <p className="text-sm text-text-muted">Drag a PDF here or click to browse</p>
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
    </form>
  );
}
