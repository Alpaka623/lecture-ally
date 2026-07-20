import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import {
  isLanguage,
  jaCueAudioExists,
  jaCueAudioPath,
  saveJaCueAudio,
  type Language,
} from "@/lib/data/deckStore";
import { synthesizeSpeech, voiceForLanguage } from "@/lib/tts/synthesize";

export const runtime = "nodejs";

const PHRASE: Record<Language, string> = {
  en: "Yes?",
  de: "Ja?",
  fr: "Oui ?",
  es: "¿Sí?",
  it: "Sì?",
};

export async function GET(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get("lang");
  const language: Language = isLanguage(lang) ? lang : "en";

  if (!(await jaCueAudioExists(language))) {
    const { audio } = await synthesizeSpeech(PHRASE[language], voiceForLanguage(language));
    await saveJaCueAudio(language, audio);
  }

  const audio = await readFile(jaCueAudioPath(language));
  return new NextResponse(new Uint8Array(audio), {
    headers: {
      "Content-Type": "audio/webm",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
