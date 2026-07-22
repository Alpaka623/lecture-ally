import { NextResponse } from "next/server";
import { deleteDeck, getDeckMeta, isValidDeckId, listDecks } from "@/lib/data/deckStore";

export const runtime = "nodejs";

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
  return NextResponse.json(meta);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ deckId: string }> },
) {
  const { deckId } = await params;
  if (!isValidDeckId(deckId)) {
    return NextResponse.json({ error: "Invalid deck id" }, { status: 400 });
  }

  // Only 404 if the deck is entirely unknown; a directory that was already
  // removed manually should still let us clean up a stale index entry.
  const meta = await getDeckMeta(deckId);
  const inIndex = (await listDecks()).some((d) => d.id === deckId);
  if (!meta && !inIndex) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }

  await deleteDeck(deckId);
  return new NextResponse(null, { status: 204 });
}
