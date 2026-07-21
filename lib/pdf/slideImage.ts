import { readFile } from "node:fs/promises";
import { deckPdfPath, fileExists, slideImagePath, writeFileAtomic } from "@/lib/data/deckStore";
import { renderSlidePng } from "./renderSlide";

// Dedupes concurrent renders of the same slide (e.g. the <img> request racing
// a neighbour-prefetch, or a dev-mode double-invoke): without this, two
// requests can both see the file missing and both render+rename into it,
// which on Windows can EPERM when one rename lands while the other's read
// handle is still open.
const inFlight = new Map<string, Promise<Buffer>>();

export async function getOrRenderSlideImage(deckId: string, slideNumber: number): Promise<Buffer> {
  const imgPath = slideImagePath(deckId, slideNumber);
  const existing = inFlight.get(imgPath);
  if (existing) return existing;

  const task = (async () => {
    if (!(await fileExists(imgPath))) {
      const png = await renderSlidePng(deckPdfPath(deckId), slideNumber);
      await writeFileAtomic(imgPath, png);
    }
    return readFile(imgPath);
  })();

  inFlight.set(imgPath, task);
  try {
    return await task;
  } finally {
    inFlight.delete(imgPath);
  }
}
