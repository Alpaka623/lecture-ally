// Per-browser LLM credentials. The app ships with NO built-in key: users pick
// a provider, enter their own API key and model on the website, it is kept in
// localStorage, and sent to the API routes as request headers. The server
// never reads an .env key and never persists what it receives.
//
// Any OpenAI-compatible endpoint works — the presets below just pre-fill the
// base URL and a sensible default model; "Custom" accepts anything (Ollama,
// LM Studio, vLLM, …). Google's Gemini API is exposed through its official
// OpenAI-compatible endpoint, so it runs through the same single code path.

export const LLM_API_KEY_HEADER = "x-llm-api-key";
export const LLM_BASE_URL_HEADER = "x-llm-base-url";
export const LLM_MODEL_HEADER = "x-llm-model";

// Error code returned by the API routes when no key was sent along, so the
// UI can show a "add your key" prompt instead of a generic failure.
export const MISSING_API_KEY_CODE = "MISSING_API_KEY";

// Fired on `window` whenever the stored settings change (save or clear), with
// `detail.hasKey` — components use it to re-render indicators, hide banners
// and retry failed generations.
export const LLM_SETTINGS_CHANGED_EVENT = "la-llm-settings-changed";
// Fired to request opening the settings dialog (from error overlays, banners).
export const OPEN_SETTINGS_EVENT = "la-open-settings";

const STORAGE_KEY = "la-llm-settings";
// Previous, Gemini-only storage location — migrated once on first load so
// existing users keep their key.
const LEGACY_STORAGE_KEY = "la-gemini-settings";

export interface LlmProvider {
  id: string;
  label: string;
  // Base URL of the OpenAI-compatible API, WITHOUT the trailing endpoint
  // (the client appends /chat/completions and /models). Empty for "custom".
  baseUrl: string;
  defaultModel: string;
  // Where to obtain a key (shown as a contextual help link). Undefined for
  // custom endpoints.
  keyUrl?: string;
  keyPlaceholder: string;
}

export const LLM_PROVIDERS: LlmProvider[] = [
  {
    id: "gemini",
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-3.1-flash-lite",
    keyUrl: "https://aistudio.google.com/apikey",
    keyPlaceholder: "AIza…",
  },
  {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "",
    keyUrl: "https://platform.openai.com/api-keys",
    keyPlaceholder: "sk-…",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "",
    keyUrl: "https://openrouter.ai/keys",
    keyPlaceholder: "sk-or-…",
  },
  {
    id: "custom",
    label: "Custom (OpenAI-compatible)",
    baseUrl: "",
    defaultModel: "",
    keyPlaceholder: "your API key",
  },
];

const DEFAULT_PROVIDER = LLM_PROVIDERS[0]; // Google Gemini — the free, easy path

export function providerById(id: string): LlmProvider {
  return LLM_PROVIDERS.find((p) => p.id === id) ?? DEFAULT_PROVIDER;
}

export interface LlmSettings {
  providerId: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

export const DEFAULT_LLM_SETTINGS: LlmSettings = {
  providerId: DEFAULT_PROVIDER.id,
  baseUrl: DEFAULT_PROVIDER.baseUrl,
  apiKey: "",
  model: DEFAULT_PROVIDER.defaultModel,
};

// One-time migration from the old Gemini-only storage shape ({apiKey,
// baseUrl}) so users who already added a key don't lose it. Runs lazily on
// first load and replaces the legacy entry with the new one.
function migrateLegacySettings(): LlmSettings | null {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<{ apiKey: string; baseUrl: string }>;
    const apiKey = typeof parsed.apiKey === "string" ? parsed.apiKey.trim() : "";
    const baseUrl = typeof parsed.baseUrl === "string" ? parsed.baseUrl.trim() : "";
    if (!apiKey) {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      return null;
    }
    // A custom base URL means the user pointed at their own endpoint — keep it
    // and treat it as a custom provider; otherwise it was plain Gemini.
    const migrated: LlmSettings = {
      providerId: baseUrl ? "custom" : DEFAULT_PROVIDER.id,
      baseUrl: baseUrl || DEFAULT_PROVIDER.baseUrl,
      apiKey,
      model: DEFAULT_PROVIDER.defaultModel,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return migrated;
  } catch {
    /* corrupt legacy storage — ignore */
    return null;
  }
}

export function loadLlmSettings(): LlmSettings {
  if (typeof window === "undefined") return DEFAULT_LLM_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return migrateLegacySettings() ?? DEFAULT_LLM_SETTINGS;
    }
    const parsed = JSON.parse(raw) as Partial<LlmSettings>;
    return {
      providerId: typeof parsed.providerId === "string" ? parsed.providerId : DEFAULT_PROVIDER.id,
      baseUrl: typeof parsed.baseUrl === "string" ? parsed.baseUrl.trim() : "",
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey.trim() : "",
      model: typeof parsed.model === "string" ? parsed.model.trim() : "",
    };
  } catch {
    /* corrupt or unavailable storage — treat as unconfigured */
    return DEFAULT_LLM_SETTINGS;
  }
}

function notifySettingsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(LLM_SETTINGS_CHANGED_EVENT, {
      detail: { hasKey: hasLlmSettings() },
    }),
  );
}

export function saveLlmSettings(settings: LlmSettings): void {
  if (typeof window === "undefined") return;
  const providerId = settings.providerId || DEFAULT_PROVIDER.id;
  const baseUrl = settings.baseUrl.trim();
  const apiKey = settings.apiKey.trim();
  const model = settings.model.trim();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ providerId, baseUrl, apiKey, model }));
  } catch {
    /* ignore unavailable storage */
  }
  notifySettingsChanged();
}

export function clearLlmSettings(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* ignore unavailable storage */
  }
  notifySettingsChanged();
}

// useSyncExternalStore subscription for components that derive UI from the
// stored settings: covers cross-tab `storage` events and in-page changes.
export function subscribeToLlmSettings(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(LLM_SETTINGS_CHANGED_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(LLM_SETTINGS_CHANGED_EVENT, callback);
  };
}

export function openApiSettings(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_SETTINGS_EVENT));
}

// "Is a usable key configured?" — drives the onboarding banner and the
// player's "add your key" overlay. Provider/model alone don't count.
export function hasLlmSettings(): boolean {
  return Boolean(loadLlmSettings().apiKey);
}

// Headers attached to the fetches that trigger LLM calls; empty values are
// omitted so the server can fail fast with a clear error.
export function llmAuthHeaders(): Record<string, string> {
  const { apiKey, baseUrl, model } = loadLlmSettings();
  const headers: Record<string, string> = {};
  if (apiKey) headers[LLM_API_KEY_HEADER] = apiKey;
  if (baseUrl) headers[LLM_BASE_URL_HEADER] = baseUrl;
  if (model) headers[LLM_MODEL_HEADER] = model;
  return headers;
}
