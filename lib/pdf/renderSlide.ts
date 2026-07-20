import { readFile } from "node:fs/promises";
import path from "node:path";
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

export async function renderSlidePng(pdfPath: string, pageNumber: number, scale = 1.75): Promise<Buffer> {
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
