import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Datenschutzerklärung – LectureAlly",
};

// The German privacy policy is the legally binding version. Its body is the
// text produced by the Datenschutz-Generator (Dr. Schwenke) with three
// app-specific sections woven in — the AI (LLM) relay, the text-to-speech
// relay, and the browser-only storage — which no generator module covers,
// plus small trims for parts that don't apply (no employees, no whistleblower
// system, contact by email only). It is rendered from an HTML string and
// styled via `.legal-prose` in globals.css.
const policyHtml = `
<h2 id="m716">Präambel</h2>
<p>Mit der folgenden Datenschutzerklärung möchten wir Sie darüber aufklären, welche Arten Ihrer personenbezogenen Daten (nachfolgend auch kurz als „Daten" bezeichnet) wir zu welchen Zwecken und in welchem Umfang verarbeiten. Die Datenschutzerklärung gilt für alle von uns durchgeführten Verarbeitungen personenbezogener Daten, sowohl im Rahmen der Erbringung unserer Leistungen als auch insbesondere auf unserer Webseite (nachfolgend zusammenfassend bezeichnet als „Onlineangebot").</p>
<p>Die verwendeten Begriffe sind nicht geschlechtsspezifisch.</p>
<p>Stand: 24. Juli 2026</p>

<h2>Inhaltsübersicht</h2>
<ul class="index">
<li><a class="index-link" href="#m716">Präambel</a></li>
<li><a class="index-link" href="#m3">Verantwortlicher</a></li>
<li><a class="index-link" href="#mOverview">Übersicht der Verarbeitungen</a></li>
<li><a class="index-link" href="#m2427">Maßgebliche Rechtsgrundlagen</a></li>
<li><a class="index-link" href="#m27">Sicherheitsmaßnahmen</a></li>
<li><a class="index-link" href="#m25">Übermittlung von personenbezogenen Daten</a></li>
<li><a class="index-link" href="#m24">Internationale Datentransfers</a></li>
<li><a class="index-link" href="#m12">Allgemeine Informationen zur Datenspeicherung und Löschung</a></li>
<li><a class="index-link" href="#m10">Rechte der betroffenen Personen</a></li>
<li><a class="index-link" href="#m225">Bereitstellung des Onlineangebots und Webhosting</a></li>
<li><a class="index-link" href="#m-ki">KI-Erläuterung der Folien und Beantwortung von Fragen</a></li>
<li><a class="index-link" href="#m-tts">Sprachausgabe (Text-to-Speech)</a></li>
<li><a class="index-link" href="#m-local">Lokale Speicherung im Browser</a></li>
<li><a class="index-link" href="#m182">Kontakt- und Anfrageverwaltung</a></li>
<li><a class="index-link" href="#m15">Änderung und Aktualisierung</a></li>
<li><a class="index-link" href="#m42">Begriffsdefinitionen</a></li>
</ul>

<h2 id="m3">Verantwortlicher</h2>
<p>Niklas Goltz<br>c/o Online-Impressum #7453, Europaring 90<br>53757 Sankt Augustin, Deutschland</p>
<p>E-Mail-Adresse: <a href="mailto:info@lecture-ally.com">info@lecture-ally.com</a></p>
<p>Impressum: <a href="https://lecture-ally.com/impressum" target="_blank" rel="noopener noreferrer">https://lecture-ally.com/impressum</a></p>

<h2 id="mOverview">Übersicht der Verarbeitungen</h2>
<p>Die nachfolgende Übersicht fasst die Arten der verarbeiteten Daten und die Zwecke ihrer Verarbeitung zusammen und verweist auf die betroffenen Personen.</p>
<h3>Arten der verarbeiteten Daten</h3>
<ul><li>Bestandsdaten.</li><li>Kontaktdaten.</li><li>Inhaltsdaten.</li><li>Nutzungsdaten.</li><li>Meta-, Kommunikations- und Verfahrensdaten.</li><li>Protokolldaten.</li></ul>
<h3>Kategorien betroffener Personen</h3>
<ul><li>Kommunikationspartner.</li><li>Nutzer.</li><li>Dritte Personen.</li></ul>
<h3>Zwecke der Verarbeitung</h3>
<ul><li>Kommunikation.</li><li>Sicherheitsmaßnahmen.</li><li>Organisations- und Verwaltungsverfahren.</li><li>Feedback.</li><li>Bereitstellung unseres Onlineangebotes und Nutzerfreundlichkeit.</li><li>Informationstechnische Infrastruktur.</li></ul>

<h2 id="m2427">Maßgebliche Rechtsgrundlagen</h2>
<p><strong>Maßgebliche Rechtsgrundlagen nach der DSGVO: </strong>Im Folgenden erhalten Sie eine Übersicht der Rechtsgrundlagen der DSGVO, auf deren Basis wir personenbezogene Daten verarbeiten. Bitte nehmen Sie zur Kenntnis, dass neben den Regelungen der DSGVO nationale Datenschutzvorgaben in Ihrem bzw. unserem Wohn- oder Sitzland gelten können. Sollten ferner im Einzelfall speziellere Rechtsgrundlagen maßgeblich sein, teilen wir Ihnen diese in der Datenschutzerklärung mit.</p>
<ul><li><strong>Einwilligung (Art. 6 Abs. 1 S. 1 lit. a) DSGVO)</strong> - Die betroffene Person hat ihre Einwilligung in die Verarbeitung der sie betreffenden personenbezogenen Daten für einen spezifischen Zweck oder mehrere bestimmte Zwecke gegeben.</li><li><strong>Berechtigte Interessen (Art. 6 Abs. 1 S. 1 lit. f) DSGVO)</strong> - die Verarbeitung ist zur Wahrung der berechtigten Interessen des Verantwortlichen oder eines Dritten notwendig, vorausgesetzt, dass die Interessen, Grundrechte und Grundfreiheiten der betroffenen Person, die den Schutz personenbezogener Daten verlangen, nicht überwiegen.</li></ul>
<p><strong>Nationale Datenschutzregelungen in Deutschland: </strong>Zusätzlich zu den Datenschutzregelungen der DSGVO gelten nationale Regelungen zum Datenschutz in Deutschland. Hierzu gehört insbesondere das Gesetz zum Schutz vor Missbrauch personenbezogener Daten bei der Datenverarbeitung (Bundesdatenschutzgesetz – BDSG). Das BDSG enthält insbesondere Spezialregelungen zum Recht auf Auskunft, zum Recht auf Löschung, zum Widerspruchsrecht, zur Verarbeitung besonderer Kategorien personenbezogener Daten, zur Verarbeitung für andere Zwecke und zur Übermittlung sowie automatisierten Entscheidungsfindung im Einzelfall einschließlich Profiling. Ferner können Landesdatenschutzgesetze der einzelnen Bundesländer zur Anwendung gelangen.</p>

<h2 id="m27">Sicherheitsmaßnahmen</h2>
<p>Wir treffen nach Maßgabe der gesetzlichen Vorgaben unter Berücksichtigung des Stands der Technik, der Implementierungskosten und der Art, des Umfangs, der Umstände und der Zwecke der Verarbeitung sowie der unterschiedlichen Eintrittswahrscheinlichkeiten und des Ausmaßes der Bedrohung der Rechte und Freiheiten natürlicher Personen geeignete technische und organisatorische Maßnahmen, um ein dem Risiko angemessenes Schutzniveau zu gewährleisten.</p>
<p>Zu den Maßnahmen gehören insbesondere die Sicherung der Vertraulichkeit, Integrität und Verfügbarkeit von Daten durch Kontrolle des physischen und elektronischen Zugangs zu den Daten als auch des sie betreffenden Zugriffs, der Eingabe, der Weitergabe, der Sicherung der Verfügbarkeit und ihrer Trennung. Des Weiteren haben wir Verfahren eingerichtet, die eine Wahrnehmung von Betroffenenrechten, die Löschung von Daten und Reaktionen auf die Gefährdung der Daten gewährleisten. Ferner berücksichtigen wir den Schutz personenbezogener Daten bereits bei der Entwicklung bzw. Auswahl von Hardware, Software sowie Verfahren entsprechend dem Prinzip des Datenschutzes, durch Technikgestaltung und durch datenschutzfreundliche Voreinstellungen.</p>
<p>Sicherung von Online-Verbindungen durch TLS-/SSL-Verschlüsselungstechnologie (HTTPS): Um die Daten der Nutzer, die über unsere Online-Dienste übertragen werden, vor unerlaubten Zugriffen zu schützen, setzen wir auf die TLS-/SSL-Verschlüsselungstechnologie. Secure Sockets Layer (SSL) und Transport Layer Security (TLS) sind die Eckpfeiler der sicheren Datenübertragung im Internet. Diese Technologien verschlüsseln die Informationen, die zwischen der Website oder App und dem Browser des Nutzers (oder zwischen zwei Servern) übertragen werden, wodurch die Daten vor unbefugtem Zugriff geschützt sind. Wenn eine Website durch ein SSL-/TLS-Zertifikat gesichert ist, wird dies durch die Anzeige von HTTPS in der URL signalisiert.</p>

<h2 id="m25">Übermittlung von personenbezogenen Daten</h2>
<p>Im Rahmen unserer Verarbeitung von personenbezogenen Daten kommt es vor, dass diese an andere Stellen, Unternehmen, rechtlich selbstständige Organisationseinheiten oder Personen übermittelt beziehungsweise ihnen gegenüber offengelegt werden. Zu den Empfängern dieser Daten können z. B. mit IT-Aufgaben beauftragte Dienstleister gehören oder Anbieter von Diensten und Inhalten. In solchen Fällen beachten wir die gesetzlichen Vorgaben und schließen insbesondere entsprechende Verträge bzw. Vereinbarungen, die dem Schutz Ihrer Daten dienen, mit den Empfängern Ihrer Daten ab.</p>

<h2 id="m24">Internationale Datentransfers</h2>
<p>Datenverarbeitung in Drittländern: Sofern wir Daten in ein Drittland (d. h. außerhalb der Europäischen Union (EU) oder des Europäischen Wirtschaftsraums (EWR)) übermitteln oder dies im Rahmen der Nutzung von Diensten Dritter oder der Offenlegung bzw. Übermittlung von Daten an andere Personen, Stellen oder Unternehmen geschieht, erfolgt dies stets im Einklang mit den gesetzlichen Vorgaben.</p>
<p>Für Datenübermittlungen in die USA stützen wir uns vorrangig auf das Data Privacy Framework (DPF), welches durch einen Angemessenheitsbeschluss der EU-Kommission vom 10.07.2023 als sicherer Rechtsrahmen anerkannt wurde. Zusätzlich haben wir, soweit erforderlich, mit den jeweiligen Anbietern Standardvertragsklauseln abgeschlossen, die den Vorgaben der EU-Kommission entsprechen und vertragliche Verpflichtungen zum Schutz Ihrer Daten festlegen. Weitere Informationen zum DPF und eine Liste der zertifizierten Unternehmen finden Sie auf der Website des US-Handelsministeriums unter <a href="https://www.dataprivacyframework.gov/" target="_blank" rel="noopener noreferrer">https://www.dataprivacyframework.gov/</a> (in englischer Sprache).</p>
<p>Sofern Sie einen KI-Anbieter mit Sitz in einem Drittland konfigurieren (siehe Abschnitt „KI-Erläuterung der Folien und Beantwortung von Fragen"), erfolgt die dortige Übermittlung auf Ihre Veranlassung hin; für die Verarbeitung gelten die Datenschutzbedingungen und Garantien des jeweils von Ihnen gewählten Anbieters.</p>

<h2 id="m12">Allgemeine Informationen zur Datenspeicherung und Löschung</h2>
<p>Wir löschen personenbezogene Daten, die wir verarbeiten, gemäß den gesetzlichen Bestimmungen, sobald die zugrundeliegenden Einwilligungen widerrufen werden oder keine weiteren rechtlichen Grundlagen für die Verarbeitung bestehen. Dies betrifft Fälle, in denen der ursprüngliche Verarbeitungszweck entfällt oder die Daten nicht mehr benötigt werden. Ausnahmen von dieser Regelung bestehen, wenn gesetzliche Pflichten oder besondere Interessen eine längere Aufbewahrung oder Archivierung der Daten erfordern.</p>
<p>Insbesondere müssen Daten, die aus handels- oder steuerrechtlichen Gründen aufbewahrt werden müssen oder deren Speicherung notwendig ist zur Rechtsverfolgung oder zum Schutz der Rechte anderer natürlicher oder juristischer Personen, entsprechend archiviert werden.</p>
<p>Bei mehreren Angaben zur Aufbewahrungsdauer oder Löschungsfristen eines Datums, ist stets die längste Frist maßgeblich.</p>
<p>Fristbeginn mit Ablauf des Jahres: Beginnt eine Frist nicht ausdrücklich zu einem bestimmten Datum und beträgt sie mindestens ein Jahr, so startet sie automatisch am Ende des Kalenderjahres, in dem das fristauslösende Ereignis eingetreten ist.</p>

<h2 id="m10">Rechte der betroffenen Personen</h2>
<p>Rechte der betroffenen Personen aus der DSGVO: Ihnen stehen als Betroffene nach der DSGVO verschiedene Rechte zu, die sich insbesondere aus Art. 15 bis 21 DSGVO ergeben:</p>
<ul><li><strong>Widerspruchsrecht: Sie haben das Recht, aus Gründen, die sich aus Ihrer besonderen Situation ergeben, jederzeit gegen die Verarbeitung der Sie betreffenden personenbezogenen Daten, die aufgrund von Art. 6 Abs. 1 lit. e oder f DSGVO erfolgt, Widerspruch einzulegen; dies gilt auch für ein auf diese Bestimmungen gestütztes Profiling.</strong></li><li><strong>Widerrufsrecht bei Einwilligungen:</strong> Sie haben das Recht, erteilte Einwilligungen jederzeit zu widerrufen.</li><li><strong>Auskunftsrecht:</strong> Sie haben das Recht, eine Bestätigung darüber zu verlangen, ob betreffende Daten verarbeitet werden und auf Auskunft über diese Daten sowie auf weitere Informationen und Kopie der Daten entsprechend den gesetzlichen Vorgaben.</li><li><strong>Recht auf Berichtigung:</strong> Sie haben entsprechend den gesetzlichen Vorgaben das Recht, die Vervollständigung der Sie betreffenden Daten oder die Berichtigung der Sie betreffenden unrichtigen Daten zu verlangen.</li><li><strong>Recht auf Löschung und Einschränkung der Verarbeitung:</strong> Sie haben nach Maßgabe der gesetzlichen Vorgaben das Recht, zu verlangen, dass Sie betreffende Daten unverzüglich gelöscht werden, bzw. alternativ nach Maßgabe der gesetzlichen Vorgaben eine Einschränkung der Verarbeitung der Daten zu verlangen.</li><li><strong>Recht auf Datenübertragbarkeit:</strong> Sie haben das Recht, Sie betreffende Daten, die Sie uns bereitgestellt haben, nach Maßgabe der gesetzlichen Vorgaben in einem strukturierten, gängigen und maschinenlesbaren Format zu erhalten oder deren Übermittlung an einen anderen Verantwortlichen zu fordern.</li><li><strong>Beschwerde bei Aufsichtsbehörde:</strong> Sie haben unbeschadet eines anderweitigen verwaltungsrechtlichen oder gerichtlichen Rechtsbehelfs das Recht auf Beschwerde bei einer Aufsichtsbehörde, insbesondere in dem Mitgliedstaat ihres gewöhnlichen Aufenthaltsorts, ihres Arbeitsplatzes oder des Orts des mutmaßlichen Verstoßes, wenn Sie der Ansicht sind, dass die Verarbeitung der Sie betreffenden personenbezogenen Daten gegen die Vorgaben der DSGVO verstößt.</li></ul>
<p>Für uns zuständige Aufsichtsbehörde:</p>
<p>Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen (LDI NRW)<br>Kavalleriestraße 2–4<br>40213 Düsseldorf<br>Telefon: 0211/38424-0<br>E-Mail: <a href="mailto:poststelle@ldi.nrw.de">poststelle@ldi.nrw.de</a><br>Web: <a href="https://www.ldi.nrw.de" target="_blank" rel="noopener noreferrer">www.ldi.nrw.de</a></p>

<h2 id="m225">Bereitstellung des Onlineangebots und Webhosting</h2>
<p>Wir verarbeiten die Daten der Nutzer, um ihnen unsere Online-Dienste zur Verfügung stellen zu können. Zu diesem Zweck verarbeiten wir die IP-Adresse des Nutzers, die notwendig ist, um die Inhalte und Funktionen unserer Online-Dienste an den Browser oder das Endgerät der Nutzer zu übermitteln.</p>
<ul class="m-elements"><li><strong>Verarbeitete Datenarten:</strong> Nutzungsdaten (z. B. Seitenaufrufe und Verweildauer, verwendete Gerätetypen und Betriebssysteme); Meta-, Kommunikations- und Verfahrensdaten (z. B. IP-Adressen, Zeitangaben). Protokolldaten (z. B. Logfiles betreffend den Abruf von Daten oder Zugriffszeiten).</li><li><strong>Betroffene Personen:</strong> Nutzer (z. B. Webseitenbesucher, Nutzer von Onlinediensten).</li><li><strong>Zwecke der Verarbeitung und berechtigte Interessen:</strong> Bereitstellung unseres Onlineangebotes und Nutzerfreundlichkeit; Informationstechnische Infrastruktur. Sicherheitsmaßnahmen.</li><li><strong>Rechtsgrundlagen:</strong> Berechtigte Interessen (Art. 6 Abs. 1 S. 1 lit. f) DSGVO).</li></ul>
<p><strong>Weitere Hinweise zu Verarbeitungsprozessen, Verfahren und Diensten:</strong></p>
<ul class="m-elements"><li><strong>Bereitstellung Onlineangebot auf gemietetem Speicherplatz: </strong>Für die Bereitstellung unseres Onlineangebotes nutzen wir Speicherplatz, Rechenkapazität und Software, die wir von einem entsprechenden Serveranbieter mieten. Als Serveranbieter setzen wir Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA, ein. Eine damit verbundene Übermittlung in die USA erfolgt auf Grundlage der im Abschnitt „Internationale Datentransfers" beschriebenen Garantien; <strong>Rechtsgrundlagen:</strong> Berechtigte Interessen (Art. 6 Abs. 1 S. 1 lit. f) DSGVO).</li><li><strong>Erhebung von Zugriffsdaten und Logfiles: </strong>Der Zugriff auf unser Onlineangebot wird in Form von sogenannten „Server-Logfiles" protokolliert. Zu den Serverlogfiles können die Adresse und der Name der abgerufenen Webseiten und Dateien, Datum und Uhrzeit des Abrufs, übertragene Datenmengen, Meldung über erfolgreichen Abruf, Browsertyp nebst Version, das Betriebssystem des Nutzers, Referrer URL und im Regelfall IP-Adressen und der anfragende Provider gehören. Die Serverlogfiles können zu Sicherheitszwecken eingesetzt werden (z. B. zur Vermeidung von Überlastung und Missbrauch) und um die Auslastung und Stabilität der Server sicherzustellen; <strong>Rechtsgrundlagen:</strong> Berechtigte Interessen (Art. 6 Abs. 1 S. 1 lit. f) DSGVO). <strong>Löschung von Daten:</strong> Logfile-Informationen werden für die Dauer von maximal 30 Tagen gespeichert und danach gelöscht oder anonymisiert.</li></ul>

<h2 id="m-ki">KI-Erläuterung der Folien und Beantwortung von Fragen</h2>
<p>Um die von Ihnen hochgeladenen Vorlesungsfolien zu erläutern und Ihre Fragen zu beantworten, wird beim Abspielen einer Folie in Ihrem Browser ein Bild der jeweiligen Folie erzeugt und zusammen mit dem zugehörigen Text bzw. Ihrer Frage an den von Ihnen in den Einstellungen konfigurierten KI-Anbieter (Anbieter eines OpenAI-kompatiblen Sprachmodells) übermittelt. Die Übermittlung läuft technisch über eine zustandslose Schnittstelle unseres Servers, die die Anfrage lediglich weiterleitet (es findet dabei keine Speicherung auf unserem Server statt) und dabei den von Ihnen hinterlegten API-Schlüssel verwendet.</p>
<p>Standardmäßig ist als Anbieter Google (Gemini API, Google Ireland Limited bzw. Google LLC, USA) voreingestellt. Sie können jederzeit einen anderen Anbieter (z. B. OpenAI, OpenRouter oder einen eigenen Endpunkt) wählen. Für die dort stattfindende Verarbeitung gelten ausschließlich die Datenschutzbestimmungen des jeweils von Ihnen gewählten Anbieters; je nach Anbieter kann die Verarbeitung in einem Drittland (z. B. USA) erfolgen.</p>
<ul class="m-elements"><li><strong>Verarbeitete Datenarten:</strong> Inhaltsdaten (Folieninhalte als Bild und Text, Ihre Fragen sowie die generierten Erläuterungen und Antworten); Nutzungsdaten.</li><li><strong>Betroffene Personen:</strong> Nutzer; ggf. dritte Personen (sofern in hochgeladenen Folien enthalten).</li><li><strong>Zwecke der Verarbeitung:</strong> Bereitstellung unseres Onlineangebotes und Nutzerfreundlichkeit.</li><li><strong>Rechtsgrundlagen:</strong> Einwilligung (Art. 6 Abs. 1 S. 1 lit. a) DSGVO) durch aktive Nutzung nach Eingabe des Schlüssels; berechtigte Interessen (Art. 6 Abs. 1 S. 1 lit. f) DSGVO) an einer funktionsfähigen Bereitstellung.</li></ul>
<p><strong>Hinweis:</strong> Bitte laden Sie keine Folien bzw. PDF-Dateien hoch, die personenbezogene Daten Dritter enthalten, da diese Inhalte an den von Ihnen gewählten KI-Anbieter übermittelt werden.</p>

<h2 id="m-tts">Sprachausgabe (Text-to-Speech)</h2>
<p>Zur Vertonung der Erläuterungen und Antworten wird der jeweilige Text an den Vorlese-Dienst von Microsoft (Microsoft Corporation, USA) übermittelt, der daraus eine Audioausgabe erzeugt. Die Übermittlung läuft technisch über eine zustandslose Schnittstelle unseres Servers, die den Text lediglich weiterleitet und die zurückgegebene Audioausgabe nicht speichert. Die erzeugte Audiodatei wird ausschließlich lokal in Ihrem Browser zwischengespeichert. Die Verarbeitung durch Microsoft kann in einem Drittland (USA) erfolgen; es gelten die Datenschutzbestimmungen von Microsoft.</p>
<ul class="m-elements"><li><strong>Verarbeitete Datenarten:</strong> Inhaltsdaten (der zu vertonende Text der Erläuterung bzw. Antwort).</li><li><strong>Betroffene Personen:</strong> Nutzer.</li><li><strong>Zwecke der Verarbeitung:</strong> Bereitstellung unseres Onlineangebotes und Nutzerfreundlichkeit.</li><li><strong>Rechtsgrundlagen:</strong> Einwilligung (Art. 6 Abs. 1 S. 1 lit. a) DSGVO); berechtigte Interessen (Art. 6 Abs. 1 S. 1 lit. f) DSGVO).</li></ul>

<h2 id="m-local">Lokale Speicherung im Browser</h2>
<p>Unser Onlineangebot speichert Daten ausschließlich lokal in Ihrem Browser (mittels der Techniken „localStorage" und „IndexedDB") und überträgt diese nicht an uns. Gespeichert werden: der von Ihnen hinterlegte API-Schlüssel und die Anbieter-Einstellungen, Wiedergabe-Einstellungen (z. B. Lautstärke, Untertitel) sowie ein Zwischenspeicher der aktuell geladenen Vorlesung (hochgeladenes PDF, generierte Erläuterungen, Audiodateien sowie Fragen und Antworten).</p>
<p>Diese Speicherung ist für die von Ihnen ausdrücklich gewünschte Funktion des Onlineangebotes technisch unbedingt erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG) und erfolgt daher ohne gesonderte Einwilligung. Es werden keine Cookies zu Analyse- oder Werbezwecken gesetzt. Sie können die lokal gespeicherten Daten jederzeit selbst löschen, indem Sie eine neue Vorlesung laden oder die Websitedaten in Ihrem Browser leeren.</p>
<ul class="m-elements"><li><strong>Verarbeitete Datenarten:</strong> Bestandsdaten (API-Schlüssel, Einstellungen); Inhaltsdaten (Vorlesungsinhalte).</li><li><strong>Betroffene Personen:</strong> Nutzer.</li><li><strong>Zwecke der Verarbeitung:</strong> Bereitstellung unseres Onlineangebotes und Nutzerfreundlichkeit.</li><li><strong>Rechtsgrundlagen:</strong> Berechtigte Interessen (Art. 6 Abs. 1 S. 1 lit. f) DSGVO).</li></ul>

<h2 id="m182">Kontakt- und Anfrageverwaltung</h2>
<p>Bei der Kontaktaufnahme mit uns (z. B. per E-Mail) werden die Angaben der anfragenden Personen verarbeitet, soweit dies zur Beantwortung der Kontaktanfragen und etwaiger angefragter Maßnahmen erforderlich ist.</p>
<ul class="m-elements"><li><strong>Verarbeitete Datenarten:</strong> Kontaktdaten (z. B. E-Mail-Adressen). Inhaltsdaten (z. B. textliche Nachrichten und Beiträge).</li><li><strong>Betroffene Personen:</strong> Kommunikationspartner.</li><li><strong>Zwecke der Verarbeitung und berechtigte Interessen:</strong> Kommunikation; Organisations- und Verwaltungsverfahren.</li><li><strong>Rechtsgrundlagen:</strong> Berechtigte Interessen (Art. 6 Abs. 1 S. 1 lit. f) DSGVO).</li></ul>

<h2 id="m15">Änderung und Aktualisierung</h2>
<p>Wir bitten Sie, sich regelmäßig über den Inhalt unserer Datenschutzerklärung zu informieren. Wir passen die Datenschutzerklärung an, sobald die Änderungen der von uns durchgeführten Datenverarbeitungen dies erforderlich machen. Wir informieren Sie, sobald durch die Änderungen eine Mitwirkungshandlung Ihrerseits (z. B. Einwilligung) oder eine sonstige individuelle Benachrichtigung erforderlich wird.</p>
<p>Sofern wir in dieser Datenschutzerklärung Adressen und Kontaktinformationen von Unternehmen und Organisationen angeben, bitten wir zu beachten, dass die Adressen sich über die Zeit ändern können und bitten die Angaben vor Kontaktaufnahme zu prüfen.</p>

<h2 id="m42">Begriffsdefinitionen</h2>
<p>In diesem Abschnitt erhalten Sie eine Übersicht über die in dieser Datenschutzerklärung verwendeten Begrifflichkeiten. Soweit die Begrifflichkeiten gesetzlich definiert sind, gelten deren gesetzliche Definitionen. Die nachfolgenden Erläuterungen sollen dagegen vor allem dem Verständnis dienen.</p>
<ul class="glossary"><li><strong>Bestandsdaten:</strong> Bestandsdaten umfassen wesentliche Informationen, die für die Identifikation und Verwaltung von Vertragspartnern, Benutzerkonten, Profilen und ähnlichen Zuordnungen notwendig sind. Diese Daten können u.a. persönliche und demografische Angaben wie Namen, Kontaktinformationen (Adressen, Telefonnummern, E-Mail-Adressen) und spezifische Identifikatoren (Benutzer-IDs) beinhalten.</li><li><strong>Inhaltsdaten:</strong> Inhaltsdaten umfassen Informationen, die im Zuge der Erstellung, Bearbeitung und Veröffentlichung von Inhalten aller Art generiert werden. Diese Kategorie von Daten kann Texte, Bilder, Videos, Audiodateien und andere multimediale Inhalte einschließen.</li><li><strong>Kontaktdaten:</strong> Kontaktdaten sind essentielle Informationen, die die Kommunikation mit Personen oder Organisationen ermöglichen. Sie umfassen u.a. Telefonnummern, postalische Adressen und E-Mail-Adressen sowie Kommunikationsmittel wie soziale Medien-Handles und Instant-Messaging-Identifikatoren.</li><li><strong>Meta-, Kommunikations- und Verfahrensdaten:</strong> Meta-, Kommunikations- und Verfahrensdaten sind Kategorien, die Informationen über die Art und Weise enthalten, wie Daten verarbeitet, übermittelt und verwaltet werden. Meta-Daten beschreiben den Kontext, die Herkunft und die Struktur anderer Daten. Kommunikationsdaten erfassen den Austausch von Informationen zwischen Nutzern über verschiedene Kanäle. Verfahrensdaten beschreiben die Prozesse und Abläufe innerhalb von Systemen oder Organisationen.</li><li><strong>Nutzungsdaten:</strong> Nutzungsdaten beziehen sich auf Informationen, die erfassen, wie Nutzer mit digitalen Produkten, Dienstleistungen oder Plattformen interagieren. Diese Daten umfassen z. B. aufgerufene Funktionen, Verweildauer, Zeitstempel von Aktivitäten, IP-Adressen und Geräteinformationen.</li><li><strong>Personenbezogene Daten:</strong> „Personenbezogene Daten" sind alle Informationen, die sich auf eine identifizierte oder identifizierbare natürliche Person (im Folgenden „betroffene Person") beziehen; als identifizierbar wird eine natürliche Person angesehen, die direkt oder indirekt, insbesondere mittels Zuordnung zu einer Kennung wie einem Namen, zu einer Kennnummer, zu Standortdaten, zu einer Online-Kennung oder zu einem oder mehreren besonderen Merkmalen identifiziert werden kann.</li><li><strong>Protokolldaten:</strong> Protokolldaten sind Informationen über Ereignisse oder Aktivitäten, die in einem System oder Netzwerk protokolliert wurden. Diese Daten enthalten typischerweise Informationen wie Zeitstempel, IP-Adressen, Benutzeraktionen und andere Details über die Nutzung oder den Betrieb eines Systems.</li><li><strong>Verantwortlicher:</strong> Als „Verantwortlicher" wird die natürliche oder juristische Person, Behörde, Einrichtung oder andere Stelle, die allein oder gemeinsam mit anderen über die Zwecke und Mittel der Verarbeitung von personenbezogenen Daten entscheidet, bezeichnet.</li><li><strong>Verarbeitung:</strong> „Verarbeitung" ist jeder mit oder ohne Hilfe automatisierter Verfahren ausgeführte Vorgang oder jede solche Vorgangsreihe im Zusammenhang mit personenbezogenen Daten. Der Begriff reicht weit und umfasst praktisch jeden Umgang mit Daten.</li></ul>
<p class="seal"><a href="https://datenschutz-generator.de/" title="Rechtstext von Dr. Schwenke - für weitere Informationen bitte anklicken." target="_blank" rel="noopener noreferrer nofollow">Erstellt mit kostenlosem Datenschutz-Generator.de von Dr. Thomas Schwenke</a></p>
`;

