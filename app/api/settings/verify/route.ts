import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

// Lets the settings dialog prove that the entered key (and base URL) actually
// work before the user saves — listing models authenticates without spending
// any generation tokens. The key is used for this one call and then dropped.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";
  const baseUrl = typeof body?.baseUrl === "string" ? body.baseUrl.trim() : "";

  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "Please enter an API key first." },
      { status: 400 },
    );
  }

  try {
    const genai = new GoogleGenAI({
      apiKey,
      httpOptions: baseUrl ? { baseUrl } : undefined,
    });

    const pager = await genai.models.list({ config: { pageSize: 1 } });
    let reachable = false;
    for await (const model of pager) {
      reachable = Boolean(model.name);
      break;
    }

    if (!reachable) {
      return NextResponse.json({ ok: false, error: "The endpoint returned no models." });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: humanizeError(err) });
  }
}

// The SDK surfaces Google's error payload as a raw JSON string — extract the
// readable message (e.g. "API key not valid…") so the dialog can show it.
function humanizeError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  try {
    const jsonStart = raw.indexOf("{");
    if (jsonStart >= 0) {
      const parsed = JSON.parse(raw.slice(jsonStart)) as {
        error?: { message?: string };
      };
      if (parsed.error?.message) return parsed.error.message;
    }
  } catch {
    /* not JSON — fall through to the raw message */
  }
  return raw || "Connection failed.";
}
