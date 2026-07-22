"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  clearGeminiSettings,
  hasCustomGeminiSettings,
  loadGeminiSettings,
  OPEN_SETTINGS_EVENT,
  saveGeminiSettings,
  subscribeToGeminiSettings,
} from "@/lib/geminiSettings";

type TestState = { status: "idle" } | { status: "testing" } | { status: "ok" } | { status: "fail"; error: string };

export function ApiSettingsDialog() {
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [test, setTest] = useState<TestState>({ status: "idle" });

  // The "key configured" indicator is derived from localStorage, so it's read
  // through useSyncExternalStore: SSR uses the false server snapshot (no
  // hydration mismatch), and save/clear notify via the subscription.
  const hasCustom = useSyncExternalStore(
    subscribeToGeminiSettings,
    hasCustomGeminiSettings,
    () => false,
  );

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
    const current = loadGeminiSettings();
    setApiKey(current.apiKey);
    setBaseUrl(current.baseUrl);
    setShowKey(false);
    setTest({ status: "idle" });
    setOpen(true);
  }

  function handleSave() {
    saveGeminiSettings({ apiKey, baseUrl });
    setOpen(false);
  }

  function handleClear() {
    clearGeminiSettings();
    setApiKey("");
    setBaseUrl("");
  }

  // Prove the key (and base URL) work before saving — hits our verify route,
  // which lists models: authenticates without spending generation tokens.
  async function handleTest() {
    if (!apiKey.trim()) {
      setTest({ status: "fail", error: "Enter an API key first." });
      return;
    }
    setTest({ status: "testing" });
    try {
      const res = await fetch("/api/settings/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, baseUrl }),
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
        className="relative rounded p-1 text-base text-text-muted transition-colors hover:text-text"
      >
        <span aria-hidden>⚙️</span>
        {hasCustom && (
          <span
            className="absolute right-0 top-0 h-2 w-2 rounded-full bg-accent"
            title="Using your own API key"
          />
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-border bg-panel p-6 shadow-xl"
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
                <span className="label-mono text-xs text-text-muted">API Key</span>
                <div className="flex gap-2">
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setTest({ status: "idle" });
                    }}
                    placeholder="AIza…"
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
                <p className="text-xs text-text-faint">
                  No key yet? Get a free one at{" "}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-muted underline hover:text-text"
                  >
                    Google AI Studio
                  </a>
                  .
                </p>
              </label>

              <label className="flex flex-col gap-2">
                <span className="label-mono text-xs text-text-muted">Base URL (optional)</span>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => {
                    setBaseUrl(e.target.value);
                    setTest({ status: "idle" });
                  }}
                  placeholder="https://generativelanguage.googleapis.com"
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
                  <li>· Used solely to request explanations from Gemini (or your base URL).</li>
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
