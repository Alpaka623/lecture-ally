import { synthesizeSpeech, voiceForLanguage } from "@/lib/tts/synthesize";
import { isLanguage } from "@/lib/data/types";

export const runtime = "nodejs";

// Stateless text-to-speech relay. msedge-tts is a Node WebSocket client to
// Microsoft's read-aloud service and cannot run in the browser, so the client
// sends the narration text here and receives the audio (base64 WebM) plus the
// word-level timings used for karaoke captions. Nothing is stored; audio is
// cached client-side in IndexedDB instead. base64 (not streaming) because the
// browser plays it from a Blob URL, which never issues HTTP Range requests —
// and injectWebmDuration has already written the length into the header, so
// playback starts with a correct, seekable duration.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    text?: unknown;
    language?: unknown;
  } | null;
  const text = typeof body?.text === "string" ? body.text : "";
  const language = isLanguage(body?.language) ? body.language : null;

  if (!text.trim()) {
    return Response.json({ error: "Missing text" }, { status: 400 });
  }
  if (!language) {
    return Response.json({ error: "Missing or invalid language" }, { status: 400 });
  }

  try {
    const { audio, mimeType, captions } = await synthesizeSpeech(text, voiceForLanguage(language));
    return Response.json({
      mimeType,
      audioBase64: audio.toString("base64"),
      captions,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Speech synthesis failed" },
      { status: 502 },
    );
  }
}
