// Browser-side LLM client. Builds the professor prompts and the OpenAI chat
// payload here in the browser, then sends it through the stateless /api/llm
// relay (a CORS bridge — see that route). This is the client half of what used
// to live in lib/llm/{client,explainSlide,askQuestion}.ts on the server.

import { llmAuthHeaders, MISSING_API_KEY_CODE } from "@/lib/llmSettings";
import type { Language } from "@/lib/data/types";

export { MISSING_API_KEY_CODE };

/** Error carrying the relay's machine-readable `code` (e.g. MISSING_API_KEY). */
export class LlmError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

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

export interface ChatInput {
  system: string;
  text: string;
  /** Slide image (PNG) for vision models — inlined as a base64 data URI. */
  imagePng?: Blob;
}

export interface ChatOptions {
  maxTokens: number;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read image"));
    reader.readAsDataURL(blob);
  });
}

// OpenAI-compatible chat messages. The slide image (when present) is passed
// inline as a base64 data URI — every provider we target (Gemini's OpenAI
// endpoint, OpenAI, OpenRouter, local vision models) accepts this shape.
async function buildMessages(input: ChatInput): Promise<Array<Record<string, unknown>>> {
  const userContent: Array<Record<string, unknown>> = [{ type: "text", text: input.text }];
  if (input.imagePng) {
    userContent.push({
      type: "image_url",
      image_url: { url: await blobToDataUrl(input.imagePng) },
    });
  }
  return [
    { role: "system", content: input.system },
    { role: "user", content: userContent },
  ];
}

// Turns a non-2xx relay response into an LlmError. The relay forwards the
// provider's body verbatim ({ error: { message } }) and adds its own
// { error, code } for a missing key — dig out a human-readable message either
// way.
async function toError(res: Response): Promise<LlmError> {
  const text = await res.text().catch(() => "");
  let message = "";
  let code: string | undefined;

  try {
    const parsed = JSON.parse(text) as {
      error?: { message?: string; code?: string } | string;
      message?: string;
      code?: string;
    };
    if (typeof parsed.error === "string") {
      message = parsed.error;
    } else if (parsed.error?.message) {
      message = parsed.error.message;
    } else if (parsed.message) {
      message = parsed.message;
    }
    code = parsed.code ?? (typeof parsed.error === "object" ? parsed.error?.code : undefined);
  } catch {
    /* not JSON — fall through to the raw text */
  }

  if (!message) message = text || `Request failed (HTTP ${res.status}).`;
  return new LlmError(message, code);
}

async function postChat(input: ChatInput, opts: ChatOptions, stream: boolean): Promise<Response> {
  const res = await fetch("/api/llm", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...llmAuthHeaders() },
    body: JSON.stringify({
      messages: await buildMessages(input),
      max_tokens: opts.maxTokens,
      stream,
    }),
  });
  if (!res.ok) throw await toError(res);
  return res;
}

// One-shot generation (slide narration). Returns the assistant's text.
export async function chatCompletion(input: ChatInput, opts: ChatOptions): Promise<string> {
  const res = await postChat(input, opts, false);
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}

// Streaming generation (Q&A answers). Yields text deltas from the relayed SSE
// stream. Throws (rather than yielding) on an immediate failure so a missing
// API key or rejected request surfaces before any tokens are shown.
export async function chatCompletionStream(
  input: ChatInput,
  opts: ChatOptions,
): Promise<AsyncGenerator<string>> {
  const res = await postChat(input, opts, true);
  if (!res.body) throw new LlmError("The endpoint returned no response stream.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  return (async function* () {
    let buffer = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice("data:".length).trim();
        if (payload === "[DONE]") return;
        if (!payload) continue;
        try {
          const chunk = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {
          /* skip malformed/keepalive lines (e.g. ": ping" comments) */
        }
      }
    }
  })();
}
