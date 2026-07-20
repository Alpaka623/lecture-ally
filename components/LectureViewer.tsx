"use client";

import type { Language } from "@/lib/data/deckStore";
import { useLecture } from "@/hooks/useLecture";
import { SlideImage } from "./SlideImage";
import { CaptionPanel, STATUS_LABEL } from "./CaptionPanel";
import { PlaybackControls } from "./PlaybackControls";
import { AskQuestionPanel } from "./AskQuestionPanel";
import { QnaTranscript } from "./QnaTranscript";

export function LectureViewer({
  deckId,
  slideCount,
  language,
}: {
  deckId: string;
  slideCount: number;
  language: Language;
}) {
  const lecture = useLecture(deckId, slideCount, language);
  const isLoading = lecture.narrationState === "loading";

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-1 flex-col rounded-lg border border-border bg-panel">
        {isLoading && (
          <div className="h-0.5 w-full overflow-hidden bg-border">
            <div className="h-full w-1/3 animate-pulse bg-accent" />
          </div>
        )}

        <div className="flex items-center justify-between border-b border-border px-6 py-3">
          <span className="label-mono flex items-center gap-2 text-xs text-accent">
            {isLoading && (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            )}
            {STATUS_LABEL[lecture.narrationState]}
          </span>
          <span className="label-mono text-xs text-text-muted">
            {String(lecture.slideNumber).padStart(2, "0")} / {String(slideCount).padStart(2, "0")}
          </span>
        </div>

        <CaptionPanel scriptText={lecture.scriptText} narrationState={lecture.narrationState} />

        <div className="relative flex flex-1 items-center justify-center px-10 py-4 sm:px-14">
          <button
            type="button"
            onClick={lecture.goPrev}
            disabled={!lecture.canGoPrev}
            aria-label="Previous slide"
            className="absolute left-2 flex h-9 w-9 items-center justify-center rounded-full text-xl text-text-muted transition-colors hover:text-accent disabled:opacity-20 sm:left-4"
          >
            ‹
          </button>

          <SlideImage deckId={deckId} slideNumber={lecture.slideNumber} />

          {isLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded bg-bg/85 backdrop-blur-sm">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              <p className="label-mono text-xs text-accent">
                The professor is preparing the explanation…
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={lecture.goNext}
            disabled={!lecture.canGoNext}
            aria-label="Next slide"
            className="absolute right-2 flex h-9 w-9 items-center justify-center rounded-full text-xl text-text-muted transition-colors hover:text-accent disabled:opacity-20 sm:right-4"
          >
            ›
          </button>
        </div>
      </div>

      <PlaybackControls
        slideIndex={lecture.slideIndex}
        slideCount={slideCount}
        narrationState={lecture.narrationState}
        onTogglePlayPause={lecture.togglePlayPause}
        onAsk={lecture.openAsk}
      />

      <AskQuestionPanel
        isOpen={lecture.isAskOpen}
        onClose={lecture.closeAsk}
        onSubmit={lecture.submitQuestion}
      />

      <QnaTranscript qna={lecture.qnaHistory} />
    </div>
  );
}
