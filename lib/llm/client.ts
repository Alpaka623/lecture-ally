import type { Language } from "@/lib/data/deckStore";
import {
  LLM_API_KEY_HEADER,
  LLM_BASE_URL_HEADER,
  LLM_MODEL_HEADER,
} from "@/lib/llmSettings";

export class MissingApiKeyError extends Error {
  constructor() {
    super("No API key configured. Open the API settings (⚙️) and add your key.");
    this.name = "MissingApiKeyError";
  }
}

export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

// Builds a config per request from the key/base URL/model the user entered on
// the website (kept in the browser's localStorage, sent along as request
// headers). There is deliberately NO .env fallback — every value is passed
// explicitly, so nothing on the server ever reaches for an environment key.
export function getLlmConfig(request?: Request): LlmConfig {
  const apiKey = request?.headers.get(LLM_API_KEY_HEADER)?.trim();
  if (!apiKey) {
    throw new MissingApiKeyError();
  }
  const baseUrl = normalizeBaseUrl(request?.headers.get(LLM_BASE_URL_HEADER) ?? "");
  const model = request?.headers.get(LLM_MODEL_HEADER)?.trim() ?? "";
  if (!baseUrl) {
    throw new Error("No base URL configured. Open the API settings (⚙️) and pick a provider.");
  }
  if (!model) {
    throw new Error("No model configured. Open the API settings (⚙️) and set a model.");
  }
  return { baseUrl, apiKey, model };
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
  imagePng?: Buffer;
}

export interface ChatOptions {
  maxTokens: number;
}

// OpenAI-compatible chat messages. The slide image (when present) is passed
// inline as a base64 data URI — every provider we target (Gemini's OpenAI
// endpoint, OpenAI, OpenRouter, local vision models) accepts this shape.
function buildMessages(input: ChatInput): Array<Record<string, unknown>> {
  const userContent: Array<Record<string, unknown>> = [{ type: "text", text: input.text }];
  if (input.imagePng) {
    userContent.push({
      type: "image_url",
      image_url: { url: `data:image/png;base64,${input.imagePng.toString("base64")}` },
    });
  }
  return [
    { role: "system", content: input.system },
    { role: "user", content: userContent },
  ];
}

async function postChat(
  cfg: LlmConfig,
  body: Record<string, unknown>,
): Promise<Response> {
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw await httpError(res);
  }
  return res;
}

// Extracts a human-readable message from a non-2xx response. Providers follow
// the OpenAI shape ({ error: { message } }); we also dig a JSON body out of a
// raw string as a fallback, then the plain text/status.
async function httpError(res: Response): Promise<Error> {
  const text = await res.text().catch(() => "");
  let message = "";

  const dig = (raw: string): string => {
    try {
      const parsed = JSON.parse(raw) as {
        error?: { message?: string };
        message?: string;
      };
      return parsed.error?.message ?? parsed.message ?? "";
    } catch {
      return "";
    }
  };

  message = dig(text);
  if (!message) {
    const jsonStart = text.indexOf("{");
    if (jsonStart >= 0) message = dig(text.slice(jsonStart));
  }
  if (!message) message = text || res.statusText || `Request failed (HTTP ${res.status}).`;
  return new Error(message);
}

// One-shot generation (slide narration). Returns the assistant's text.
export async function chatCompletion(
  cfg: LlmConfig,
  input: ChatInput,
  opts: ChatOptions,
): Promise<string> {
  const res = await postChat(cfg, {
    model: cfg.model,
    messages: buildMessages(input),
    max_tokens: opts.maxTokens,
    stream: false,
  });
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}

// Streaming generation (Q&A answers). Yields text deltas.
//
// Deliberately a regular async function (not an async generator): getLlmConfig
// and the HTTP request run before the generator is returned, so a missing API
// key or an immediate endpoint failure still surfaces as a regular thrown
// error before any stream bytes go out.
export async function chatCompletionStream(
  cfg: LlmConfig,
  input: ChatInput,
  opts: ChatOptions,
): Promise<AsyncGenerator<string>> {
  const res = await postChat(cfg, {
    model: cfg.model,
    messages: buildMessages(input),
    max_tokens: opts.maxTokens,
    stream: true,
  });
  if (!res.body) {
    throw new Error("The endpoint returned no response stream.");
  }

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
