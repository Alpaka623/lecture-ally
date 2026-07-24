// Server-side LLM config for the stateless /api/llm relay. Reads the
// per-request provider config the browser sends as headers (key, base URL,
// model) — there is deliberately NO .env fallback, so nothing on the server
// ever reaches for an environment key. The prompt-building and chat calls now
// live client-side in lib/llm/clientChat.ts.

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
