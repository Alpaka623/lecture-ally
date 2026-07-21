import { mkdir, readFile, writeFile, rename, access } from "node:fs/promises";
import path from "node:path";

export const DATA_ROOT = path.join(process.cwd(), "data");
export const DECKS_ROOT = path.join(DATA_ROOT, "decks");
export const GLOBAL_ROOT = path.join(DATA_ROOT, "global");

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

export interface SlideScript {
  text: string;
  generatedAt: string;
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

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(p: string): Promise<void> {
  await mkdir(p, { recursive: true });
}

async function readJson<T>(p: string): Promise<T | null> {
  if (!(await exists(p))) return null;
  const raw = await readFile(p, "utf-8");
  return JSON.parse(raw) as T;
}

// Writes via a unique temp file + rename so a reader never observes a
// partially-written file — matters because concurrent requests for the same
// slide (e.g. React Strict Mode's dev-only double-invoke) can otherwise race
// a truncate-then-write against a read and corrupt the cache.
export async function writeFileAtomic(p: string, data: string | Buffer): Promise<void> {
  await ensureDir(path.dirname(p));
  const tmpPath = `${p}.${crypto.randomUUID()}.tmp`;
  await writeFile(tmpPath, data);

  // Windows can transiently refuse to rename over a file that another
  // process (a concurrent reader, an AV scanner) still has open, raising
  // EPERM/EBUSY even though nothing is actually wrong — retry briefly
  // instead of failing the request outright.
  for (let attempt = 1; ; attempt++) {
    try {
      await rename(tmpPath, p);
      return;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if ((code !== "EPERM" && code !== "EBUSY") || attempt >= 5) throw err;
      await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
    }
  }
}

async function writeJson(p: string, data: unknown): Promise<void> {
  await writeFileAtomic(p, JSON.stringify(data, null, 2));
}

export function deckDir(deckId: string): string {
  return path.join(DECKS_ROOT, deckId);
}

export function deckPdfPath(deckId: string): string {
  return path.join(deckDir(deckId), "original.pdf");
}

export function deckMetaPath(deckId: string): string {
  return path.join(deckDir(deckId), "deck.json");
}

export function slideImagePath(deckId: string, slideNumber: number): string {
  return path.join(deckDir(deckId), "slides", `slide-${slideNumber}.png`);
}

export function slideScriptPath(deckId: string, slideNumber: number): string {
  return path.join(deckDir(deckId), "scripts", `slide-${slideNumber}.json`);
}

export function slideAudioPath(deckId: string, slideNumber: number): string {
  return path.join(deckDir(deckId), "audio", `slide-${slideNumber}.webm`);
}

export function slideQnaPath(deckId: string, slideNumber: number): string {
  return path.join(deckDir(deckId), "qna", `slide-${slideNumber}.json`);
}

export function qnaAudioPath(deckId: string, slideNumber: number, qnaId: string): string {
  return path.join(deckDir(deckId), "qna", `slide-${slideNumber}`, `${qnaId}.webm`);
}

export function jaCueAudioPath(language: Language): string {
  return path.join(GLOBAL_ROOT, `ja-cue-${language}.webm`);
}

async function indexPath(): Promise<string> {
  return path.join(DECKS_ROOT, "index.json");
}

export async function listDecks(): Promise<DeckMeta[]> {
  const idxPath = await indexPath();
  const idx = await readJson<DeckMeta[]>(idxPath);
  return idx ?? [];
}

export async function addDeckToIndex(meta: DeckMeta): Promise<void> {
  const idxPath = await indexPath();
  const idx = (await readJson<DeckMeta[]>(idxPath)) ?? [];
  idx.unshift(meta);
  await writeJson(idxPath, idx);
}

export async function getDeckMeta(deckId: string): Promise<DeckMeta | null> {
  return readJson<DeckMeta>(deckMetaPath(deckId));
}

export async function saveDeckMeta(meta: DeckMeta): Promise<void> {
  await writeJson(deckMetaPath(meta.id), meta);
}

export async function getSlideScript(deckId: string, slideNumber: number): Promise<SlideScript | null> {
  return readJson<SlideScript>(slideScriptPath(deckId, slideNumber));
}

export async function saveSlideScript(deckId: string, slideNumber: number, script: SlideScript): Promise<void> {
  await writeJson(slideScriptPath(deckId, slideNumber), script);
}

export async function slideAudioExists(deckId: string, slideNumber: number): Promise<boolean> {
  return exists(slideAudioPath(deckId, slideNumber));
}

export async function saveSlideAudio(deckId: string, slideNumber: number, audio: Buffer): Promise<void> {
  await writeFileAtomic(slideAudioPath(deckId, slideNumber), audio);
}

export async function getSlideQna(deckId: string, slideNumber: number): Promise<QnaEntry[]> {
  return (await readJson<QnaEntry[]>(slideQnaPath(deckId, slideNumber))) ?? [];
}

export async function appendSlideQna(deckId: string, slideNumber: number, entry: QnaEntry): Promise<void> {
  const list = await getSlideQna(deckId, slideNumber);
  list.push(entry);
  await writeJson(slideQnaPath(deckId, slideNumber), list);
}

export async function saveQnaAudio(deckId: string, slideNumber: number, qnaId: string, audio: Buffer): Promise<void> {
  await writeFileAtomic(qnaAudioPath(deckId, slideNumber, qnaId), audio);
}

export async function jaCueAudioExists(language: Language): Promise<boolean> {
  return exists(jaCueAudioPath(language));
}

export async function saveJaCueAudio(language: Language, audio: Buffer): Promise<void> {
  await writeFileAtomic(jaCueAudioPath(language), audio);
}

export async function fileExists(p: string): Promise<boolean> {
  return exists(p);
}

export async function ensureDeckDirs(deckId: string): Promise<void> {
  await ensureDir(deckDir(deckId));
  await ensureDir(path.join(deckDir(deckId), "slides"));
  await ensureDir(path.join(deckDir(deckId), "scripts"));
  await ensureDir(path.join(deckDir(deckId), "audio"));
  await ensureDir(path.join(deckDir(deckId), "qna"));
}
