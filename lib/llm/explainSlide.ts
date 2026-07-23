import { chatCompletion, getLlmConfig, professorSystemPrompt } from "./client";
import type { Language } from "@/lib/data/deckStore";

export interface ExplainSlideOptions {
  imagePng: Buffer;
  slideNumber: number;
  slideCount: number;
  previousSummary?: string;
  language: Language;
  request?: Request;
}

export async function explainSlide(opts: ExplainSlideOptions): Promise<string> {
  const cfg = getLlmConfig(opts.request);

  return chatCompletion(
    cfg,
    {
      system: professorSystemPrompt(opts.language),
      text: `Slide ${opts.slideNumber} of ${opts.slideCount}.${
        opts.previousSummary ? ` Previous slide covered: ${opts.previousSummary}` : ""
      } Explain this slide to the student.`,
      imagePng: opts.imagePng,
    },
    { maxTokens: 500 },
  );
}
