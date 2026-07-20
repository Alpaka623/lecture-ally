import { readFile } from "node:fs/promises";
import { deckPdfPath, fileExists, slideImagePath, writeFileAtomic } from "@/lib/data/deckStore";
import { renderSlidePng } from "./renderSlide";

export async function getOrRenderSlideImage(deckId: string, slideNumber: number): Promise<Buffer> {
  const imgPath = slideImagePath(deckId, slideNumber);
  if (!(await fileExists(imgPath))) {
    const png = await renderSlidePng(deckPdfPath(deckId), slideNumber);
    await writeFileAtomic(imgPath, png);
  }
  return readFile(imgPath);
}
