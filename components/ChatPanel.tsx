import { useEffect, useRef, type FormEvent, type KeyboardEvent, type RefObject, type SVGProps } from "react";
import type { NarrationState } from "@/hooks/useLecture";
import type { QnaEntry } from "@/lib/data/deckStore";

function SendIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M4 12h11.2l-4.6-4.6L12 6l7 7-7 7-1.4-1.4 4.6-4.6H4z" />
    </svg>
  );
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1 px-1 py-1" aria-label="The professor is typing">
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-text-muted" style={{ animationDelay: "0ms" }} />
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-text-muted" style={{ animationDelay: "180ms" }} />
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-text-muted" style={{ animationDelay: "360ms" }} />
    </span>
  );
}

export function ChatPanel({
  qna,
  question,
  setQuestion,
  onSubmit,
  narrationState,
  onClose,
  textareaRef,
}: {
  qna: QnaEntry[];
  question: string;
  setQuestion: (value: string) => void;
  onSubmit: (question: string) => void;
  narrationState: NarrationState;
  onClose?: () => void;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
}) {
  const answering = narrationState === "answering";
  const canSend = question.trim().length > 0 && !answering && narrationState !== "loading";
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Keep the latest message / typing indicator in view, like a chat app.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [qna]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || !canSend) return;
    onSubmit(trimmed);
    setQuestion("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          <h2 className="label-mono text-xs text-text">Live Q&amp;A</h2>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="grid h-7 w-7 place-items-center rounded-full text-text-muted transition-colors hover:bg-white/5 hover:text-text"
          >
            ✕
          </button>
        )}
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {qna.length === 0 ? (
          <p className="text-sm leading-relaxed text-text-faint">
            No questions yet. Type below and hit Enter — the professor stops the lecture and
            answers out loud.
          </p>
        ) : (
          qna.map((entry) => (
            <div key={entry.id} className="space-y-1.5">
              <div className="flex items-end justify-end gap-1.5">
                {entry.failed && (
                  <span className="mb-1 text-sm text-red-400" title="Couldn't send — try again">
                    ⚠
                  </span>
                )}
                <div className="w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-accent/15 px-3 py-2 text-sm text-text">
                  {entry.question}
                </div>
              </div>
              {entry.pending ? (
                <div className="mr-auto w-fit rounded-2xl rounded-bl-sm border border-border bg-panel-alt px-3 py-2">
                  <TypingDots />
                </div>
              ) : (
                !entry.failed && (
                  <div className="mr-auto w-fit max-w-[85%] rounded-2xl rounded-bl-sm border border-border bg-panel-alt px-3 py-2 text-sm text-text-muted">
                    {entry.answer}
                  </div>
                )
              )}
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="shrink-0 space-y-2 border-t border-border p-3">
        <div className="flex items-end gap-2 rounded-xl border border-border bg-transparent px-2 py-2 transition-colors focus-within:border-accent/60">
          <textarea
            ref={textareaRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Ask about this slide…"
            className="max-h-32 min-h-6 flex-1 resize-none bg-transparent px-1 py-1 text-sm leading-6 text-text placeholder:text-text-faint focus:outline-none"
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send question"
            title="Send (Enter)"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground shadow-sm transition-all duration-150 hover:brightness-110 active:scale-90 disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:brightness-100"
          >
            <SendIcon className="h-5 w-5 translate-x-px" />
          </button>
        </div>
      </form>
    </div>
  );
}
