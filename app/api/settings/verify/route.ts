import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Lets the settings dialog prove that the entered provider config actually
// works before the user saves — listing models authenticates without spending
// any generation tokens. The key is used for this one call and then dropped.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";
  const baseUrlRaw = typeof body?.baseUrl === "string" ? body.baseUrl.trim() : "";

  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "Please enter an API key first." },
      { status: 400 },
    );
  }
  if (!baseUrlRaw) {
    return NextResponse.json(
      { ok: false, error: "Please pick a provider (or enter a base URL) first." },
      { status: 400 },
    );
  }

  const baseUrl = baseUrlRaw.replace(/\/+$/, "");

  try {
    const res = await fetch(`${baseUrl}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      throw await httpError(res);
    }

    const data = (await res.json()) as { data?: Array<{ id?: string }> };
    const models = data.data ?? [];

    if (models.length === 0) {
      return NextResponse.json({ ok: false, error: "The endpoint returned no models." });
    }

    // Deliberately NOT matching the entered model against this list: /models
    // is unreliable as a "does this model exist" check — endpoints paginate
    // (Gemini's flash-lite isn't on page one) and some prefix ids with
    // "models/", so a perfectly valid model would produce a false warning.
    // A bad model name surfaces as a clear error on first generation instead.
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : "Connection failed.",
    });
  }
}

// Extracts a human-readable message from a non-2xx response. Providers follow
// the OpenAI shape ({ error: { message } }); we also dig a JSON body out of a
// raw string as a fallback, then fall back to the plain text/status.
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
