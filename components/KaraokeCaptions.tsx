"use client";

import { useMemo } from "react";
import type { WordTiming } from "@/lib/data/types";

// Rough line width (in characters) before wrapping to the next caption line —
// keeps lines about as wide as YouTube's auto-captions.
const MAX_LINE_CHARS = 42;

interface CaptionLine {
  /** Index of the first word of this line in the `words` array. */
  start: number;
  /** Index one past the last word of this line. */
  end: number;
}

function buildLines(words: WordTiming[]): CaptionLine[] {
  const lines: CaptionLine[] = [];
  let start = 0;
  let width = 0;
  words.forEach((word, i) => {
    const added = word.text.length + (i === start ? 0 : 1); // +1 for the space
    if (width > 0 && width + added > MAX_LINE_CHARS) {
      lines.push({ start, end: i });
      start = i;
      width = word.text.length;
    } else {
      width += added;
    }
  });
  if (start < words.length) lines.push({ start, end: words.length });
  return lines;
}

/** Index of the last word that has started at `time`, or -1 before the first word. */
function activeWordIndex(words: WordTiming[], time: number): number {
  let lo = 0;
  let hi = words.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (words[mid].start <= time) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

/**
 * YouTube-style karaoke captions: words appear one by one as they are spoken,
 * the current word is highlighted, and the caption advances line by line.
 * Words that haven't been spoken yet keep their space (opacity 0) so the
 * caption box doesn't jump around as the line fills up.
 */
export function KaraokeCaptions({ words, time }: { words: WordTiming[]; time: number }) {
  const lines = useMemo(() => buildLines(words), [words]);

  const activeIndex = activeWordIndex(words, time);
  if (activeIndex < 0 || lines.length === 0) return null;

  // Lines are sorted and disjoint — the active word's line is the last line
  // that starts at or before it.
  let lineIndex = 0;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].start <= activeIndex) lineIndex = i;
    else break;
  }
  const line = lines[lineIndex];

  return (
    <p
      key={lineIndex}
      className="caption-line max-w-3xl rounded-md bg-black/75 px-3 py-1 text-center text-sm leading-snug text-white shadow-lg sm:px-4 sm:py-1.5 sm:text-lg"
    >
      {words.slice(line.start, line.end).map((word, i) => {
        const index = line.start + i;
        const spoken = index < activeIndex;
        const active = index === activeIndex;
        return (
          <span key={index}>
            {i > 0 && " "}
            <span
              className={`transition-[opacity,color] duration-150 ${
                active ? "text-accent" : spoken ? "opacity-100" : "opacity-0"
              }`}
            >
              {word.text}
            </span>
          </span>
        );
      })}
    </p>
  );
}
