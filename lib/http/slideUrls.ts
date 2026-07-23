// URLs the player uses to reach a slide's cached media. Shared between the
// API routes (which emit them) and the client hook (which rebuilds them for
// the "resume after a question" path), so every reference stays in lockstep.

// Bump whenever the bytes served under the audio URL change in a way browsers
// must re-fetch — e.g. the WebM duration-header patch. The audio route answers
// `Cache-Control: public, immutable, max-age=1y`, so already-cached copies
// never revalidate; only a new URL makes every client drop them.
export const SLIDE_AUDIO_URL_VERSION = "2";

export function slideAudioUrl(deckId: string, slideNumber: number): string {
  return `/api/decks/${deckId}/slides/${slideNumber}/audio?v=${SLIDE_AUDIO_URL_VERSION}`;
}
