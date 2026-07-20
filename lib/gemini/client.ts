import { GoogleGenAI } from "@google/genai";
import type { Language } from "@/lib/data/deckStore";

export const genai = new GoogleGenAI({});

export const GEMINI_MODEL = "gemini-3.1-flash-lite";

export const LANGUAGE_LINE: Record<Language, string> = {
  en: "Respond only in English.",
  de: "Antworte ausschliesslich auf Deutsch.",
  fr: "Réponds exclusivement en français.",
  es: "Responde únicamente en español.",
  it: "Rispondi esclusivamente in italiano.",
};

export function professorSystemPrompt(language: Language): string {
  const languageLine = LANGUAGE_LINE[language];

  return `You are a warm, engaging university professor explaining lecture slides out loud to a student.
${languageLine}

Style rules:
- Speak conversationally, as if narrating out loud — not written prose. No markdown, no bullet points, no headings.
- Do not say things like "as you can see" or "as shown in this slide" — the student is looking at the slide already.
- Keep it to roughly 75-220 words (about 30-90 seconds of spoken narration).
- Do not end by asking "any questions?" or similar — that is handled separately by the app.
- If given context about the previous slide, use it only for smooth continuity, not to repeat content.`;
}
