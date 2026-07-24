import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Impressum – LectureAlly",
};

const contactLink =
  "text-accent underline decoration-accent/40 underline-offset-4 transition-colors hover:decoration-accent";

function LangTag({ lang }: { lang: "DE" | "EN" }) {
  return <span className="label-mono mb-2 block text-[10px] text-text-faint">{lang}</span>;
}

function Section({
  index,
  titleDe,
  titleEn,
  delay,
  de,
  en,
}: {
  index: string;
  titleDe: string;
  titleEn: string;
  delay: string;
  de: React.ReactNode;
  en: React.ReactNode;
}) {
  return (
    <section
      className="rise-in rounded border border-border bg-panel p-5 transition-colors hover:border-border-strong sm:p-6"
      style={{ animationDelay: delay }}
    >
      <h2 className="label-mono text-xs text-text-muted">
        <span className="text-accent">{index}</span> · {titleDe}
      </h2>
      <p className="label-mono mt-1 text-xs text-text-faint">{titleEn}</p>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <div className="text-sm leading-relaxed text-text sm:text-base">
          <LangTag lang="DE" />
          {de}
        </div>
        <div className="border-t border-border pt-5 text-sm leading-relaxed text-text-muted sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
          <LangTag lang="EN" />
          {en}
        </div>
      </div>
    </section>
  );
}

const address = (
  <>
    <p className="font-medium">lecture-ally.com – Niklas Goltz</p>
    <p className="mt-2">
      c/o Online-Impressum #7453
      <br />
      Europaring 90
      <br />
      53757 Sankt Augustin
    </p>
  </>
);

const mailLink = (
  <a href="mailto:info@lecture-ally.com" className={contactLink}>
    info@lecture-ally.com
  </a>
);

const externalContactLink = (
  <a
    href="https://mein.online-impressum.de/lecture-ally-com/"
    target="_blank"
    rel="noopener noreferrer"
    className={`group inline-flex items-center gap-1 ${contactLink}`}
  >
    mein.online-impressum.de/lecture-ally-com
    <span
      aria-hidden
      className="inline-block transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
    >
      ↗
    </span>
  </a>
);

export default function ImpressumPage() {
  return (
    <>
      <header className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
        <Logo />
        <Link
          href="/"
          className="label-mono group inline-flex items-center gap-1 text-xs text-text-muted transition-colors hover:text-text"
        >
          <span
            aria-hidden
            className="transition-transform duration-200 group-hover:-translate-x-0.5"
          >
            ←
          </span>
          Home
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-10 sm:gap-5 sm:px-6 sm:py-16">
        <div className="rise-in mb-4 sm:mb-6">
          <p className="label-mono text-xs text-accent">Rechtliches · Legal</p>
          <h1 className="mt-2 font-display text-4xl leading-[0.95] tracking-tight text-text sm:text-6xl">
            Impressum
            <span className="block text-text-faint">Legal Notice</span>
          </h1>
          <p className="label-mono mt-4 text-xs leading-relaxed text-text-faint">
            Die deutsche Fassung ist verbindlich · The German version is legally binding
          </p>
        </div>

        <Section
          index="01"
          titleDe="Angaben gemäß § 5 DDG"
          titleEn="Information pursuant to § 5 DDG"
          delay="80ms"
          de={address}
          en={address}
        />

        <Section
          index="02"
          titleDe="Kontakt"
          titleEn="Contact"
          delay="160ms"
          de={
            <>
              <p>
                <span className="label-mono mr-3 text-xs text-text-faint">E-Mail</span>
                {mailLink}
              </p>
              <p className="mt-3">
                <span className="label-mono mr-3 text-xs text-text-faint">Zweiter Kontaktweg</span>
                {externalContactLink}
              </p>
            </>
          }
          en={
            <>
              <p>
                <span className="label-mono mr-3 text-xs text-text-faint">Email</span>
                {mailLink}
              </p>
              <p className="mt-3">
                <span className="label-mono mr-3 text-xs text-text-faint">
                  Second contact channel
                </span>
                {externalContactLink}
              </p>
            </>
          }
        />

        <Section
          index="03"
          titleDe="Zuständige Regulierungs- und Aufsichtsbehörde"
          titleEn="Competent regulatory and supervisory authority"
          delay="240ms"
          de={
            <>
              <p>Landesanstalt für Medien Nordrhein-Westfalen</p>
              <p className="mt-1">Sitz: Deutschland</p>
            </>
          }
          en={
            <>
              <p>
                Landesanstalt für Medien Nordrhein-Westfalen (Media Authority of North
                Rhine-Westphalia)
              </p>
              <p className="mt-1">Seat: Germany</p>
            </>
          }
        />

        <Section
          index="04"
          titleDe="Streitbeilegung"
          titleEn="Dispute resolution"
          delay="320ms"
          de={
            <p>
              Nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
              Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          }
          en={
            <p>
              We are neither willing nor obliged to participate in dispute resolution proceedings
              before a consumer arbitration board.
            </p>
          }
        />
      </main>

      <Footer />
    </>
  );
}
