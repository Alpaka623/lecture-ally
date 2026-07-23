import { NextResponse } from "next/server";
import {
  getDeckMeta,
  getSlideScript,
  saveSlideAudio,
  saveSlideScript,
  slideAudioExists,
} from "@/lib/data/deckStore";
import { getOrRenderSlideImage } from "@/lib/pdf/slideImage";
import { explainSlide } from "@/lib/llm/explainSlide";
import { coalesceExplanation } from "@/lib/llm/explainInflight";
import { MissingApiKeyError } from "@/lib/llm/client";
import { MISSING_API_KEY_CODE } from "@/lib/llmSettings";
import { synthesizeSpeech, voiceForLanguage } from "@/lib/tts/synthesize";
import { slideAudioUrl } from "@/lib/http/slideUrls";

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
    // The player prefetches the next slide's explanation while the current
    // one plays; coalescing makes a real request that arrives while that
    // prefetch is still generating share its run instead of paying for (and
    // racing the cache writes of) a second LLM + TTS round trip.
    const prepared = await coalesceExplanation(deckId, slideNumber, async () => {
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
      // no LLM) so old decks get karaoke captions too. Audio and captions
      // always come from the same synthesis run, so they can't drift apart.
      if (!audioAlreadyExists || !script.captions?.length) {
        const { audio, captions } = await synthesizeSpeech(script.text, voiceForLanguage(meta.language));
        await saveSlideAudio(deckId, slideNumber, audio);
        script = { ...script, captions };
        await saveSlideScript(deckId, slideNumber, script);
      }

      return {
        script: script.text,
        audioUrl: slideAudioUrl(deckId, slideNumber),
        captions: script.captions ?? [],
      };
    });

    return NextResponse.json(prepared);
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
