import { readFile } from "node:fs/promises";
import { unzipSync, zipSync, type Zippable } from "fflate";
import { getPdfPageCount } from "@/lib/pdf/renderSlide";
import {
  addDeckToIndex,
  deckPdfPath,
  deleteDeck,
  ensureDeckDirs,
  fileExists,
  isLanguage,
  saveDeckMeta,
  slideQnaPath,
  slideScriptPath,
  writeFileAtomic,
  type DeckMeta,
  type Language,
  type QnaEntry,
  type SlideScript,
  type WordTiming,
} from "./deckStore";

// A deck archive (".lecture" file) is a plain ZIP so it can be inspected on
// any machine. It carries everything that is expensive or impossible to
// regenerate — the source PDF, the narration scripts, the Q&A history — and
// leaves out what the app rebuilds on demand for free: slide images (rendered
// from the PDF) and audio (TTS via the key-free msedge-tts endpoint).
export const DECK_ARCHIVE_FORMAT = "lecture-ally/deck";
export const DECK_ARCHIVE_VERSION = 1;
export const DECK_ARCHIVE_EXTENSION = ".lecture";

export interface DeckArchiveManifest {
  format: typeof DECK_ARCHIVE_FORMAT;
  version: number;
  exportedAt: string;
  deck: {
    title: string;
    language: Language;
    slideCount: number;
    createdAt: string;
  };
  /**
   * Which optional binary parts are embedded. v1 exports are text-only, so
   * all three are false; the fields exist so importers can validate a future
   * "full" export that bundles audio and slide images.
   */
  includes: {
    narrationAudio: boolean;
    slideImages: boolean;
    qnaAudio: boolean;
  };
}

export interface DeckArchive {
  bytes: Uint8Array;
  fileName: string;
}

/**
 * Packs a deck into an importable .lecture archive: manifest + original PDF
 * + narration scripts + Q&A histories (text only — no audio, no slide PNGs).
 */
export async function buildDeckArchive(meta: DeckMeta): Promise<DeckArchive> {
  const manifest: DeckArchiveManifest = {
    format: DECK_ARCHIVE_FORMAT,
    version: DECK_ARCHIVE_VERSION,
    exportedAt: new Date().toISOString(),
    deck: {
      title: meta.title,
      language: meta.language,
      slideCount: meta.slideCount,
      createdAt: meta.createdAt,
    },
    includes: { narrationAudio: false, slideImages: false, qnaAudio: false },
  };

  const entries: Zippable = {
    "manifest.json": jsonBytes(manifest),
    // PDFs are already compressed — store without spending CPU on level 6.
    "original.pdf": [await readFile(deckPdfPath(meta.id)), { level: 0 }],
  };

  for (let slideNumber = 1; slideNumber <= meta.slideCount; slideNumber++) {
    const scriptPath = slideScriptPath(meta.id, slideNumber);
    if (await fileExists(scriptPath)) {
      entries[`scripts/slide-${slideNumber}.json`] = [await readFile(scriptPath), { level: 0 }];
    }
    const qnaPath = slideQnaPath(meta.id, slideNumber);
    if (await fileExists(qnaPath)) {
      entries[`qna/slide-${slideNumber}.json`] = [await readFile(qnaPath), { level: 0 }];
    }
  }

  return {
    bytes: zipSync(entries),
    fileName: `${archiveBaseName(meta.title)}${DECK_ARCHIVE_EXTENSION}`,
  };
}

export class DeckArchiveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeckArchiveError";
  }
}

// Generous bounds for a locally-run app. The uncompressed total is only
// knowable *after* unzipSync buffers everything, so the archive-size cap on
// the uploaded file is the real zip-bomb guard; the rest is belt and braces.
const MAX_ARCHIVE_BYTES = 512 * 1024 * 1024;
const MAX_UNCOMPRESSED_BYTES = 1024 * 1024 * 1024;
const MAX_ENTRIES = 10_000;
const MAX_SLIDE_COUNT = 10_000;

