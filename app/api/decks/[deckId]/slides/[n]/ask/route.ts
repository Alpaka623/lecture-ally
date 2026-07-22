import { NextResponse } from "next/server";
import {
  appendSlideQna,
  getDeckMeta,
  getSlideScript,
  saveQnaAudio,
} from "@/lib/data/deckStore";
import { getOrRenderSlideImage } from "@/lib/pdf/slideImage";
import { askQuestion } from "@/lib/gemini/askQuestion";
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

  const body = await request.json().catch(() => null);
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (!question) {
    return NextResponse.json({ error: "Missing question" }, { status: 400 });
  }

  try {
    const script = await getSlideScript(deckId, slideNumber);
    const imagePng = await getOrRenderSlideImage(deckId, slideNumber);

    const answer = await askQuestion({
      imagePng,
      slideNumber,
      slideCount: meta.slideCount,
      slideScript: script?.text ?? "",
      question,
      language: meta.language,
      request,
    });

    const qnaId = crypto.randomUUID();
    const { audio } = await synthesizeSpeech(answer, voiceForLanguage(meta.language));
    await saveQnaAudio(deckId, slideNumber, qnaId, audio);
    await appendSlideQna(deckId, slideNumber, {
      id: qnaId,
      question,
      answer,
      askedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      qnaId,
      answer,
      audioUrl: `/api/decks/${deckId}/slides/${slideNumber}/qna/${qnaId}/audio`,
    });
  } catch (err) {
    if (err instanceof MissingApiKeyError) {
      return NextResponse.json(
        { error: err.message, code: MISSING_API_KEY_CODE },
        { status: 400 },
      );
    }
    console.error("Failed to answer question", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to answer question" },
      { status: 500 },
    );
  }
}
