import { notFound } from "next/navigation";
import Link from "next/link";
import { getDeckMeta, LANGUAGE_NAMES } from "@/lib/data/deckStore";
import { LectureViewer } from "@/components/LectureViewer";
import { Logo } from "@/components/Logo";
import { ApiSettingsDialog } from "@/components/ApiSettingsDialog";

export default async function DeckPage({
  params,
}: {
  params: Promise<{ deckId: string }>;
}) {
  const { deckId } = await params;
  const deck = await getDeckMeta(deckId);

  if (!deck) {
    notFound();
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <Logo />
          <span className="label-mono hidden text-xs text-text-muted sm:inline">
            {LANGUAGE_NAMES[deck.language]}
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <span className="label-mono max-w-[8.5rem] truncate text-xs text-text-muted sm:max-w-[220px]">
            {deck.title}
          </span>
          <ApiSettingsDialog />
          <Link
            href="/"
            className="label-mono shrink-0 text-xs text-text-muted hover:text-text"
            aria-label="Exit lecture"
          >
            ✕<span className="ml-1 hidden sm:inline">Exit</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-[1800px] flex-1 flex-col px-4 py-4 sm:px-6">
        <LectureViewer deckId={deck.id} slideCount={deck.slideCount} />
      </main>
    </div>
  );
}