const SCRIPT_ENTRY = /^scripts\/slide-(\d+)\.json$/;
const QNA_ENTRY = /^qna\/slide-(\d+)\.json$/;
// QnA ids become file names later (audio cache), so keep them boring.
const QNA_ID = /^[A-Za-z0-9-]{1,64}$/;

/**
 * Validates and unpacks a .lecture archive into a brand-new deck (fresh id,
 * so the same archive can be imported repeatedly without collisions).
 * Throws DeckArchiveError with a user-facing message on any validation
 * problem; anything missing-but-regenerable (audio, slide images) is simply
 * not there — the app fills it in on demand.
 */
export async function importDeckArchive(data: Uint8Array): Promise<DeckMeta> {
  if (data.byteLength === 0) {
    throw new DeckArchiveError("The file is empty.");
  }
  if (data.byteLength > MAX_ARCHIVE_BYTES) {
    throw new DeckArchiveError("The file is too large to import.");
  }

  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(data);
  } catch {
    throw new DeckArchiveError("The file is not a valid ZIP archive.");
  }

  const names = Object.keys(entries);
  if (names.length > MAX_ENTRIES) {
    throw new DeckArchiveError("The archive contains too many files.");
  }
  const uncompressedBytes = names.reduce((sum, name) => sum + entries[name].byteLength, 0);
  if (uncompressedBytes > MAX_UNCOMPRESSED_BYTES) {
    throw new DeckArchiveError("The archive is too large when unpacked.");
  }

  // --- manifest ------------------------------------------------------------
  const manifest = parseJson<DeckArchiveManifest>(entries["manifest.json"], "manifest.json");
  if (!manifest || manifest.format !== DECK_ARCHIVE_FORMAT) {
    throw new DeckArchiveError("Not a LectureAlly export — manifest.json is missing or has the wrong format.");
  }
  if (manifest.version !== DECK_ARCHIVE_VERSION) {
    throw new DeckArchiveError(
      `Unsupported export version (${manifest.version}) — update LectureAlly and try again.`,
    );
  }
  const deck = manifest.deck;
  if (
    !deck ||
    typeof deck.title !== "string" ||
    !isLanguage(deck.language) ||
    !Number.isInteger(deck.slideCount) ||
    deck.slideCount < 1 ||
    deck.slideCount > MAX_SLIDE_COUNT
  ) {
    throw new DeckArchiveError("The manifest is missing valid deck metadata (title/language/slideCount).");
  }

  // --- original PDF (the source of truth for the slides) --------------------
  const pdf = entries["original.pdf"];
  if (!pdf || pdf.byteLength === 0) {
    throw new DeckArchiveError("The archive is missing original.pdf.");
  }
  if (!isPdf(pdf)) {
    throw new DeckArchiveError("original.pdf is not a valid PDF file.");
  }

  const deckId = crypto.randomUUID();
  await ensureDeckDirs(deckId);
  await writeFileAtomic(deckPdfPath(deckId), Buffer.from(pdf));

  // The manifest's slide count must match the PDF — a mismatch means a
  // corrupted archive, and slides past the real page count would fail to
  // render mid-deck. Clean up the half-written directory before bailing.
  try {
    const pageCount = await getPdfPageCount(deckPdfPath(deckId));
    if (pageCount !== deck.slideCount) {
      throw new DeckArchiveError(
        `The PDF has ${pageCount} pages but the manifest claims ${deck.slideCount} slides.`,
      );
    }
  } catch (err) {
    if (err instanceof DeckArchiveError) {
      await deleteDeck(deckId).catch(() => {});
    }
    throw err;
  }

  // --- scripts & QnA (parsed, sanitized, re-written canonically) ------------
  for (const name of names) {
    const scriptMatch = SCRIPT_ENTRY.exec(name);
    if (scriptMatch) {
      const slideNumber = Number(scriptMatch[1]);
      if (slideNumber < 1 || slideNumber > deck.slideCount) continue;
      const script = sanitizeScript(parseJson<unknown>(entries[name], name));
      if (script) await writeJson(slideScriptPath(deckId, slideNumber), script);
      continue;
    }
    const qnaMatch = QNA_ENTRY.exec(name);
    if (qnaMatch) {
      const slideNumber = Number(qnaMatch[1]);
      if (slideNumber < 1 || slideNumber > deck.slideCount) continue;
      const list = sanitizeQna(parseJson<unknown>(entries[name], name));
      if (list.length > 0) await writeJson(slideQnaPath(deckId, slideNumber), list);
      continue;
    }
    // Anything else — unknown entries, or future media this version doesn't
    // use — is ignored rather than rejected, so old clients can read newer
    // exports.
  }

  const meta: DeckMeta = {
    id: deckId,
    title: deck.title.trim() || "Imported lecture",
    slideCount: deck.slideCount,
    language: deck.language,
    createdAt: typeof deck.createdAt === "string" && deck.createdAt ? deck.createdAt : new Date().toISOString(),
  };
  await saveDeckMeta(meta);
  await addDeckToIndex(meta);
  return meta;
}

