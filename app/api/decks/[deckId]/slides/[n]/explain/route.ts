import { NextResponse } from "next/server";
import {
  getDeckMeta,
  getSlideScript,
  saveSlideAudio,
  saveSlideScript,
  slideAudioExists,
} from "@/lib/data/deckStore";
import { getOrRenderSlideImage } from "@/lib/pdf/slideImage";
import { explainSlide } from "@/lib/gemini/explainSlide";
import { MissingApiKeyError } from "@/lib/gemini/client";
import { MISSING_API_KEY_CODE } from "@/lib/geminiSettings";
import { synthesizeSpeech, voiceForLanguage } from "@/lib/tts/synthesize";

export const runtime = "nodejs";

export async function POST(
  request: Request,
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

  try {
    let script = await getSlideScript(deckId, slideNumber);
    const audioAlreadyExists = await slideAudioExists(deckId, slideNumber);

    if (!script) {
      const imagePng = await getOrRenderSlideImage(deckId, slideNumber);
      const previousScript = slideNumber > 1 ? await getSlideScript(deckId, slideNumber - 1) : null;
      const text = await explainSlide({
        imagePng,
        slideNumber,
        slideCount: meta.slideCount,
        previousSummary: previousScript?.text,
        language: meta.language,
        request,
      });
      script = { text, generatedAt: new Date().toISOString() };
      await saveSlideScript(deckId, slideNumber, script);
    }

    // Captions (word timings) are tied to the audio, so synthesize whenever
    // either is missing. Slides generated before captions existed have both
    // script and audio but no timings — re-synthesize once (cheap TTS call,
    // no Gemini) so old decks get karaoke captions too. Audio and captions
    // always come from the same synthesis run, so they can't drift apart.
    if (!audioAlreadyExists || !script.captions?.length) {
      const { audio, captions } = await synthesizeSpeech(script.text, voiceForLanguage(meta.language));
      await saveSlideAudio(deckId, slideNumber, audio);
      script = { ...script, captions };
      await saveSlideScript(deckId, slideNumber, script);
    }

    return NextResponse.json({
      script: script.text,
      audioUrl: `/api/decks/${deckId}/slides/${slideNumber}/audio`,
      captions: script.captions ?? [],
    });
  } catch (err) {
    if (err instanceof MissingApiKeyError) {
      return NextResponse.json(
        { error: err.message, code: MISSING_API_KEY_CODE },
        { status: 400 },
      );
    }
    console.error("Failed to generate slide explanation", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate explanation" },
      { status: 500 },
    );
  }
}
