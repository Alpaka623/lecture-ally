import { NextResponse } from "next/server";
import { buildDeckArchive } from "@/lib/data/deckArchive";
import { getDeckMeta, isValidDeckId } from "@/lib/data/deckStore";

export const runtime = "nodejs";

// Streams the deck as a .lecture archive (a plain ZIP: manifest + PDF +
// narration scripts + Q&A histories). The client triggers the download with
// a plain anchor to this route.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ deckId: string }> },
) {
  const { deckId } = await params;
  if (!isValidDeckId(deckId)) {
    return NextResponse.json({ error: "Invalid deck id" }, { status: 400 });
  }
  const meta = await getDeckMeta(deckId);
  if (!meta) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }

  const { bytes, fileName } = await buildDeckArchive(meta);

  // ASCII fallback + RFC 5987 name so non-ASCII titles survive the download.
  const asciiFallback = fileName.replace(/[^\x20-\x7e]/g, "-");
  // Buffer.from: fflate returns Uint8Array<ArrayBufferLike>, which TS 5.9
  // refuses as a Response body; Buffer (Uint8Array<ArrayBuffer>) is accepted.
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "no-store",
    },
  });
}
