import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import type { Language } from "@/lib/data/deckStore";

export interface TtsResult {
  audio: Buffer;
  mimeType: string;
}

const VOICE_BY_LANGUAGE: Record<Language, string> = {
  en: "en-US-AriaNeural",
  de: "de-DE-KatjaNeural",
  fr: "fr-FR-DeniseNeural",
  es: "es-ES-ElviraNeural",
  it: "it-IT-ElsaNeural",
};

export function voiceForLanguage(language: Language): string {
  return VOICE_BY_LANGUAGE[language];
}

export async function synthesizeSpeech(text: string, voice: string): Promise<TtsResult> {
  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata(voice, OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS);
    const { audioStream } = tts.toStream(text);

    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk as Buffer);
    }

    return { audio: Buffer.concat(chunks), mimeType: "audio/webm" };
  } finally {
    tts.close();
  }
}
