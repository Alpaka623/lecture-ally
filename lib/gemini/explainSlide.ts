import { genai, GEMINI_MODEL, professorSystemPrompt } from "./client";
import type { Language } from "@/lib/data/deckStore";

export interface ExplainSlideOptions {
  imagePng: Buffer;
  slideNumber: number;
  slideCount: number;
  previousSummary?: string;
  language: Language;
}

export async function explainSlide(opts: ExplainSlideOptions): Promise<string> {
  const response = await genai.models.generateContent({
    model: GEMINI_MODEL,
    contents: {
      role: "user",
      parts: [
        {
          text: `Slide ${opts.slideNumber} of ${opts.slideCount}.${
            opts.previousSummary ? ` Previous slide covered: ${opts.previousSummary}` : ""
          } Explain this slide to the student.`,
        },
        {
          inlineData: {
            data: opts.imagePng.toString("base64"),
            mimeType: "image/png",
          },
        },
      ],
    },
    config: {
      systemInstruction: professorSystemPrompt(opts.language),
      maxOutputTokens: 500,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  return response.text ?? "";
}
