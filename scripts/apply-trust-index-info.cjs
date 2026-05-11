const fs = require("fs");
const path = require("path");

const root = process.cwd();

const displayPath = path.join(root, "src", "components", "BriefingDisplay.tsx");
const componentPath = path.join(root, "src", "components", "TrustIndexInfoButton.tsx");
const backupPath = path.join(root, "src", "components", "BriefingDisplay.before-trust-index.tsx");

if (!fs.existsSync(displayPath)) {
  throw new Error("BriefingDisplay.tsx wurde nicht gefunden.");
}

if (!fs.existsSync(backupPath)) {
  fs.copyFileSync(displayPath, backupPath);
}

const componentCode = `"use client";

import { useState } from "react";
import { HelpCircle, X } from "lucide-react";

type Language = "de" | "en";

type TrustIndexInfoButtonProps = {
  score?: number;
  language: Language;
  sourceCount?: number;
  articleCount?: number;
  displayLabel?: string;
};

function getScoreText(score?: number): string {
  return typeof score === "number" ? String(score) + "%" : "—";
}

function getScoreLabel(score?: number, language: Language = "de"): string {
  if (typeof score !== "number") {
    return language === "de" ? "nicht bewertet" : "not rated";
  }

  if (score >= 85) {
    return language === "de" ? "sehr belastbar" : "very robust";
  }

  if (score >= 70) {
    return language === "de" ? "gut belastbar" : "robust";
  }

  if (score >= 50) {
    return language === "de" ? "mittlere Belastbarkeit" : "moderate confidence";
  }

  return language === "de" ? "vorsichtig einordnen" : "treat with caution";
}

export function TrustIndexInfoButton({
  score,
  language,
  sourceCount,
  articleCount,
  displayLabel,
}: TrustIndexInfoButtonProps) {
  const [open, setOpen] = useState(false);

  const scoreText = getScoreText(score);
  const scoreLabel = getScoreLabel(score, language);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group w-full text-left rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-primary/50 hover:bg-white/[0.05] focus:outline-none focus:ring-2 focus:ring-primary/60 xl:min-w-[190px]"
        aria-label={
          language === "de"
            ? "Vertrauensindex erklären"
            : "Explain confidence score"
        }
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-400" />
          <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground group-hover:text-white transition-colors">
            {displayLabel ?? (language === "de" ? "Vertrauensindex" : "Confidence Score")}
          </span>
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>

        <div className="text-xl sm:text-2xl font-bold text-white">
          {scoreText}
        </div>

        <div className="mt-1 text-[11px] text-muted-foreground">
          {scoreLabel}
        </div>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-3 py-4">
          <div className="w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-2xl border border-white/10 bg-background p-5 sm:p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  {language === "de"
                    ? "Was bedeutet der Vertrauensindex?"
                    : "What does the confidence score mean?"}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground leading-6">
                  {language === "de"
                    ? "Der Vertrauensindex ist eine Einordnung der Belastbarkeit eines Briefings. Er ist kein Wahrheitsversprechen, sondern zeigt, wie stark die verwendete Quellenbasis, die Aktualität und die Plausibilität der Informationen einzuschätzen sind."
                    : "The confidence score is an assessment of how robust a briefing is. It is not a guarantee of truth; it indicates how strong the source base, timeliness, and plausibility of the information are considered to be."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-white/10 p-2 text-muted-foreground hover:text-white hover:bg-white/5"
                aria-label={language === "de" ? "Schließen" : "Close"}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-sm font-semibold text-white mb-2">
                  {language === "de" ? "Aktuelle Einordnung" : "Current assessment"}
                </div>
                <p className="text-sm text-muted-foreground leading-6">
                  {language === "de"
                    ? "Dieses Briefing erreicht aktuell " + scoreText + " und wird damit als „" + scoreLabel + "“ eingeordnet."
                    : "This briefing currently reaches " + scoreText + " and is classified as “" + scoreLabel + "”."}
                </p>
                <p className="mt-2 text-xs text-muted-foreground leading-5">
                  {language === "de"
                    ? "Quellenbasis: " + (typeof articleCount === "number" ? articleCount : "—") + " Artikel aus " + (typeof sourceCount === "number" ? sourceCount : "—") + " Quellen."
                    : "Source base: " + (typeof articleCount === "number" ? articleCount : "—") + " articles from " + (typeof sourceCount === "number" ? sourceCount : "—") + " sources."}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-sm font-semibold text-white mb-3">
                  {language === "de"
                    ? "Wie setzt sich der Vertrauensindex zusammen?"
                    : "How is the score composed?"}
                </div>

                <div className="grid gap-3 text-sm text-muted-foreground leading-6">
                  <p>
                    <span className="font-semibold text-white">
                      {language === "de" ? "Quellenqualität:" : "Source quality:"}
                    </span>{" "}
                    {language === "de"
                      ? "Etablierte Medien, Nachrichtenagenturen, Behörden, Unternehmensmeldungen und Fachquellen werden höher gewichtet als unklare oder nicht überprüfbare Einzelmeldungen."
                      : "Established media, news agencies, public authorities, company releases, and specialist sources are weighted more strongly than unclear or unverifiable single reports."}
                  </p>

                  <p>
                    <span className="font-semibold text-white">
                      {language === "de" ? "Mehrfachbestätigung:" : "Independent confirmation:"}
                    </span>{" "}
                    {language === "de"
                      ? "Eine Information ist belastbarer, wenn mehrere voneinander unabhängige Quellen dieselbe Kernaussage stützen."
                      : "Information is considered more robust when several independent sources support the same core claim."}
                  </p>

                  <p>
                    <span className="font-semibold text-white">
                      {language === "de" ? "Aktualität:" : "Timeliness:"}
                    </span>{" "}
                    {language === "de"
                      ? "Informationen müssen zum gewählten Zeitfenster passen. Ältere Meldungen können Kontext liefern, sollten aber nicht die Hauptbasis aktueller Briefings sein."
                      : "Information should fit the selected time window. Older reports can provide context but should not be the main basis for current briefings."}
                  </p>

                  <p>
                    <span className="font-semibold text-white">
                      {language === "de" ? "Primärquellen-Nähe:" : "Proximity to primary sources:"}
                    </span>{" "}
                    {language === "de"
                      ? "Offizielle Dokumente, Pressemitteilungen, Geschäftsberichte, Regulierungsangaben oder Behördeninformationen erhöhen die Belastbarkeit."
                      : "Official documents, press releases, annual reports, regulatory filings, or government data improve robustness."}
                  </p>

                  <p>
                    <span className="font-semibold text-white">
                      {language === "de" ? "Widerspruchslage:" : "Conflicting reports:"}
                    </span>{" "}
                    {language === "de"
                      ? "Bei widersprüchlicher oder dünner Quellenlage wird die Einordnung vorsichtiger."
                      : "If reports are conflicting or the source base is thin, the assessment becomes more cautious."}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-sm font-semibold text-white mb-3">
                  {language === "de"
                    ? "Wann werden welche Quellen herangezogen?"
                    : "When are different source types used?"}
                </div>

                <div className="grid gap-2 text-sm text-muted-foreground leading-6">
                  <p>
                    <span className="font-semibold text-white">
                      {language === "de" ? "Breaking News:" : "Breaking news:"}
                    </span>{" "}
                    {language === "de"
                      ? "Nachrichtenagenturen, große etablierte Medien und offizielle Statements."
                      : "News agencies, major established media, and official statements."}
                  </p>

                  <p>
                    <span className="font-semibold text-white">
                      {language === "de" ? "Politik und Behörden:" : "Politics and public authorities:"}
                    </span>{" "}
                    {language === "de"
                      ? "Ministerien, Behörden, Parlamente, offizielle Dokumente und ergänzend seriöse Medien."
                      : "Ministries, public authorities, parliaments, official documents, plus reputable media."}
                  </p>

                  <p>
                    <span className="font-semibold text-white">
                      {language === "de" ? "Börse und Unternehmen:" : "Markets and companies:"}
                    </span>{" "}
                    {language === "de"
                      ? "Unternehmensmeldungen, Investor-Relations-Seiten, Geschäftsberichte, Börsendaten und seriöse Finanzmedien."
                      : "Company releases, investor relations pages, annual reports, market data, and reputable financial media."}
                  </p>

                  <p>
                    <span className="font-semibold text-white">
                      {language === "de" ? "Makroökonomie:" : "Macroeconomics:"}
                    </span>{" "}
                    {language === "de"
                      ? "Zentralbanken, Statistikämter, internationale Organisationen und etablierte Wirtschaftsmedien."
                      : "Central banks, statistical offices, international organizations, and established business media."}
                  </p>

                  <p>
                    <span className="font-semibold text-white">
                      {language === "de" ? "Wissenschaft und Technologie:" : "Science and technology:"}
                    </span>{" "}
                    {language === "de"
                      ? "Fachpublikationen, Universitäten, Unternehmen, Regulierungsstellen und spezialisierte Tech- oder Wissenschaftsmedien."
                      : "Research publications, universities, companies, regulators, and specialist technology or science media."}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-4">
                <div className="text-sm font-semibold text-amber-100 mb-2">
                  {language === "de" ? "Wichtiger Hinweis" : "Important note"}
                </div>
                <p className="text-sm text-amber-100/80 leading-6">
                  {language === "de"
                    ? "Social-Media-Beiträge, Blogs oder nicht verifizierte Einzelmeldungen sollten nicht allein die Grundlage für eine hohe Bewertung bilden. Sie können Hinweise liefern, müssen aber durch belastbare Quellen bestätigt werden."
                    : "Social media posts, blogs, or unverifiable single reports should not be the sole basis for a high score. They may provide leads, but they need confirmation from robust sources."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
`;

