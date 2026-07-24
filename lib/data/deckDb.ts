// Browser-side deck cache backed by IndexedDB (via `idb`).
//
// This replaces the old server-side store: there are no accounts and no
// durable library, so the browser keeps exactly ONE active deck as a cache —
// it survives a reload (and makes revisiting slides free) but is deliberately
// not a library. Uploading or importing a new deck clears the previous one;
// the only way to keep a deck around permanently is the `.lecture` export.
//
// Must only be imported from client code — IndexedDB does not exist on the
// server. Every value that used to live as a file on the server is a Blob or
// a plain JSON record here; consumers turn Blobs into URLs with
// `URL.createObjectURL`.

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { DeckMeta, QnaEntry, SlideScript } from "./types";

const DB_NAME = "lecture-ally";
const DB_VERSION = 1;

/** A stored deck: its metadata plus the source PDF it renders slides from. */
export interface DeckRecord {
  meta: DeckMeta;
  pdf: Blob;
}

interface DeckDbSchema extends DBSchema {
  // Keyed by deckId. One entry per active deck (at most one in practice).
  deck: { key: string; value: DeckRecord };
  // Keyed by `${deckId}/${slideNumber}`.
  scripts: { key: string; value: SlideScript };
  audio: { key: string; value: Blob };
  images: { key: string; value: Blob };
  qna: { key: string; value: QnaEntry[] };
  // Keyed by `${deckId}/${slideNumber}/${qnaId}`.
  qnaAudio: { key: string; value: Blob };
}

let dbPromise: Promise<IDBPDatabase<DeckDbSchema>> | null = null;

function getDb(): Promise<IDBPDatabase<DeckDbSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<DeckDbSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore("deck");
        db.createObjectStore("scripts");
        db.createObjectStore("audio");
        db.createObjectStore("images");
        db.createObjectStore("qna");
        db.createObjectStore("qnaAudio");
      },
    });
  }
  return dbPromise;
}

function slideKey(deckId: string, slideNumber: number): string {
  return `${deckId}/${slideNumber}`;
}

function qnaAudioKey(deckId: string, slideNumber: number, qnaId: string): string {
  return `${deckId}/${slideNumber}/${qnaId}`;
}

// --- deck (meta + source PDF) ------------------------------------------------

/** The single active deck's record, or null when the cache is empty. */
export async function getActiveDeck(): Promise<DeckRecord | null> {
  const db = await getDb();
  const all = await db.getAll("deck");
  return all[0] ?? null;
}

export async function getActiveDeckMeta(): Promise<DeckMeta | null> {
  return (await getActiveDeck())?.meta ?? null;
}

export async function getDeckMeta(deckId: string): Promise<DeckMeta | null> {
  const db = await getDb();
  return (await db.get("deck", deckId))?.meta ?? null;
}

export async function getPdfBlob(deckId: string): Promise<Blob | null> {
  const db = await getDb();
  return (await db.get("deck", deckId))?.pdf ?? null;
}

/**
 * Stores a new deck (meta + PDF) as the single active deck, clearing any
 * previous one first so the cache never grows into a library.
 */
export async function putDeck(meta: DeckMeta, pdf: Blob): Promise<void> {
  const db = await getDb();
  await clearDeck();
  await db.put("deck", { meta, pdf }, meta.id);
}

/** Updates the active deck's metadata, keeping its PDF intact. */
export async function saveDeckMeta(meta: DeckMeta): Promise<void> {
  const db = await getDb();
  const existing = await db.get("deck", meta.id);
  await db.put("deck", { meta, pdf: existing?.pdf ?? new Blob() }, meta.id);
}

/** Empties the whole cache — used before storing a freshly uploaded/imported deck. */
export async function clearDeck(): Promise<void> {
  const db = await getDb();
  await Promise.all([
    db.clear("deck"),
    db.clear("scripts"),
    db.clear("audio"),
    db.clear("images"),
    db.clear("qna"),
    db.clear("qnaAudio"),
  ]);
}

// --- narration scripts -------------------------------------------------------

export async function getSlideScript(
  deckId: string,
  slideNumber: number,
): Promise<SlideScript | null> {
  const db = await getDb();
  return (await db.get("scripts", slideKey(deckId, slideNumber))) ?? null;
}

export async function saveSlideScript(
  deckId: string,
  slideNumber: number,
  script: SlideScript,
): Promise<void> {
  const db = await getDb();
  await db.put("scripts", script, slideKey(deckId, slideNumber));
}

// --- narration audio ---------------------------------------------------------

export async function getSlideAudioBlob(
  deckId: string,
  slideNumber: number,
): Promise<Blob | null> {
  const db = await getDb();
  return (await db.get("audio", slideKey(deckId, slideNumber))) ?? null;
}

export async function saveSlideAudio(
  deckId: string,
  slideNumber: number,
  audio: Blob,
): Promise<void> {
  const db = await getDb();
  await db.put("audio", audio, slideKey(deckId, slideNumber));
}

// --- rendered slide images (render cache) ------------------------------------

export async function getSlideImageBlob(
  deckId: string,
  slideNumber: number,
): Promise<Blob | null> {
  const db = await getDb();
  return (await db.get("images", slideKey(deckId, slideNumber))) ?? null;
}

export async function saveSlideImage(
  deckId: string,
  slideNumber: number,
  image: Blob,
): Promise<void> {
  const db = await getDb();
  await db.put("images", image, slideKey(deckId, slideNumber));
}

// --- Q&A history -------------------------------------------------------------

export async function getSlideQna(deckId: string, slideNumber: number): Promise<QnaEntry[]> {
  const db = await getDb();
  return (await db.get("qna", slideKey(deckId, slideNumber))) ?? [];
}

export async function appendSlideQna(
  deckId: string,
  slideNumber: number,
  entry: QnaEntry,
): Promise<void> {
  const db = await getDb();
  const key = slideKey(deckId, slideNumber);
  const list = (await db.get("qna", key)) ?? [];
  list.push(entry);
  await db.put("qna", list, key);
}

/** Replaces a slide's whole Q&A list — used when importing a .lecture archive. */
export async function saveSlideQna(
  deckId: string,
  slideNumber: number,
  list: QnaEntry[],
): Promise<void> {
  const db = await getDb();
  await db.put("qna", list, slideKey(deckId, slideNumber));
}

// --- Q&A answer audio --------------------------------------------------------

export async function getQnaAudioBlob(
  deckId: string,
  slideNumber: number,
  qnaId: string,
): Promise<Blob | null> {
  const db = await getDb();
  return (await db.get("qnaAudio", qnaAudioKey(deckId, slideNumber, qnaId))) ?? null;
}

export async function saveQnaAudio(
  deckId: string,
  slideNumber: number,
  qnaId: string,
  audio: Blob,
): Promise<void> {
  const db = await getDb();
  await db.put("qnaAudio", audio, qnaAudioKey(deckId, slideNumber, qnaId));
}
