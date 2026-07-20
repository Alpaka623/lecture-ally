import { NextResponse } from "next/server";
import { getSlideQna } from "@/lib/data/deckStore";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ deckId: string; n: string }> },
) {
  const { deckId, n } = await params;
  const slideNumber = Number(n);
  const qna = await getSlideQna(deckId, slideNumber);
  return NextResponse.json({ qna });
}
