"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function SlideImage({
  deckId,
  slideNumber,
  onNaturalSize,
}: {
  deckId: string;
  slideNumber: number;
  /** Called once the slide image has loaded, with its pixel dimensions — the
      player uses this to size its stage to the slide's aspect ratio on
      phones (where a flex-filling stage would mostly be letterboxing). */
  onNaturalSize?: (width: number, height: number) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const imgNodeRef = useRef<HTMLImageElement | null>(null);
  const loadHandlerRef = useRef<(() => void) | null>(null);
  // Kept in a ref so the mount-time ref callback below never works with a
  // stale closure (the player re-renders often while audio plays).
  const onNaturalSizeRef = useRef(onNaturalSize);
  useEffect(() => {
    onNaturalSizeRef.current = onNaturalSize;
  }, [onNaturalSize]);

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
      onNaturalSizeRef.current?.(node.naturalWidth, node.naturalHeight);
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
        onLoad={(e) => {
          setLoaded(true);
          const img = e.currentTarget;
          if (img.naturalWidth > 0) onNaturalSizeRef.current?.(img.naturalWidth, img.naturalHeight);
        }}
        draggable={false}
        className={`max-h-full max-w-full select-none object-contain shadow-[0_8px_40px_rgba(0,0,0,0.45)] transition-opacity duration-200 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </>
  );
}
