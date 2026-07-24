import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Nutzungsbedingungen – LectureAlly",
};

// German is the legally binding version; an English summary sits on top for
// non-German readers. Rendered from an HTML string, styled via `.legal-prose`
// in globals.css (shared with the Datenschutz page).
const termsHtml = `
<h2 id="scope">1. Geltungsbereich</h2>
<p>Diese Nutzungsbedingungen regeln die Nutzung des unter <a href="https://lecture-ally.com" target="_blank" rel="noopener noreferrer">lecture-ally.com</a> bereitgestellten Onlineangebots „LectureAlly" (nachfolgend „Dienst"). Anbieter ist Niklas Goltz; die Kontaktangaben finden Sie im <a href="/impressum">Impressum</a>.</p>
<p>Stand: 24. Juli 2026</p>

<h2 id="service">2. Leistungsbeschreibung</h2>
<p>LectureAlly ermöglicht es, hochgeladene Vorlesungsfolien (PDF) im Browser darzustellen, mit Hilfe künstlicher Intelligenz erläutern zu lassen, Fragen dazu zu beantworten und die Erläuterungen als Sprachausgabe wiederzugeben. Die hochgeladenen Dateien und die erzeugten Inhalte werden ausschließlich lokal im Browser des Nutzers gespeichert; eine dauerhafte Speicherung auf dem Server des Anbieters findet nicht statt. Einzelheiten zur Datenverarbeitung enthält die <a href="/datenschutz">Datenschutzerklärung</a>. Der Dienst wird unentgeltlich und ohne Anspruch auf ständige Verfügbarkeit bereitgestellt.</p>

<h2 id="apikey">3. Eigener API-Schlüssel und Kosten</h2>
<p>Für die KI-gestützten Funktionen ist ein eigener Zugang (API-Schlüssel) des Nutzers zu einem von ihm gewählten KI-Anbieter erforderlich. Der Nutzer ist für die Geheimhaltung seines Schlüssels, für die Einhaltung der Nutzungsbedingungen seines KI-Anbieters sowie für sämtliche dort anfallenden Kosten selbst verantwortlich.</p>

<h2 id="obligations">4. Pflichten des Nutzers</h2>
<p>Der Nutzer ist allein dafür verantwortlich, welche Inhalte er hochlädt und verarbeiten lässt. Er sichert zu, dass er über die erforderlichen Rechte an den hochgeladenen Inhalten verfügt und dass deren Nutzung weder Rechte Dritter – insbesondere Urheber-, Persönlichkeits- oder Datenschutzrechte – noch gesetzliche Vorschriften verletzt. Insbesondere dürfen keine rechtswidrigen oder rechtsverletzenden Inhalte und keine personenbezogenen Daten Dritter hochgeladen werden.</p>

<h2 id="indemnity">5. Freistellung</h2>
<p>Der Nutzer stellt den Anbieter von sämtlichen Ansprüchen Dritter frei, die aufgrund einer vom Nutzer zu vertretenden rechtswidrigen Nutzung des Dienstes oder der von ihm hochgeladenen Inhalte gegen den Anbieter geltend gemacht werden, einschließlich angemessener Kosten der Rechtsverteidigung.</p>

<h2 id="ai">6. Künstliche Intelligenz – keine Gewähr für Inhalte</h2>
<p>Die durch künstliche Intelligenz erzeugten Erläuterungen und Antworten können fehlerhaft, unvollständig oder irreführend sein und stellen keine fachliche Beratung dar. Der Nutzer hat die Ergebnisse eigenverantwortlich zu prüfen. Der Anbieter übernimmt keine Gewähr für deren Richtigkeit, Vollständigkeit oder Eignung für einen bestimmten Zweck.</p>

<h2 id="thirdparty">7. Drittanbieter</h2>
<p>Der Dienst leitet Anfragen an den vom Nutzer gewählten KI-Anbieter sowie zur Sprachsynthese an Microsoft weiter. Für deren Leistungen und deren Datenverarbeitung gelten die jeweils eigenen Bedingungen der Anbieter; der Anbieter des Dienstes hat hierauf keinen Einfluss und übernimmt hierfür keine Verantwortung.</p>

<h2 id="availability">8. Verfügbarkeit und Änderungen des Dienstes</h2>
<p>Der Dienst wird „wie besehen" bereitgestellt. Der Anbieter ist berechtigt, den Dienst jederzeit zu ändern, einzuschränken oder einzustellen. Ein Anspruch auf Verfügbarkeit oder auf einen bestimmten Funktionsumfang besteht nicht.</p>

<h2 id="liability">9. Haftung</h2>
<p>Der Anbieter haftet unbeschränkt bei Vorsatz und grober Fahrlässigkeit, bei der schuldhaften Verletzung des Lebens, des Körpers oder der Gesundheit sowie nach den Vorschriften des Produkthaftungsgesetzes. Bei einfacher Fahrlässigkeit haftet der Anbieter nur bei der Verletzung einer wesentlichen Vertragspflicht (einer Pflicht, deren Erfüllung die ordnungsgemäße Nutzung des Dienstes überhaupt erst ermöglicht und auf deren Einhaltung der Nutzer regelmäßig vertrauen darf), und der Höhe nach begrenzt auf den vorhersehbaren, vertragstypischen Schaden. Eine darüber hinausgehende Haftung ist ausgeschlossen. Da der Dienst unentgeltlich bereitgestellt wird, gilt diese Beschränkung, soweit gesetzlich zulässig, entsprechend.</p>

<h2 id="law">10. Anwendbares Recht</h2>
<p>Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts. Zwingende Verbraucherschutzvorschriften des Staates, in dem der Nutzer als Verbraucher seinen gewöhnlichen Aufenthalt hat, bleiben hiervon unberührt.</p>

<h2 id="changes">11. Änderung dieser Nutzungsbedingungen</h2>
<p>Der Anbieter kann diese Nutzungsbedingungen mit Wirkung für die Zukunft anpassen. Maßgeblich ist die jeweils zum Zeitpunkt der Nutzung auf dieser Seite veröffentlichte Fassung.</p>
`;

