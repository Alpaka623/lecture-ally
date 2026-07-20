import { genai, GEMINI_MODEL, LANGUAGE_LINE } from "./client";
import type { Language } from "@/lib/data/deckStore";

export interface AskQuestionOptions {
  imagePng: Buffer;
  slideNumber: number;
  slideCount: number;
  slideScript: string;
  question: string;
  language: Language;
}

export async function askQuestion(opts: AskQuestionOptions): Promise<string> {
  const languageLine = LANGUAGE_LINE[opts.language];

  const response = await genai.models.generateContent({
    model: GEMINI_MODEL,
    contents: {
      role: "user",
      parts: [
        {
          text: `This is slide ${opts.slideNumber} of ${opts.slideCount}. What you already narrated for this slide: "${opts.slideScript}"\n\nStudent's question: ${opts.question}`,
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
      systemInstruction: `You are the same warm, engaging university professor who just narrated this slide. A student is now asking a follow-up question. ${languageLine} Answer conversationally and briefly, staying consistent with what you already said. No markdown.`,
      maxOutputTokens: 400,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  return response.text ?? "";
}
