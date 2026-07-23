// Renders slide PNGs off the main thread. Plain .mjs (NOT TypeScript, no
// path aliases) so it can be spawned by absolute path at runtime and the
// bundler never touches it — the route code reaches it via
// `new Worker(path.join(process.cwd(), ...))`.
//
// Why a worker: pdfjs rasterizing plus PNG-encoding a slide takes several
// hundred milliseconds of CPU. On the server's single main thread that
// stalls every other request mid-flight — including the slide audio that
// should start playing the moment the user clicks "next". In a worker the
// main thread stays responsive while renders churn away in the background.
//
// Protocol: parent sends { id, pdfPath, pageNumber, scale }, worker replies
// { id, png } (transferred Uint8Array) or { id, error }. Renders are
// processed in arrival order; concurrent requests queue inside the worker.

import { parentPort } from "node:worker_threads";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

// pdfjs-dist requires this URL to end with "/" and use forward slashes —
// same constraint as the main-thread copy in renderSlide.ts.
const STANDARD_FONT_DATA_URL =
  path.join(process.cwd(), "node_modules/pdfjs-dist/standard_fonts").split(path.sep).join("/") + "/";

if (!parentPort) {
  throw new Error("pdfWorker.mjs must be run as a worker thread");
}

parentPort.on("message", async ({ id, pdfPath, pageNumber, scale }) => {
  try {
    const data = new Uint8Array(await readFile(pdfPath));
    const loadingTask = pdfjsLib.getDocument({ data, standardFontDataUrl: STANDARD_FONT_DATA_URL });
    let png;
    try {
      const doc = await loadingTask.promise;
      const page = await doc.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const canvas = createCanvas(viewport.width, viewport.height);
      const ctx = canvas.getContext("2d");
      await page.render({
        canvasContext: ctx,
        canvas,
        viewport,
      }).promise;
      // Copy into a fresh exact-sized Uint8Array: Node Buffers may sit on a
      // shared pool, and postMessage would transfer the pool's whole
      // ArrayBuffer along with them.
      png = new Uint8Array(canvas.toBuffer("image/png"));
    } finally {
      await loadingTask.destroy();
    }
    parentPort.postMessage({ id, png }, [png.buffer]);
  } catch (err) {
    parentPort.postMessage({ id, error: err instanceof Error ? err.message : String(err) });
  }
});
