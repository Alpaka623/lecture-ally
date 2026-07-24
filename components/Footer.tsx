import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative mt-auto">
      <div
        aria-hidden
        className="h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent"
      />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="flex items-center gap-2 text-xs text-text-muted">
          <span aria-hidden className="text-accent">
            🎓
          </span>
          <span className="label-mono">LectureAlly</span>
          <span aria-hidden className="text-text-faint">
            ·
          </span>
          <span>Lectures, narrated by AI.</span>
        </p>
        <nav className="flex items-center gap-4">
          <Link
            href="/datenschutz"
            className="label-mono group inline-flex w-fit items-center gap-1 text-xs text-text-muted transition-colors hover:text-accent"
          >
            Privacy
            <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">
              →
            </span>
          </Link>
          <Link
            href="/nutzungsbedingungen"
            className="label-mono group inline-flex w-fit items-center gap-1 text-xs text-text-muted transition-colors hover:text-accent"
          >
            Terms
            <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">
              →
            </span>
          </Link>
          <Link
            href="/impressum"
            className="label-mono group inline-flex w-fit items-center gap-1 text-xs text-text-muted transition-colors hover:text-accent"
          >
            Impressum
            <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        </nav>
      </div>
    </footer>
  );
}