fs.writeFileSync(componentPath, componentCode, "utf8");

let display = fs.readFileSync(displayPath, "utf8");

const importToFind = `import { BriefingAudioPlayer } from "@/components/BriefingAudioPlayer";`;
const importToAdd = `import { TrustIndexInfoButton } from "@/components/TrustIndexInfoButton";`;

if (!display.includes(importToAdd)) {
  display = display.replace(importToFind, `${importToFind}
${importToAdd}`);
}

if (!display.includes("<TrustIndexInfoButton")) {
  const trustStart = display.indexOf(`          <div className="self-start w-full xl:w-auto">`);
  const confidenceMarker = display.indexOf("briefing.confidenceScore", trustStart);
  const trustEndMarker = `          </div>`;
  const trustEnd = display.indexOf(trustEndMarker, confidenceMarker);

  if (trustStart === -1 || confidenceMarker === -1 || trustEnd === -1) {
    throw new Error("Der Vertrauensindex-Bereich konnte nicht eindeutig gefunden werden.");
  }

  const newTrustBlock = `          <div className="self-start w-full xl:w-auto">
            <TrustIndexInfoButton
              score={briefing.confidenceScore}
              language={language}
              sourceCount={briefing.sourceCount}
              articleCount={briefing.articleCount}
              displayLabel={language === "de" ? "Vertrauensindex" : t.confidenceScore}
            />
          </div>`;

  display =
    display.slice(0, trustStart) +
    newTrustBlock +
    display.slice(trustEnd + trustEndMarker.length);
}

const sourceWindowEndSnippet = `            {formatWindow(briefing.sourceWindowStart, briefing.sourceWindowEnd, language)}
          </p>`;

const sourceAddition = `            {formatWindow(briefing.sourceWindowStart, briefing.sourceWindowEnd, language)}
          </p>

          <p className="leading-6">
            {language === "de"
              ? "Der Vertrauensindex bewertet die Belastbarkeit der verwendeten Quellenbasis. Details zur Berechnung und Quellenlogik erhältst du per Klick auf den Vertrauensindex oben."
              : "The confidence score assesses the robustness of the underlying source base. Click the confidence score above for details on the scoring and source logic."}
          </p>`;

if (!display.includes("Details zur Berechnung und Quellenlogik")) {
  if (!display.includes(sourceWindowEndSnippet)) {
    throw new Error("Der Quellenfenster-Block wurde nicht gefunden.");
  }

  display = display.replace(sourceWindowEndSnippet, sourceAddition);
}

fs.writeFileSync(displayPath, display, "utf8");

console.log("Anklickbarer Vertrauensindex erfolgreich eingebaut.");