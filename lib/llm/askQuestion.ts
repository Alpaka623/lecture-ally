import { chatCompletionStream, getLlmConfig, LANGUAGE_LINE } from "./client";
import type { Language } from "@/lib/data/deckStore";

export interface AskQuestionOptions {
  imagePng: Buffer;
  slideNumber: number;
  slideCount: number;
  slideScript: string;
  question: string;
  language: Language;
  request?: Request;
}

// Yields the professor's answer as text deltas so the ask route can forward
// each token to the chat UI while accumulating the full text for TTS and
// persistence. chatCompletionStream is a regular async function (not an async
// generator), so a missing API key or an immediate endpoint failure still
// surfaces as a regular JSON error before any stream bytes go out.
export async function streamAnswer(opts: AskQuestionOptions): Promise<AsyncGenerator<string>> {
  const languageLine = LANGUAGE_LINE[opts.language];
  const cfg = getLlmConfig(opts.request);

  return chatCompletionStream(
    cfg,
    {
      system: `You are the same warm, engaging university professor who just narrated this slide. A student is now asking a follow-up question. ${languageLine} Answer conversationally and briefly, staying consistent with what you already said. No markdown.`,
      text: `This is slide ${opts.slideNumber} of ${opts.slideCount}. What you already narrated for this slide: "${opts.slideScript}"\n\nStudent's question: ${opts.question}`,
      imagePng: opts.imagePng,
    },
    { maxTokens: 400 },
  );
}