export default function NutzungsbedingungenPage() {
  return (
    <>
      <header className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
        <Logo />
        <Link
          href="/"
          className="label-mono group inline-flex items-center gap-1 text-xs text-text-muted transition-colors hover:text-text"
        >
          <span aria-hidden className="transition-transform duration-200 group-hover:-translate-x-0.5">
            ←
          </span>
          Home
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10 sm:px-6 sm:py-16">
        <div className="rise-in mb-8 sm:mb-10">
          <p className="label-mono text-xs text-accent">Rechtliches · Legal</p>
          <h1 className="mt-2 font-display text-4xl leading-[0.95] tracking-tight text-text sm:text-6xl">
            Nutzungs&shy;bedingungen
            <span className="block text-text-faint">Terms of Use</span>
          </h1>
          <p className="label-mono mt-4 text-xs leading-relaxed text-text-faint">
            Die deutsche Fassung ist verbindlich · The German version is legally binding
          </p>
        </div>

        {/* English TL;DR; the binding text is the German version below. */}
        <aside className="rise-in mb-10 rounded border border-border bg-panel p-5 text-sm leading-relaxed text-text-muted sm:p-6">
          <p className="label-mono mb-3 text-[10px] text-text-faint">EN · In short</p>
          <ul className="flex list-disc flex-col gap-2 pl-4">
            <li>
              LectureAlly is a free tool. Your uploads and generated content stay in your browser,
              not on our server.
            </li>
            <li>
              You need your own AI-provider API key and pay your own provider costs; keep your key
              secret and follow that provider’s terms.
            </li>
            <li>
              You are solely responsible for what you upload — you must hold the rights to it and
              must not upload illegal, infringing, or third-party personal data.
            </li>
            <li>
              AI-generated narration and answers can be wrong and are not professional advice —
              check them yourself.
            </li>
            <li>
              The service is provided “as is” with no guarantee of availability; liability is
              limited as set out in the binding German text.
            </li>
          </ul>
        </aside>

        <div className="legal-prose rise-in" dangerouslySetInnerHTML={{ __html: termsHtml }} />
      </main>

      <Footer />
    </>
  );
}
