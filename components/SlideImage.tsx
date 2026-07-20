"use client";

import { useState } from "react";

export function SlideImage({ deckId, slideNumber }: { deckId: string; slideNumber: number }) {
  const [loaded, setLoaded] = useState(false);

  // Reset the loaded flag synchronously during render when the slide changes
  // (React's documented "adjusting state when a prop changes" pattern),
  // rather than in an effect.
  const [renderedSlideNumber, setRenderedSlideNumber] = useState(slideNumber);
  if (slideNumber !== renderedSlideNumber) {
    setRenderedSlideNumber(slideNumber);
    setLoaded(false);
  }

  return (
    <div className="relative mx-auto flex max-h-[80vh] w-full items-center justify-center">
      {!loaded && (
        <div className="absolute inset-0 flex animate-pulse items-center justify-center rounded bg-panel-alt">
          <span className="label-mono text-xs text-text-faint">Loading…</span>
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={slideNumber}
        src={`/api/decks/${deckId}/slides/${slideNumber}/image`}
        alt={`Slide ${slideNumber}`}
        onLoad={() => setLoaded(true)}
        className={`mx-auto max-h-[80vh] w-full rounded bg-white object-contain shadow-[0_0_0_1px_rgba(0,0,0,0.05)] transition-opacity duration-150 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
