import { NextRequest, NextResponse } from "next/server";
import { DeckArchiveError, importDeckArchive } from "@/lib/data/deckArchive";

export const runtime = "nodejs";

// Accepts a .lecture export (ZIP) and materializes it as a brand-new deck —
// the counterpart of GET /api/decks/[deckId]/export. Responds with the new
// deckId so the client can navigate straight into the imported lecture.
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing archive file" }, { status: 400 });
  }
  const name = file.name.toLowerCase();
  const looksLikeArchive = name.endsWith(".lecture") || name.endsWith(".zip") || file.type === "application/zip";
  if (!looksLikeArchive) {
    return NextResponse.json(
      { error: "File must be a .lecture export (or .zip)" },
      { status: 400 },
    );
  }

  try {
    const meta = await importDeckArchive(new Uint8Array(await file.arrayBuffer()));
    return NextResponse.json({ deckId: meta.id, slideCount: meta.slideCount });
  } catch (err) {
    if (err instanceof DeckArchiveError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Failed to import deck archive", err);
    return NextResponse.json({ error: "Failed to import the archive" }, { status: 500 });
  }
}
