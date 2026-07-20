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
import { synthesizeSpeech, voiceForLanguage } from "@/lib/tts/synthesize";

export const runtime = "nodejs";

export async function POST(
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

  try {
    let script = await getSlideScript(deckId, slideNumber);
    const audioAlreadyExists = await slideAudioExists(deckId, slideNumber);

    if (!script || !audioAlreadyExists) {
      const imagePng = await getOrRenderSlideImage(deckId, slideNumber);

      if (!script) {
        const previousScript = slideNumber > 1 ? await getSlideScript(deckId, slideNumber - 1) : null;
        const text = await explainSlide({
          imagePng,
          slideNumber,
          slideCount: meta.slideCount,
          previousSummary: previousScript?.text,
          language: meta.language,
        });
        script = { text, generatedAt: new Date().toISOString() };
        await saveSlideScript(deckId, slideNumber, script);
      }

      if (!audioAlreadyExists) {
        const { audio } = await synthesizeSpeech(script.text, voiceForLanguage(meta.language));
        await saveSlideAudio(deckId, slideNumber, audio);
      }
    }

    return NextResponse.json({
      script: script.text,
      audioUrl: `/api/decks/${deckId}/slides/${slideNumber}/audio`,
    });
  } catch (err) {
    console.error("Failed to generate slide explanation", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate explanation" },
      { status: 500 },
    );
  }
}
