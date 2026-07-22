"use client";

import { useSyncExternalStore } from "react";
import {
  hasCustomGeminiSettings,
  openApiSettings,
  subscribeToGeminiSettings,
} from "@/lib/geminiSettings";

// Onboarding nudge shown while no API key is configured. Explains the concept
// up front — "your own key, stays in your browser" — so users aren't
// surprised by the key prompt later and know why it's safe to add one.
export function ApiKeyBanner() {
  const hasKey = useSyncExternalStore(
    subscribeToGeminiSettings,
    hasCustomGeminiSettings,
    () => false,
  );

  if (hasKey) return null;

  return (
    <div className="flex w-full flex-col gap-3 rounded-lg border border-accent/40 bg-accent/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm leading-relaxed text-text-muted">
        <span aria-hidden className="mr-1.5">
          🔑
        </span>
        LectureAlly works with <span className="text-text">your own Gemini API key</span> — stored
        only in your browser, never on a server.{" "}
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline"
        >
          Get a free key
        </a>
        .
      </p>
      <button
        type="button"
        onClick={openApiSettings}
        className="shrink-0 rounded bg-accent px-4 py-2 text-sm font-semibold tracking-wide text-accent-foreground transition-opacity hover:opacity-90"
      >
        Add API key
      </button>
    </div>
  );
}
