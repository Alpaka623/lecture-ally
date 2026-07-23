import { readFile } from "node:fs/promises";
import path from "node:path";
import { Worker } from "node:worker_threads";
import { createCanvas } from "@napi-rs/canvas";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

// pdfjs-dist requires this URL to end with "/" and use forward slashes,
// even on Windows — see node_utils' getFactoryUrlProp validation.
const STANDARD_FONT_DATA_URL =
  path.join(process.cwd(), "node_modules/pdfjs-dist/standard_fonts").split(path.sep).join("/") + "/";

export async function getPdfPageCount(pdfPath: string): Promise<number> {
  const data = new Uint8Array(await readFile(pdfPath));
  const loadingTask = pdfjsLib.getDocument({ data, standardFontDataUrl: STANDARD_FONT_DATA_URL });
  const doc = await loadingTask.promise;
  const count = doc.numPages;
  await loadingTask.destroy();
  return count;
}

// In-process renderer: the fallback when the worker is unavailable, and the
// implementation the worker itself mirrors (see pdfWorker.mjs).
async function renderSlidePngInline(pdfPath: string, pageNumber: number, scale: number): Promise<Buffer> {
  const data = new Uint8Array(await readFile(pdfPath));
  const loadingTask = pdfjsLib.getDocument({ data, standardFontDataUrl: STANDARD_FONT_DATA_URL });
  try {
    const doc = await loadingTask.promise;
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext("2d");
    await page.render({ canvasContext: ctx as unknown as CanvasRenderingContext2D, canvas: canvas as unknown as HTMLCanvasElement, viewport }).promise;
    return canvas.toBuffer("image/png");
  } finally {
    await loadingTask.destroy();
  }
}

// --- worker client -----------------------------------------------------
// A slide render costs several hundred milliseconds of CPU (pdfjs rasterize
// + PNG encode). Run on the main thread, that stalls every concurrent
// request — most painfully the slide audio due to start the moment the user
// clicks "next". The worker keeps the main thread responsive throughout.

interface PendingRender {
  resolve: (png: Buffer) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

interface PdfWorkerState {
  worker: Worker;
  nextId: number;
  pending: Map<number, PendingRender>;
}

// Stashed on globalThis so Next's dev-mode hot reloads (which re-instantiate
// this module without restarting the process) reuse the existing worker
// instead of spawning a new one per reload.
const globalForPdf = globalThis as typeof globalThis & { __laPdfWorker?: PdfWorkerState };

const WORKER_TIMEOUT_MS = 60_000;

function getPdfWorkerState(): PdfWorkerState {
  const existing = globalForPdf.__laPdfWorker;
  if (existing) return existing;

  // Spawned by absolute path from the unbundled source file — the bundler
  // never processes pdfWorker.mjs, so its bare imports resolve at runtime.
  const worker = new Worker(path.join(process.cwd(), "lib/pdf/pdfWorker.mjs"));
  const state: PdfWorkerState = { worker, nextId: 1, pending: new Map() };
  globalForPdf.__laPdfWorker = state;

  const failAll = (err: Error) => {
    if (globalForPdf.__laPdfWorker === state) globalForPdf.__laPdfWorker = undefined;
    for (const entry of state.pending.values()) {
      clearTimeout(entry.timer);
      entry.reject(err);
    }
    state.pending.clear();
  };

  worker.on("message", (msg: { id: number; png?: Uint8Array; error?: string }) => {
    const entry = state.pending.get(msg.id);
    if (!entry) return;
    state.pending.delete(msg.id);
    clearTimeout(entry.timer);
    if (msg.png) {
      entry.resolve(Buffer.from(msg.png.buffer, msg.png.byteOffset, msg.png.byteLength));
    } else {
      entry.reject(new Error(msg.error ?? "PDF worker render failed"));
    }
  });
  worker.on("error", failAll);
  worker.on("exit", (code) => failAll(new Error(`PDF worker exited with code ${code}`)));

  return state;
}

function renderViaWorker(pdfPath: string, pageNumber: number, scale: number): Promise<Buffer> {
  const state = getPdfWorkerState();
  const id = state.nextId++;
  return new Promise<Buffer>((resolve, reject) => {
    const timer = setTimeout(() => {
      state.pending.delete(id);
      reject(new Error(`PDF render timed out after ${WORKER_TIMEOUT_MS}ms`));
    }, WORKER_TIMEOUT_MS);
    state.pending.set(id, { resolve, reject, timer });
    state.worker.postMessage({ id, pdfPath, pageNumber, scale });
  });
}

// Renders through the worker; falls back to inline rendering if anything
// about the worker fails (spawn error, crash, timeout), so a worker problem
// degrades to "briefly busy main thread", never to "no slide images".
export async function renderSlidePng(pdfPath: string, pageNumber: number, scale = 1.75): Promise<Buffer> {
  try {
    return await renderViaWorker(pdfPath, pageNumber, scale);
  } catch (err) {
    // Loud on purpose: a silent fallback means every render blocks the main
    // thread again, and the only symptom is "the player feels slow".
    console.warn("[pdf-worker] render failed, falling back to inline:", err instanceof Error ? err.message : err);
    return renderSlidePngInline(pdfPath, pageNumber, scale);
  }
}
