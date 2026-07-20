import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { fileExists, qnaAudioPath } from "@/lib/data/deckStore";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ deckId: string; n: string; qnaId: string }> },
) {
  const { deckId, n, qnaId } = await params;
  const slideNumber = Number(n);
  const audioPath = qnaAudioPath(deckId, slideNumber, qnaId);

  if (!(await fileExists(audioPath))) {
    return NextResponse.json({ error: "Audio not found" }, { status: 404 });
  }

  const audio = await readFile(audioPath);
  return new NextResponse(new Uint8Array(audio), {
    headers: {
      "Content-Type": "audio/webm",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
