// Browser-side TTS client: sends narration text to the stateless /api/tts
// relay and gets back a WebM audio blob plus the word-level timings for
// karaoke captions. The blob is cached in IndexedDB by the caller and played
// from an object URL.

import type { Language, WordTiming } from "@/lib/data/types";

export interface TtsResult {
  audio: Blob;
  captions: WordTiming[];
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

export async function synthesize(text: string, language: Language): Promise<TtsResult> {
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({ error: "Speech synthesis failed" }))) as {
      error?: string;
    };
    throw new Error(body.error ?? "Speech synthesis failed");
  }
  const data = (await res.json()) as {
    mimeType: string;
    audioBase64: string;
    captions?: WordTiming[];
  };
  return {
    audio: base64ToBlob(data.audioBase64, data.mimeType),
    captions: data.captions ?? [],
  };
}
