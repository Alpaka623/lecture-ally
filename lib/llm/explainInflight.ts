import type { WordTiming } from "@/lib/data/deckStore";

// The result of a fully prepared slide explanation: narration text plus the
// synthesized audio (served from the cache route) and its word timings.
export interface PreparedExplanation {
  script: string;
  audioUrl: string;
  captions: WordTiming[];
}

// In-flight "prepare this slide's explanation" runs, keyed by deck + slide.
// The player speculatively prefetches the next slide's explanation while the
// current one plays; if the user advances before the prefetch settles, the
// navigation's real /explain request must join the running preparation
// instead of starting a second LLM + TTS run (double cost, double rate-
// limit pressure, and two writers racing the same cache files). React Strict
// Mode's dev-only effect double-invoke lands here for the same reason.
const inflight = new Map<string, Promise<PreparedExplanation>>();

// Runs `prepare` unless an identical run is already in flight, in which case
// the caller shares its outcome — success or failure. Entries are dropped the
// moment a run settles, so a failed preparation is never cached: the next
// request retries, and successful runs are served from the on-disk cache by
// `prepare` itself.
export function coalesceExplanation(
  deckId: string,
  slideNumber: number,
  prepare: () => Promise<PreparedExplanation>,
): Promise<PreparedExplanation> {
  const key = `${deckId}:${slideNumber}`;
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = prepare().finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, promise);
  return promise;
}
