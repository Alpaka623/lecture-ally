// Client-side .lecture export/import. The fs-free counterpart of the old
// server deckArchive.ts: same ZIP format, same validation and sanitizers, but
// it reads/writes the IndexedDB cache (deckDb) and counts PDF pages in the
// browser (clientRender) instead of touching the filesystem.
//
// A deck archive carries everything expensive or impossible to regenerate —
// the source PDF, the narration scripts, the Q&A history — and leaves out what
// the app rebuilds for free on demand: slide images (rendered from the PDF)
// and audio (TTS via the key-less relay).

import { unzipSync, zipSync, type Zippable } from "fflate";
import {
  getPdfBlob,
  getSlideQna,
  getSlideScript,
  putDeck,
  saveSlideQna,
  saveSlideScript,
} from "./deckDb";
import { getPdfPageCount } from "@/lib/pdf/clientRender";
import { isLanguage, type DeckMeta, type Language, type QnaEntry, type SlideScript, type WordTiming } from "./types";

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
  includes: {
    narrationAudio: boolean;
    slideImages: boolean;
    qnaAudio: boolean;
  };
}

export interface DeckArchive {
  blob: Blob;
  fileName: string;
}

export class DeckArchiveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeckArchiveError";
  }
}

/** Packs the active deck (from IndexedDB) into an importable .lecture Blob. */
export async function buildDeckArchive(meta: DeckMeta): Promise<DeckArchive> {
  const pdf = await getPdfBlob(meta.id);
  if (!pdf) {
    throw new DeckArchiveError("This lecture is no longer in the browser cache.");
  }

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
    "original.pdf": [new Uint8Array(await pdf.arrayBuffer()), { level: 0 }],
  };

  for (let slideNumber = 1; slideNumber <= meta.slideCount; slideNumber++) {
    const script = await getSlideScript(meta.id, slideNumber);
    if (script) {
      entries[`scripts/slide-${slideNumber}.json`] = [jsonBytes(script), { level: 0 }];
    }
    const qna = await getSlideQna(meta.id, slideNumber);
    if (qna.length > 0) {
      entries[`qna/slide-${slideNumber}.json`] = [jsonBytes(qna), { level: 0 }];
    }
  }

  const bytes = zipSync(entries);
  return {
    blob: new Blob([bytes], { type: "application/zip" }),
    fileName: `${archiveBaseName(meta.title)}${DECK_ARCHIVE_EXTENSION}`,
  };
}

/** Triggers a browser download of an archive Blob under its file name. */
export function downloadDeckArchive(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke a beat later so the download has started in every browser.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Generous bounds. The uncompressed total is only knowable after unzipSync
// buffers everything, so the archive-size cap on the file is the real
// zip-bomb guard; the rest is belt and braces.
const MAX_ARCHIVE_BYTES = 512 * 1024 * 1024;
const MAX_UNCOMPRESSED_BYTES = 1024 * 1024 * 1024;
const MAX_ENTRIES = 10_000;
const MAX_SLIDE_COUNT = 10_000;

const SCRIPT_ENTRY = /^scripts\/slide-(\d+)\.json$/;
const QNA_ENTRY = /^qna\/slide-(\d+)\.json$/;
// QnA ids become IndexedDB keys later, so keep them boring.
const QNA_ID = /^[A-Za-z0-9-]{1,64}$/;

/**
 * Validates a .lecture archive and materializes it as the single active deck
 * (fresh id, clearing any previous deck) in IndexedDB. Throws DeckArchiveError
 * with a user-facing message on any validation problem. Everything is
 * validated BEFORE anything is written, so a bad archive leaves the current
 * deck untouched.
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

  // The manifest's slide count must match the PDF — a mismatch means a
  // corrupted archive, and slides past the real page count would fail to
  // render mid-deck. Checked before writing anything.
  const pageCount = await getPdfPageCount(pdf);
  if (pageCount !== deck.slideCount) {
    throw new DeckArchiveError(
      `The PDF has ${pageCount} pages but the manifest claims ${deck.slideCount} slides.`,
    );
  }

  // --- collect scripts & QnA (parsed + sanitized) ---------------------------
  const scripts: Array<{ slideNumber: number; script: SlideScript }> = [];
  const qnas: Array<{ slideNumber: number; list: QnaEntry[] }> = [];
  for (const name of names) {
    const scriptMatch = SCRIPT_ENTRY.exec(name);
    if (scriptMatch) {
      const slideNumber = Number(scriptMatch[1]);
      if (slideNumber < 1 || slideNumber > deck.slideCount) continue;
      const script = sanitizeScript(parseJson<unknown>(entries[name], name));
      if (script) scripts.push({ slideNumber, script });
      continue;
    }
    const qnaMatch = QNA_ENTRY.exec(name);
    if (qnaMatch) {
      const slideNumber = Number(qnaMatch[1]);
      if (slideNumber < 1 || slideNumber > deck.slideCount) continue;
      const list = sanitizeQna(parseJson<unknown>(entries[name], name));
      if (list.length > 0) qnas.push({ slideNumber, list });
      continue;
    }
    // Unknown entries (or future media this version doesn't use) are ignored
    // rather than rejected, so old clients can read newer exports.
  }

  // --- write to the cache (replaces any previous deck) ----------------------
  const meta: DeckMeta = {
    id: crypto.randomUUID(),
    title: deck.title.trim() || "Imported lecture",
    slideCount: deck.slideCount,
    language: deck.language,
    createdAt: typeof deck.createdAt === "string" && deck.createdAt ? deck.createdAt : new Date().toISOString(),
  };
  await putDeck(meta, new Blob([pdf.slice()], { type: "application/pdf" }));
  for (const { slideNumber, script } of scripts) {
    await saveSlideScript(meta.id, slideNumber, script);
  }
  for (const { slideNumber, list } of qnas) {
    await saveSlideQna(meta.id, slideNumber, list);
  }
  return meta;
}

function jsonBytes(value: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(value, null, 2));
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
