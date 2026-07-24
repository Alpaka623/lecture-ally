import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import type { Language, WordTiming } from "@/lib/data/types";
import { injectWebmDuration } from "./webmDuration";

export interface TtsResult {
  audio: Buffer;
  mimeType: string;
  /**
   * Word-level timings reported by the TTS engine, in audio order. Empty if
   * the service didn't emit boundary metadata (the player then falls back to
   * showing the whole caption at once).
   */
  captions: WordTiming[];
}

// One neural voice per language, all verified against the live voice list of
// Microsoft's read-aloud service (what msedge-tts connects to).
const VOICE_BY_LANGUAGE: Record<Language, string> = {
  en: "en-US-AriaNeural",
  de: "de-DE-KatjaNeural",
  fr: "fr-FR-DeniseNeural",
  es: "es-ES-ElviraNeural",
  it: "it-IT-ElsaNeural",
  ar: "ar-SA-ZariyahNeural",
  ca: "ca-ES-JoanaNeural",
  zh: "zh-CN-XiaoxiaoNeural",
  hr: "hr-HR-GabrijelaNeural",
  cs: "cs-CZ-VlastaNeural",
  da: "da-DK-ChristelNeural",
  nl: "nl-NL-ColetteNeural",
  et: "et-EE-AnuNeural",
  fi: "fi-FI-NooraNeural",
  el: "el-GR-AthinaNeural",
  hi: "hi-IN-SwaraNeural",
  hu: "hu-HU-NoemiNeural",
  id: "id-ID-GadisNeural",
  ja: "ja-JP-NanamiNeural",
  ko: "ko-KR-SunHiNeural",
  nb: "nb-NO-PernilleNeural",
  pl: "pl-PL-ZofiaNeural",
  pt: "pt-BR-FranciscaNeural",
  ro: "ro-RO-AlinaNeural",
  ru: "ru-RU-SvetlanaNeural",
  sk: "sk-SK-ViktoriaNeural",
  sv: "sv-SE-SofieNeural",
  tr: "tr-TR-EmelNeural",
  uk: "uk-UA-PolinaNeural",
  vi: "vi-VN-HoaiMyNeural",
};

export function voiceForLanguage(language: Language): string {
  return VOICE_BY_LANGUAGE[language];
}

// Azure/Edge speech offsets are expressed in 100-nanosecond ticks.
const TICKS_PER_SECOND = 10_000_000;

// Shape of one item in the `audio.metadata` messages emitted when
// wordBoundaryEnabled is set: {"Metadata":[{"Type":"WordBoundary","Data":{...}}]}
interface MetadataMessage {
  Metadata?: Array<{
    Type: string;
    Data?: {
      Offset: number;
      Duration: number;
      text?: { Text?: string };
    };
  }>;
}

export async function synthesizeSpeech(text: string, voice: string): Promise<TtsResult> {
  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata(voice, OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS, {
      wordBoundaryEnabled: true,
    });
    const { audioStream, metadataStream } = tts.toStream(text);

    const chunks: Buffer[] = [];
    const captions: WordTiming[] = [];

    // Boundary events ride a separate stream; each push is one complete JSON
    // message. The service delivers every metadata message before turn.end —
    // which is what ends the audio stream — so all events are collected by the
    // time the audio loop below finishes. Enabling metadata does not change
    // the audio payload itself.
    metadataStream?.on("data", (chunk: Buffer) => {
      try {
        const parsed = JSON.parse(chunk.toString()) as MetadataMessage;
        for (const item of parsed.Metadata ?? []) {
          const data = item.Data;
          if (item.Type !== "WordBoundary" || !data?.text?.Text) continue;
          captions.push({
            start: data.Offset / TICKS_PER_SECOND,
            duration: data.Duration / TICKS_PER_SECOND,
            text: data.text.Text,
          });
        }
      } catch {
        /* ignore malformed metadata — captions are a progressive enhancement */
      }
    });

    for await (const chunk of audioStream) {
      chunks.push(chunk as Buffer);
    }

    // The TTS service omits the WebM duration metadata (browsers then report
    // Infinity, which forces a slow seek-probe before every playback). The
    // word timings end at the last spoken word, which is close enough to
    // write into the header ourselves.
    const lastWord = captions.at(-1);
    let audio: Buffer = Buffer.concat(chunks);
    if (lastWord) {
      audio = injectWebmDuration(audio, lastWord.start + lastWord.duration);
    }

    return { audio, mimeType: "audio/webm", captions };
  } finally {
    tts.close();
  }
}
