// Per-browser Gemini credentials. The app ships with NO built-in key: users
// enter their own API key (and optionally a base URL) on the website, it is
// kept in localStorage, and sent to the API routes as request headers. The
// server never reads an .env key and never persists what it receives.

export const GEMINI_API_KEY_HEADER = "x-gemini-api-key";
export const GEMINI_BASE_URL_HEADER = "x-gemini-base-url";

// Error code returned by the API routes when no key was sent along, so the
// UI can show a "add your key" prompt instead of a generic failure.
export const MISSING_API_KEY_CODE = "MISSING_API_KEY";

// Fired on `window` whenever the stored settings change (save or clear), with
// `detail.hasKey` — components use it to re-render indicators, hide banners
// and retry failed generations.
export const GEMINI_SETTINGS_CHANGED_EVENT = "la-gemini-settings-changed";
// Fired to request opening the settings dialog (from error overlays, banners).
export const OPEN_SETTINGS_EVENT = "la-open-settings";

const STORAGE_KEY = "la-gemini-settings";

export interface GeminiSettings {
  apiKey: string;
  baseUrl: string;
}

export const EMPTY_GEMINI_SETTINGS: GeminiSettings = { apiKey: "", baseUrl: "" };

export function loadGeminiSettings(): GeminiSettings {
  if (typeof window === "undefined") return EMPTY_GEMINI_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_GEMINI_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<GeminiSettings>;
    return {
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey.trim() : "",
      baseUrl: typeof parsed.baseUrl === "string" ? parsed.baseUrl.trim() : "",
    };
  } catch {
    /* corrupt or unavailable storage — treat as unconfigured */
    return EMPTY_GEMINI_SETTINGS;
  }
}

function notifySettingsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(GEMINI_SETTINGS_CHANGED_EVENT, {
      detail: { hasKey: hasCustomGeminiSettings() },
    }),
  );
}

export function saveGeminiSettings(settings: GeminiSettings): void {
  if (typeof window === "undefined") return;
  const apiKey = settings.apiKey.trim();
  const baseUrl = settings.baseUrl.trim();
  try {
    if (!apiKey) {
      // A base URL alone is useless without a key — treat empty key as clear.
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ apiKey, baseUrl }));
    }
  } catch {
    /* ignore unavailable storage */
  }
  notifySettingsChanged();
}

export function clearGeminiSettings(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore unavailable storage */
  }
  notifySettingsChanged();
}

// useSyncExternalStore subscription for components that derive UI from the
// stored settings: covers cross-tab `storage` events and in-page changes.
export function subscribeToGeminiSettings(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(GEMINI_SETTINGS_CHANGED_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(GEMINI_SETTINGS_CHANGED_EVENT, callback);
  };
}

export function openApiSettings(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_SETTINGS_EVENT));
}

export function hasCustomGeminiSettings(): boolean {
  const { apiKey, baseUrl } = loadGeminiSettings();
  return Boolean(apiKey || baseUrl);
}

// Headers attached to the fetches that trigger Gemini calls; empty values are
// omitted so the server falls back to its .env defaults.
export function geminiAuthHeaders(): Record<string, string> {
  const { apiKey, baseUrl } = loadGeminiSettings();
  const headers: Record<string, string> = {};
  if (apiKey) headers[GEMINI_API_KEY_HEADER] = apiKey;
  if (baseUrl) headers[GEMINI_BASE_URL_HEADER] = baseUrl;
  return headers;
}