function jsonBytes(value: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(value, null, 2));
}

async function writeJson(p: string, data: unknown): Promise<void> {
  await writeFileAtomic(p, JSON.stringify(data, null, 2));
}

function parseJson<T>(bytes: Uint8Array | undefined, label: string): T {
  if (!bytes) throw new DeckArchiveError(`The archive is missing ${label}.`);
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  } catch {
    throw new DeckArchiveError(`${label} is not valid JSON.`);
  }
}

function isPdf(bytes: Uint8Array): boolean {
  // "%PDF-" magic.
  return (
    bytes.byteLength > 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

/** Keeps only well-formed scripts; drops anything unrecognizable. */
function sanitizeScript(raw: unknown): SlideScript | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.text !== "string" || obj.text.length === 0) return null;

  const script: SlideScript = {
    text: obj.text,
    generatedAt: typeof obj.generatedAt === "string" ? obj.generatedAt : new Date().toISOString(),
  };

  if (Array.isArray(obj.captions)) {
    const captions = obj.captions.filter(isWordTiming);
    if (captions.length > 0) script.captions = captions;
  }
  return script;
}

function isWordTiming(raw: unknown): raw is WordTiming {
  if (!raw || typeof raw !== "object") return false;
  const cue = raw as Record<string, unknown>;
  return (
    typeof cue.text === "string" &&
    typeof cue.start === "number" &&
    Number.isFinite(cue.start) &&
    typeof cue.duration === "number" &&
    Number.isFinite(cue.duration)
  );
}

/** Keeps only well-formed Q&A entries; drops anything unrecognizable. */
function sanitizeQna(raw: unknown): QnaEntry[] {
  if (!Array.isArray(raw)) return [];
  const result: QnaEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    if (typeof entry.id !== "string" || !QNA_ID.test(entry.id)) continue;
    if (typeof entry.question !== "string" || typeof entry.answer !== "string") continue;
    result.push({
      id: entry.id,
      question: entry.question,
      answer: entry.answer,
      askedAt: typeof entry.askedAt === "string" ? entry.askedAt : new Date().toISOString(),
    });
  }
  return result;
}

/**
 * Turns a deck title into a safe download name: strips path separators and
 * other characters the OSes dislike, collapses whitespace, caps the length.
 */
function archiveBaseName(title: string): string {
  // Filter by code point instead of a regex literal so no raw control bytes
  // end up in this source file (they make grep & co. treat it as binary).
  const cleaned = Array.from(title)
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      return code >= 32 && code !== 127 && !'\\/:*?"<>|'.includes(ch);
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
    .replace(/[.\s]+$/, "");
  return cleaned || "lecture-export";
}
