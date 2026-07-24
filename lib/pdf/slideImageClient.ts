// Client-side "get or render" for a slide's PNG: serves the render cache in
// IndexedDB and only rasterizes the page (from the cached source PDF) on a
// miss. Shared by the slide display and the LLM vision call, so both use the
// exact same image and a render is paid for at most once per slide.

import { getPdfBlob, getSlideImageBlob, saveSlideImage } from "@/lib/data/deckDb";
import { renderSlidePng } from "./clientRender";

// Dedupes concurrent renders of the same slide (display request racing the
// vision call, or a fast Next/Prev), mirroring the old server-side guard.
const inFlight = new Map<string, Promise<Blob>>();

export async function getOrRenderSlideImage(deckId: string, slideNumber: number): Promise<Blob> {
  const key = `${deckId}/${slideNumber}`;
  const existing = inFlight.get(key);
  if (existing) return existing;

  const task = (async () => {
    const cached = await getSlideImageBlob(deckId, slideNumber);
    if (cached) return cached;

    const pdf = await getPdfBlob(deckId);
    if (!pdf) throw new Error("This lecture is no longer in the browser cache.");

    const { png } = await renderSlidePng(pdf, slideNumber);
    await saveSlideImage(deckId, slideNumber, png);
    return png;
  })();

  inFlight.set(key, task);
  try {
    return await task;
  } finally {
    inFlight.delete(key);
  }
}
