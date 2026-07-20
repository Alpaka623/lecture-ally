import { NextResponse } from "next/server";
import { getDeckMeta } from "@/lib/data/deckStore";
import { getOrRenderSlideImage } from "@/lib/pdf/slideImage";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ deckId: string; n: string }> },
) {
  const { deckId, n } = await params;
  const slideNumber = Number(n);

  const meta = await getDeckMeta(deckId);
  if (!meta) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }
  if (!Number.isInteger(slideNumber) || slideNumber < 1 || slideNumber > meta.slideCount) {
    return NextResponse.json({ error: "Invalid slide number" }, { status: 400 });
  }

  const png = await getOrRenderSlideImage(deckId, slideNumber);
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
