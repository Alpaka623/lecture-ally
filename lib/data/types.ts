// Shared data types for a deck and its generated artefacts. These are the
// only pieces of the old server-side store that both worlds need: the
// (transitional) server code and the browser-side IndexedDB cache. Keeping
// them here means neither side imports the other's storage machinery just to
// name a type.

export type Language = "en" | "de" | "fr" | "es" | "it";

export const LANGUAGES: readonly Language[] = ["en", "de", "fr", "es", "it"];

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);
}

export const LANGUAGE_NAMES: Record<Language, string> = {
  en: "English",
  de: "German",
  fr: "French",
  es: "Spanish",
  it: "Italian",
};

export interface DeckMeta {
  id: string;
  title: string;
  slideCount: number;
  language: Language;
  createdAt: string;
}

export interface WordTiming {
  /** Start offset from the beginning of the slide audio, in seconds. */
  start: number;
  /** Spoken duration of the word, in seconds. */
  duration: number;
  /** The word as reported by the TTS engine. */
  text: string;
}

export interface SlideScript {
  text: string;
  generatedAt: string;
  /**
   * Word-level timings matching the cached slide audio, from the TTS engine's
   * word-boundary metadata. Absent on slides generated before captions
   * existed — the player re-synthesizes such slides once to fill it in.
   */
  captions?: WordTiming[];
}

export interface QnaEntry {
  id: string;
  question: string;
  answer: string;
  askedAt: string;
  // Client-only, never persisted: an entry the user just sent whose answer is
  // still in flight (renders as a typing indicator) or whose request failed.
  pending?: boolean;
  failed?: boolean;
}
