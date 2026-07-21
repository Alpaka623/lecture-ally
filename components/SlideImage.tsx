"use client";

import { useCallback, useRef, useState } from "react";

export function SlideImage({ deckId, slideNumber }: { deckId: string; slideNumber: number }) {
  const [loaded, setLoaded] = useState(false);
  const imgNodeRef = useRef<HTMLImageElement | null>(null);
  const loadHandlerRef = useRef<(() => void) | null>(null);

  // Reset the loaded flag synchronously during render when the slide changes
  // (React's documented "adjusting state when a prop changes" pattern),
  // rather than in an effect.
  const [renderedSlideNumber, setRenderedSlideNumber] = useState(slideNumber);
  if (slideNumber !== renderedSlideNumber) {
    setRenderedSlideNumber(slideNumber);
    setLoaded(false);
  }

  // A cached image can finish loading before React wires up `onLoad`, leaving
  // the placeholder stuck. The ref callback runs on mount: if the image is
  // already complete we reveal it at once, otherwise we listen for `load`.
  const imgRef = useCallback((node: HTMLImageElement | null) => {
    const prev = imgNodeRef.current;
    if (prev && loadHandlerRef.current) prev.removeEventListener("load", loadHandlerRef.current);
    imgNodeRef.current = node;
    loadHandlerRef.current = null;
    if (!node) return;
    if (node.complete && node.naturalWidth > 0) {
      setLoaded(true);
      return;
    }
    const onLoad = () => setLoaded(true);
    loadHandlerRef.current = onLoad;
    node.addEventListener("load", onLoad);
  }, []);

  return (
    <>
      {!loaded && (
        <div className="absolute inset-0 flex animate-pulse items-center justify-center">
          <span className="label-mono text-xs text-text-faint">Loading…</span>
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        key={slideNumber}
        src={`/api/decks/${deckId}/slides/${slideNumber}/image`}
        alt={`Slide ${slideNumber}`}
        onLoad={() => setLoaded(true)}
        draggable={false}
        className={`max-h-full max-w-full select-none object-contain shadow-[0_8px_40px_rgba(0,0,0,0.45)] transition-opacity duration-200 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </>
  );
}
