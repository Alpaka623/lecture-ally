import { getLlmConfig, MissingApiKeyError } from "@/lib/llm/client";
import { MISSING_API_KEY_CODE } from "@/lib/llmSettings";

export const runtime = "nodejs";

// Stateless LLM relay (CORS bridge). Most OpenAI-compatible providers don't
// send CORS headers, so the browser can't call them directly — it sends the
// fully-built chat payload here and we forward it to the user's chosen
// provider with their own key, piping the response straight back. Nothing is
// stored; the key is read from a request header and used for this one call.
export async function POST(request: Request) {
  let cfg;
  try {
    cfg = getLlmConfig(request);
  } catch (err) {
    if (err instanceof MissingApiKeyError) {
      return Response.json(
        { error: err.message, code: MISSING_API_KEY_CODE },
        { status: 400 },
      );
    }
    return Response.json(
      { error: err instanceof Error ? err.message : "Invalid LLM configuration" },
      { status: 400 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | { messages?: unknown; max_tokens?: unknown; stream?: unknown }
    | null;
  if (!body || !Array.isArray(body.messages)) {
    return Response.json({ error: "Missing chat messages" }, { status: 400 });
  }

  // The client builds messages/max_tokens/stream; we inject the configured
  // model so the browser never has to echo it back.
  const payload = { ...body, model: cfg.model };

  try {
    const upstream = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    // Pass the provider's response through verbatim — status and body stream —
    // so stream:true (SSE) and stream:false (JSON) both work unchanged.
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to reach the provider" },
      { status: 502 },
    );
  }
}