export default function DatenschutzPage() {
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
            Datenschutz&shy;erklärung
            <span className="block text-text-faint">Privacy Policy</span>
          </h1>
          <p className="label-mono mt-4 text-xs leading-relaxed text-text-faint">
            Die deutsche Fassung ist verbindlich · The German version is legally binding
          </p>
        </div>

        {/* English TL;DR for non-German readers; the binding text is the German
            policy below it. */}
        <aside className="rise-in mb-10 rounded border border-border bg-panel p-5 text-sm leading-relaxed text-text-muted sm:p-6">
          <p className="label-mono mb-3 text-[10px] text-text-faint">EN · In short</p>
          <ul className="flex list-disc flex-col gap-2 pl-4">
            <li>
              We don’t store your data on our servers. Your lecture — the PDF, generated
              narration, audio and Q&amp;A — is cached only in your own browser and is never
              uploaded to us.
            </li>
            <li>
              To generate narration and answers, an image of the current slide plus text is sent
              to the AI provider you configure (default: Google Gemini) using your own API key.
              Narration and answer text is sent to Microsoft to synthesize speech. These providers
              may process data in the USA under their own privacy terms.
            </li>
            <li>
              Hosting is provided by Vercel (USA); server access logs (including your IP address)
              are processed to operate and secure the site.
            </li>
            <li>No tracking cookies, no analytics, no user accounts.</li>
            <li>
              Please don’t upload PDFs containing other people’s personal data — their content is
              sent to your chosen AI provider.
            </li>
          </ul>
        </aside>

        <div className="legal-prose rise-in" dangerouslySetInnerHTML={{ __html: policyHtml }} />
      </main>

      <Footer />
    </>
  );
}
