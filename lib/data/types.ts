// Shared data types for a deck and its generated artefacts. These are the
// only pieces of the old server-side store that both worlds need: the
// (transitional) server code and the browser-side IndexedDB cache. Keeping
// them here means neither side imports the other's storage machinery just to
// name a type.

// Featured languages first (shown directly on the start page), the rest
// roughly alphabetical by English name (reachable through the "More" tile).
export type Language =
  | "en"
  | "de"
  | "fr"
  | "es"
  | "it"
  | "ar"
  | "zh"
  | "cs"
  | "da"
  | "nl"
  | "fi"
  | "el"
  | "hi"
  | "hu"
  | "id"
  | "ja"
  | "ko"
  | "nb"
  | "pl"
  | "pt"
  | "ro"
  | "ru"
  | "sv"
  | "tr"
  | "uk";

export const LANGUAGES: readonly Language[] = [
  "en",
  "de",
  "fr",
  "es",
  "it",
  "ar",
  "zh",
  "cs",
  "da",
  "nl",
  "fi",
  "el",
  "hi",
  "hu",
  "id",
  "ja",
  "ko",
  "nb",
  "pl",
  "pt",
  "ro",
  "ru",
  "sv",
  "tr",
  "uk",
];

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);
}

export interface LanguageInfo {
  /** Name of the language in that language, as shown on the picker tiles. */
  native: string;
  /** English name, shown as the tile's secondary line. */
  english: string;
}

export const LANGUAGE_INFO: Record<Language, LanguageInfo> = {
  en: { native: "English", english: "English" },
  de: { native: "Deutsch", english: "German" },
  fr: { native: "Français", english: "French" },
  es: { native: "Español", english: "Spanish" },
  it: { native: "Italiano", english: "Italian" },
  ar: { native: "العربية", english: "Arabic" },
  zh: { native: "中文", english: "Chinese" },
  cs: { native: "Čeština", english: "Czech" },
  da: { native: "Dansk", english: "Danish" },
  nl: { native: "Nederlands", english: "Dutch" },
  fi: { native: "Suomi", english: "Finnish" },
  el: { native: "Ελληνικά", english: "Greek" },
  hi: { native: "हिन्दी", english: "Hindi" },
  hu: { native: "Magyar", english: "Hungarian" },
  id: { native: "Bahasa Indonesia", english: "Indonesian" },
  ja: { native: "日本語", english: "Japanese" },
  ko: { native: "한국어", english: "Korean" },
  nb: { native: "Norsk", english: "Norwegian" },
  pl: { native: "Polski", english: "Polish" },
  pt: { native: "Português", english: "Portuguese" },
  ro: { native: "Română", english: "Romanian" },
  ru: { native: "Русский", english: "Russian" },
  sv: { native: "Svenska", english: "Swedish" },
  tr: { native: "Türkçe", english: "Turkish" },
  uk: { native: "Українська", english: "Ukrainian" },
};

/** Shown directly on the start page; everything else sits behind "More". */
export const FEATURED_LANGUAGES: readonly Language[] = ["en", "de", "fr", "es", "it"];

export const LANGUAGE_NAMES: Record<Language, string> = Object.fromEntries(
  LANGUAGES.map((code) => [code, LANGUAGE_INFO[code].english]),
) as Record<Language, string>;

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
