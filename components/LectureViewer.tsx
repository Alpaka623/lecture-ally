"use client";

import { useEffect, useRef, useState } from "react";
import { useLecture } from "@/hooks/useLecture";
import { GEMINI_SETTINGS_CHANGED_EVENT } from "@/lib/geminiSettings";
import { LecturePlayer } from "./LecturePlayer";
import { ChatPanel } from "./ChatPanel";

export function LectureViewer({
  deckId,
  slideCount,
}: {
  deckId: string;
  slideCount: number;
}) {
  const lecture = useLecture(deckId, slideCount);
  const [chatOpen, setChatOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);

  const openChat = () => {
    setChatOpen(true);
    setFocusNonce((n) => n + 1);
  };

  // The slide generation failed because no API key was configured: once the
  // user saves one in the settings dialog, retry automatically — no need to
  // leave the slide and come back.
  const { missingApiKey, retry } = lecture;
  useEffect(() => {
    const onSettingsChanged = (e: Event) => {
      const hasKey = (e as CustomEvent<{ hasKey: boolean }>).detail?.hasKey;
      if (hasKey && missingApiKey) retry();
    };
    window.addEventListener(GEMINI_SETTINGS_CHANGED_EVENT, onSettingsChanged);
    return () => window.removeEventListener(GEMINI_SETTINGS_CHANGED_EVENT, onSettingsChanged);
  }, [missingApiKey, retry]);

  // Focus the ask field once the (mobile) drawer has mounted / full screen has
  // exited. The nested rAF waits one paint so the layout after a full-screen
  // change has settled and the field is focusable.
  useEffect(() => {
    if (focusNonce === 0) return;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => textareaRef.current?.focus());
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [focusNonce]);

  const chatProps = {
    qna: lecture.qnaHistory,
    question,
    setQuestion,
    onSubmit: lecture.submitQuestion,
    narrationState: lecture.narrationState,
    textareaRef,
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 lg:flex-row">
      <LecturePlayer
        deckId={deckId}
        slideNumber={lecture.slideNumber}
        slideCount={slideCount}
        canGoPrev={lecture.canGoPrev}
        canGoNext={lecture.canGoNext}
        goPrev={lecture.goPrev}
        goNext={lecture.goNext}
        narrationState={lecture.narrationState}
        scriptText={lecture.scriptText}
        captions={lecture.captions}
        audioTime={lecture.audioTime}
        audioDuration={lecture.audioDuration}
        volume={lecture.volume}
        missingApiKey={lecture.missingApiKey}
        seekTo={lecture.seekTo}
        setVolume={lecture.setVolume}
        onTogglePlayPause={lecture.togglePlayPause}
        onOpenChat={openChat}
      />

      {/* Desktop live-chat sidebar — always visible, scrolls internally */}
      <aside className="hidden min-h-0 w-[360px] shrink-0 overflow-hidden rounded-xl border border-border bg-panel lg:block">
        <ChatPanel {...chatProps} />
      </aside>

      {/* Mobile drawer — toggled from the player's Ask button */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setChatOpen(false)} />
          <div className="absolute right-0 top-0 flex h-full w-[88%] max-w-[380px] flex-col border-l border-border bg-panel shadow-2xl">
            <ChatPanel {...chatProps} onClose={() => setChatOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
