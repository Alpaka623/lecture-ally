"use client";

import { useEffect, useRef, useState } from "react";
import { getOrRenderSlideImage } from "@/lib/pdf/slideImageClient";

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
  const [src, setSrc] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  // Kept in a ref so the img onLoad below never works with a stale closure
  // (the player re-renders often while audio plays).
  const onNaturalSizeRef = useRef(onNaturalSize);
  useEffect(() => {
    onNaturalSizeRef.current = onNaturalSize;
  }, [onNaturalSize]);

  // Reset synchronously during render when the slide changes (React's
  // documented "adjusting state when a prop changes" pattern) — this hides the
  // stale image and shows the placeholder while the next slide renders,
  // without an extra effect-driven render.
  const [renderedSlideNumber, setRenderedSlideNumber] = useState(slideNumber);
  if (slideNumber !== renderedSlideNumber) {
    setRenderedSlideNumber(slideNumber);
    setLoaded(false);
    setSrc(null);
  }

  // Rasterize the slide (or read it from the IndexedDB render cache) and show
  // it via an object URL. The URL is revoked on cleanup so blobs don't leak
  // while navigating between slides.
  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    getOrRenderSlideImage(deckId, slideNumber)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        // A missing deck cache surfaces through the player's error state;
        // here we just leave the placeholder up rather than crash.
        if (!cancelled) setSrc(null);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [deckId, slideNumber]);

  return (
    <>
      {!loaded && (
        <div className="absolute inset-0 flex animate-pulse items-center justify-center">
          <span className="label-mono text-xs text-text-faint">Loading…</span>
        </div>
      )}
      {src && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          key={slideNumber}
          src={src}
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
      )}
    </>
  );
}
