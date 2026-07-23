"use client";

import { useEffect, useState } from "react";
import {
  clearLlmSettings,
  DEFAULT_LLM_SETTINGS,
  LLM_PROVIDERS,
  loadLlmSettings,
  OPEN_SETTINGS_EVENT,
  providerById,
  saveLlmSettings,
} from "@/lib/llmSettings";

type TestState =
  | { status: "idle" }
  | { status: "testing" }
  | { status: "ok" }
  | { status: "fail"; error: string };

export function ApiSettingsDialog() {
  const [open, setOpen] = useState(false);
  const [providerId, setProviderId] = useState(DEFAULT_LLM_SETTINGS.providerId);
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [test, setTest] = useState<TestState>({ status: "idle" });

  const provider = providerById(providerId);

  // Other components (player error overlay, home banner) can request opening
  // the dialog by dispatching OPEN_SETTINGS_EVENT.
  useEffect(() => {
    window.addEventListener(OPEN_SETTINGS_EVENT, openDialog);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, openDialog);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function openDialog() {
    const current = loadLlmSettings();
    setProviderId(current.providerId);
    setBaseUrl(current.baseUrl);
    setModel(current.model);
    setApiKey(current.apiKey);
    setShowKey(false);
    setTest({ status: "idle" });
    setOpen(true);
  }

  // Switching provider pre-fills its base URL and default model. The API key
  // is kept — some users reuse one key across compatible endpoints.
  function handleProviderChange(nextId: string) {
    const next = providerById(nextId);
    setProviderId(nextId);
    setBaseUrl(next.baseUrl);
    setModel(next.defaultModel);
    setTest({ status: "idle" });
  }

  function handleSave() {
    saveLlmSettings({ providerId, baseUrl, apiKey, model });
    setOpen(false);
  }

  function handleClear() {
    clearLlmSettings();
    setProviderId(DEFAULT_LLM_SETTINGS.providerId);
    setBaseUrl(providerById(DEFAULT_LLM_SETTINGS.providerId).baseUrl);
    setModel(providerById(DEFAULT_LLM_SETTINGS.providerId).defaultModel);
    setApiKey("");
  }

  // Prove the config works before saving — hits our verify route, which lists
  // models: authenticates without spending generation tokens.
  async function handleTest() {
    if (!apiKey.trim()) {
      setTest({ status: "fail", error: "Enter an API key first." });
      return;
    }
    if (!baseUrl.trim()) {
      setTest({ status: "fail", error: "Pick a provider (or enter a base URL) first." });
      return;
    }
    setTest({ status: "testing" });
    try {
      const res = await fetch("/api/settings/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, baseUrl, model }),
      });
      const data: { ok?: boolean; error?: string } = await res.json().catch(() => ({}));
      if (data.ok) {
        setTest({ status: "ok" });
      } else {
        setTest({ status: "fail", error: data.error ?? "Connection failed." });
      }
    } catch {
      setTest({ status: "fail", error: "Could not reach the app server." });
    }
  }

  const inputClass =
    "w-full rounded border border-border bg-transparent px-3 py-2 font-mono text-sm text-text placeholder:font-sans placeholder:text-text-faint focus:border-border-strong focus:outline-none";

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        title="API settings"
        aria-label="API settings"
        className="rounded p-1 text-base text-text-muted transition-colors hover:text-text"
      >
        <span aria-hidden>⚙️</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-lg border border-border bg-panel p-5 shadow-xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="label-mono text-xs text-text-muted">
                <span className="text-accent">API</span> — Settings
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-xs text-text-muted transition-colors hover:text-text"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span className="label-mono text-xs text-text-muted">Provider</span>
                <select
                  value={providerId}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  className={`${inputClass} appearance-none bg-panel`}
                >
                  {LLM_PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-text-faint">
                  {provider.id === "custom"
                    ? "Any OpenAI-compatible endpoint — e.g. Ollama (http://localhost:11434/v1) or LM Studio (http://localhost:1234/v1)."
                    : "Uses the provider's OpenAI-compatible API. The model below must accept image input."}
                </p>
              </label>

              <label className="flex flex-col gap-2">
                <span className="label-mono text-xs text-text-muted">API Key</span>
                <div className="flex gap-2">
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setTest({ status: "idle" });
                    }}
                    placeholder={provider.keyPlaceholder}
                    autoComplete="off"
                    spellCheck={false}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="shrink-0 rounded border border-border px-2 text-xs text-text-muted transition-colors hover:border-border-strong hover:text-text"
                  >
                    {showKey ? "Hide" : "Show"}
                  </button>
                </div>
                {provider.keyUrl ? (
                  <p className="text-xs text-text-faint">
                    No key yet?{" "}
                    {provider.id === "gemini" ? "Get a free one" : "Get one"} at{" "}
                    <a
                      href={provider.keyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text-muted underline hover:text-text"
                    >
                      {provider.id === "gemini"
                        ? "Google AI Studio"
                        : provider.id === "openai"
                          ? "platform.openai.com"
                          : "openrouter.ai"}
                    </a>
                    .
                  </p>
                ) : (
                  <p className="text-xs text-text-faint">
                    Use the key issued by your endpoint — local servers often accept any value.
                  </p>
                )}
              </label>

              <label className="flex flex-col gap-2">
                <span className="label-mono text-xs text-text-muted">Model</span>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => {
                    setModel(e.target.value);
                    setTest({ status: "idle" });
                  }}
                  placeholder={provider.defaultModel}
                  autoComplete="off"
                  spellCheck={false}
                  className={inputClass}
                />
                <p className="text-xs text-text-faint">
                  Must support image input (vision) — every explanation sends the slide image.
                </p>
              </label>

              <label className="flex flex-col gap-2">
                <span className="label-mono text-xs text-text-muted">Base URL</span>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => {
                    setBaseUrl(e.target.value);
                    setTest({ status: "idle" });
                  }}
                  placeholder="https://…/v1"
                  autoComplete="off"
                  spellCheck={false}
                  className={inputClass}
                />
              </label>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={test.status === "testing"}
                  className="rounded border border-border px-3 py-1.5 text-xs text-text transition-colors hover:border-border-strong disabled:opacity-50"
                >
                  {test.status === "testing" ? "Testing…" : "Test connection"}
                </button>
                {test.status === "ok" && (
                  <span className="text-xs text-emerald-400">✓ Connection works</span>
                )}
                {test.status === "fail" && (
                  <span className="min-w-0 truncate text-xs text-red-400" title={test.error}>
                    ✕ {test.error}
                  </span>
                )}
              </div>

              <div className="rounded border border-border bg-panel-alt/50 px-3 py-2.5">
                <p className="label-mono mb-1.5 text-[10px] text-text-faint">Where your key goes</p>
                <ul className="flex flex-col gap-1 text-xs leading-relaxed text-text-muted">
                  <li>· Stored only in this browser (localStorage) — never on a server.</li>
                  <li>· Used solely to request explanations from your chosen provider.</li>
                  <li>· Clear removes it instantly. You stay in control of your usage.</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-text-muted underline transition-colors hover:text-text"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded bg-accent px-6 py-2 text-sm font-semibold tracking-wide text-accent-foreground transition-opacity hover:opacity-90"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
