import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import {
  fileExists,
  getSlideScript,
  saveSlideAudio,
  slideAudioPath,
} from "@/lib/data/deckStore";
import { mediaResponse } from "@/lib/http/mediaResponse";
import { injectWebmDuration } from "@/lib/tts/webmDuration";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ deckId: string; n: string }> },
) {
  const { deckId, n } = await params;
  const slideNumber = Number(n);
  const audioPath = slideAudioPath(deckId, slideNumber);

  if (!(await fileExists(audioPath))) {
    return NextResponse.json({ error: "Audio not generated yet" }, { status: 404 });
  }

  let audio: Buffer = await readFile(audioPath);

  // One-time migration for files synthesized before the duration-header
  // patch existed: derive the duration from the caption word timings, serve
  // the patched bytes, and write them back so this runs once per slide.
  // Idempotent (already-patched files pass through untouched), and a failed
  // write-back just retries on the next request.
  const lastWord = (await getSlideScript(deckId, slideNumber))?.captions?.at(-1);
  if (lastWord) {
    const patched = injectWebmDuration(audio, lastWord.start + lastWord.duration);
    if (patched !== audio) {
      audio = patched;
      await saveSlideAudio(deckId, slideNumber, patched).catch(() => {});
    }
  }

  // Fresh ArrayBuffer-backed copy: `audio` may be a Node Buffer (shared pool
  // or concat result), which Next's body typing rejects.
  const served = new Uint8Array(audio.byteLength);
  served.set(audio);
  return mediaResponse(request, served, "audio/webm");
}
