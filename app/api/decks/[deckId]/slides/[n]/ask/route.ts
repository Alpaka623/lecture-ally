import { NextResponse } from "next/server";
import {
  appendSlideQna,
  getDeckMeta,
  getSlideScript,
  saveQnaAudio,
} from "@/lib/data/deckStore";
import { getOrRenderSlideImage } from "@/lib/pdf/slideImage";
import { streamAnswer } from "@/lib/gemini/askQuestion";
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

  // Kick off the Gemini stream before opening the response body, so immediate
  // failures (missing API key, rejected request) still produce a regular JSON
  // error instead of a half-open stream.
  let deltas: AsyncGenerator<string>;
  try {
    const script = await getSlideScript(deckId, slideNumber);
    const imagePng = await getOrRenderSlideImage(deckId, slideNumber);

    deltas = await streamAnswer({
      imagePng,
      slideNumber,
      slideCount: meta.slideCount,
      slideScript: script?.text ?? "",
      question,
      language: meta.language,
      request,
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

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // NDJSON, one event per line:
      //   { "type": "delta", "text": "..." }   one token of the answer
      //   { "type": "done", "qnaId", "audioUrl" }  after TTS + persistence
      //   { "type": "error", "error": "..." }   mid-stream failure
      const send = (event: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          // Client hung up; keep going so the Q&A still gets persisted.
        }
      };

      let answer = "";
      try {
        for await (const text of deltas) {
          answer += text;
          send({ type: "delta", text });
        }

        const qnaId = crypto.randomUUID();
        const { audio } = await synthesizeSpeech(answer, voiceForLanguage(meta.language));
        await saveQnaAudio(deckId, slideNumber, qnaId, audio);
        await appendSlideQna(deckId, slideNumber, {
          id: qnaId,
          question,
          answer,
          askedAt: new Date().toISOString(),
        });

        send({
          type: "done",
          qnaId,
          audioUrl: `/api/decks/${deckId}/slides/${slideNumber}/qna/${qnaId}/audio`,
        });
      } catch (err) {
        console.error("Failed to answer question", err);
        send({
          type: "error",
          error: err instanceof Error ? err.message : "Failed to answer question",
        });
      } finally {
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
