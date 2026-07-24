// Client-side PDF rendering with pdfjs-dist's browser build. Replaces the
// old server renderer (renderSlide.ts + pdfWorker.mjs + @napi-rs/canvas): the
// PDF never leaves the browser now — we rasterize a page to a <canvas> and
// hand out a PNG blob, used both for display and as the vision image for the
// LLM. The heavy rasterization still runs in pdfjs's own web worker, so the
// main thread only paints the finished page.
//
// pdfjs is imported LAZILY: its modern build references browser globals
// (DOMMatrix) at module evaluation, which would crash the server-side
// prerender of any page that transitively imports this file. The functions
// below only ever run in the browser (upload handler, player effects), so a
// dynamic import keeps pdfjs out of the SSR bundle entirely.

type PdfjsModule = typeof import("pdfjs-dist");

let pdfjsPromise: Promise<PdfjsModule> | null = null;

function loadPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((mod) => {
      // The worker is copied to public/pdfjs (kept in lockstep with the
      // installed pdfjs-dist, which requires an exact worker/API version
      // match). Standard fonts are self-hosted alongside it — keeps rendering
      // of non-embedded base-14 fonts correct without any external request.
      mod.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
      return mod;
    });
  }
  return pdfjsPromise;
}

const STANDARD_FONT_DATA_URL = "/pdfjs/standard_fonts/";

export type PdfSource = Blob | ArrayBuffer | Uint8Array;

async function toUint8(pdf: PdfSource): Promise<Uint8Array> {
  if (pdf instanceof Blob) return new Uint8Array(await pdf.arrayBuffer());
  if (pdf instanceof ArrayBuffer) return new Uint8Array(pdf);
  return pdf;
}

async function loadDocument(pdf: PdfSource) {
  const pdfjsLib = await loadPdfjs();
  const data = await toUint8(pdf);
  return pdfjsLib.getDocument({ data, standardFontDataUrl: STANDARD_FONT_DATA_URL });
}

export async function getPdfPageCount(pdf: PdfSource): Promise<number> {
  const task = await loadDocument(pdf);
  try {
    const doc = await task.promise;
    return doc.numPages;
  } finally {
    await task.destroy();
  }
}

export interface RenderedSlide {
  /** PNG of the rendered page. */
  png: Blob;
  /** Pixel dimensions of the render (the slide's natural size at `scale`). */
  width: number;
  height: number;
}

/**
 * Renders one page to a PNG blob at the given scale. Default scale 1.75
 * matches the old server renderer. The canvas is created in the DOM and
 * discarded after encoding.
 */
export async function renderSlidePng(
  pdf: PdfSource,
  pageNumber: number,
  scale = 1.75,
): Promise<RenderedSlide> {
  const task = await loadDocument(pdf);
  try {
    const doc = await task.promise;
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not create a 2D canvas context.");

    await page.render({ canvas, canvasContext: ctx, viewport }).promise;

    const png = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("PNG encoding failed."))),
        "image/png",
      );
    });

    return { png, width: canvas.width, height: canvas.height };
  } finally {
    await task.destroy();
  }
}
