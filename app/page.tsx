import { listDecks } from "@/lib/data/deckStore";
import { UploadForm } from "@/components/UploadForm";
import { DeckList } from "@/components/DeckList";
import { Logo } from "@/components/Logo";
import { ApiSettingsDialog } from "@/components/ApiSettingsDialog";
import { ApiKeyBanner } from "@/components/ApiKeyBanner";

export default async function Home() {
  const decks = await listDecks();

  return (
    <>
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <Logo />
        <ApiSettingsDialog />
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-12 px-6 py-16">
        <div className="flex flex-col items-center gap-6 text-center">
          <h1 className="font-display text-6xl leading-[0.95] tracking-tight sm:text-8xl">
            Lecture<span className="text-accent">Ally</span>
          </h1>
          <p className="max-w-md text-balance text-sm text-text-muted sm:text-base">
            Upload your lecture slides — your AI professor explains them, answers questions, and
            guides you through the material.
          </p>
        </div>

        <ApiKeyBanner />

        <UploadForm />

        {decks.length > 0 && (
          <div className="flex w-full flex-col gap-3">
            <h2 className="label-mono text-xs text-text-muted">Your Lectures</h2>
            <DeckList decks={decks} />
          </div>
        )}
      </main>
    </>
  );
}
