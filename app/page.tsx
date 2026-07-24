import { UploadForm } from "@/components/UploadForm";
import { ResumeDeck } from "@/components/ResumeDeck";
import { Logo } from "@/components/Logo";
import { ApiSettingsDialog } from "@/components/ApiSettingsDialog";
import { ApiKeyBanner } from "@/components/ApiKeyBanner";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <>
      <header className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
        <Logo />
        <ApiSettingsDialog />
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-8 px-4 py-10 sm:gap-12 sm:px-6 sm:py-16">
        <div className="flex flex-col items-center gap-4 text-center sm:gap-6">
          <h1 className="font-display text-5xl leading-[0.95] tracking-tight sm:text-8xl">
            Lecture<span className="text-accent">Ally</span>
          </h1>
          <p className="max-w-md text-balance text-sm text-text-muted sm:text-base">
            Upload your lecture slides — your AI professor explains them, answers questions, and
            guides you through the material.
          </p>
        </div>

        <ApiKeyBanner />

        <UploadForm />

        <div className="flex w-full flex-col gap-3">
          <ResumeDeck />
        </div>
      </main>

      <Footer />
    </>
  );
}
