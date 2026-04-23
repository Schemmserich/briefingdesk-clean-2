"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BriefingAudioPlayer } from "@/components/BriefingAudioPlayer";
import { i18n } from "@/lib/i18n";
import { ChevronDown, ChevronUp } from "lucide-react";

type Language = "de" | "en";

type BriefingSection = {
  title?: string;
  content?: string;
  category?: string;
};

type UsedSource = {
  id?: string;
  sourceName?: string;
  title?: string;
  url?: string;
  publicationDate?: string | null;
  category?: string;
  region?: string;
};

type BriefingDisplayData = {
  mainTitle?: string;
  overviewParagraph?: string;
  confidenceScore?: number;
  sections?: BriefingSection[];
  whyMarketsCare?: string;
  whatChanged?: string;
  articleCount?: number;
  sourceCount?: number;
  sourceWindowStart?: string | null;
  sourceWindowEnd?: string | null;
  usedSources?: UsedSource[];
};

type BriefingDisplayProps = {
  briefing: BriefingDisplayData;
  language: Language;
};

function safeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function formatDateTime(value?: string | null, language: Language = "de") {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(language === "de" ? "de-DE" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatWindow(start?: string | null, end?: string | null, language: Language = "de") {
  if (!start || !end) return "—";

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return "—";
  }

  const locale = language === "de" ? "de-DE" : "en-US";

  const sameDay =
    startDate.getDate() === endDate.getDate() &&
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getFullYear() === endDate.getFullYear();

  if (sameDay) {
    const day = new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(startDate);

    const startTime = new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(startDate);

    const endTime = new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(endDate);

    return `${day}, ${startTime} – ${endTime}`;
  }

  return `${formatDateTime(start, language)} – ${formatDateTime(end, language)}`;
}

function inferCategoryFromSection(section: BriefingSection, language: Language): string {
  const explicitCategory = safeText(section.category);
  if (explicitCategory) return explicitCategory;

  const text = `${safeText(section.title)} ${safeText(section.content)}`.toLowerCase();

  if (
    text.includes("regierung") ||
    text.includes("parlament") ||
    text.includes("ukraine") ||
    text.includes("iran") ||
    text.includes("trump") ||
    text.includes("eu") ||
    text.includes("china") ||
    text.includes("taiwan") ||
    text.includes("ceasefire") ||
    text.includes("war") ||
    text.includes("sanctions") ||
    text.includes("president") ||
    text.includes("minister") ||
    text.includes("geopolitical")
  ) {
    return language === "de" ? "Politik" : "Politics";
  }

  if (
    text.includes("market") ||
    text.includes("markets") ||
    text.includes("stock") ||
    text.includes("börse") ||
    text.includes("aktien") ||
    text.includes("equities") ||
    text.includes("investor") ||
    text.includes("trading") ||
    text.includes("wall street") ||
    text.includes("dax") ||
    text.includes("nasdaq") ||
    text.includes("s&p")
  ) {
    return language === "de" ? "Börse" : "Stock Markets";
  }

  if (
    text.includes("wirtschaft") ||
    text.includes("economy") ||
    text.includes("economic") ||
    text.includes("inflation") ||
    text.includes("exports") ||
    text.includes("import") ||
    text.includes("interest rate") ||
    text.includes("central bank") ||
    text.includes("konjunktur") ||
    text.includes("earnings")
  ) {
    return language === "de" ? "Wirtschaft" : "Economy";
  }

  if (
    text.includes("technology") ||
    text.includes("tech") ||
    text.includes("ai") ||
    text.includes("ki") ||
    text.includes("semiconductor") ||
    text.includes("chip") ||
    text.includes("software") ||
    text.includes("cyber") ||
    text.includes("digital")
  ) {
    return language === "de" ? "Technologie" : "Technology";
  }

  if (
    text.includes("science") ||
    text.includes("research") ||
    text.includes("study") ||
    text.includes("wissenschaft")
  ) {
    return language === "de" ? "Wissenschaft" : "Science";
  }

  if (
    text.includes("health") ||
    text.includes("medizin") ||
    text.includes("medical") ||
    text.includes("hospital")
  ) {
    return language === "de" ? "Gesundheit" : "Health";
  }

  if (
    text.includes("climate") ||
    text.includes("klima") ||
    text.includes("emissions") ||
    text.includes("co2")
  ) {
    return language === "de" ? "Klima" : "Climate";
  }

  return language === "de" ? "Allgemein" : "General";
}

function buildFullText(briefing: BriefingDisplayData) {
  const parts: string[] = [];

  const overview = safeText(briefing.overviewParagraph);
  if (overview) parts.push(overview);

  for (const section of briefing.sections ?? []) {
    const title = safeText(section.title);
    const content = safeText(section.content);

    if (title && content) {
      parts.push(`${title}: ${content}`);
    } else if (content) {
      parts.push(content);
    }
  }

  const whyMarketsCare = safeText(briefing.whyMarketsCare);
  if (whyMarketsCare) parts.push(whyMarketsCare);

  const whatChanged = safeText(briefing.whatChanged);
  if (whatChanged) parts.push(whatChanged);

  return parts.join("\n\n");
}

export function BriefingDisplay({ briefing, language }: BriefingDisplayProps) {
  const t = i18n[language];
  const sections = briefing.sections ?? [];
  const sources = briefing.usedSources ?? [];
  const [showSources, setShowSources] = useState(false);
  const [showFullText, setShowFullText] = useState(false);

  const fullText = useMemo(() => buildFullText(briefing), [briefing]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-full overflow-x-hidden">
      <section className="space-y-4 sm:space-y-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-4 flex-1 min-w-0">
            <div className="flex flex-wrap gap-2">
              {typeof briefing.articleCount === "number" && (
                <Badge variant="outline" className="border-white/10 text-muted-foreground font-normal">
                  {language === "de"
                    ? `${briefing.articleCount} Artikel`
                    : `${briefing.articleCount} articles`}
                </Badge>
              )}
              {typeof briefing.sourceCount === "number" && (
                <Badge variant="outline" className="border-white/10 text-muted-foreground font-normal">
                  {language === "de"
                    ? `${briefing.sourceCount} Quellen`
                    : `${briefing.sourceCount} sources`}
                </Badge>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl xl:text-4xl font-headline font-bold text-white leading-tight break-words">
              {briefing.mainTitle}
            </h1>

            <p className="text-base sm:text-lg xl:text-xl text-muted-foreground leading-7 sm:leading-8 font-medium">
              {briefing.overviewParagraph}
            </p>
          </div>

          <div className="self-start w-full xl:w-auto">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 w-full xl:min-w-[170px]">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-400" />
                <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                  {t.confidenceScore}
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white">
                {typeof briefing.confidenceScore === "number"
                  ? `${briefing.confidenceScore}%`
                  : "—"}
              </div>
            </div>
          </div>
        </div>
      </section>

      <BriefingAudioPlayer
        briefing={{
          mainTitle: briefing.mainTitle,
          overviewParagraph: briefing.overviewParagraph,
          sections,
          whyMarketsCare: briefing.whyMarketsCare,
          whatChanged: briefing.whatChanged,
        }}
        language={language}
      />

      {fullText && (
        <section className="space-y-3">
          <button
            type="button"
            onClick={() => setShowFullText((prev) => !prev)}
            className="w-full flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition hover:bg-white/[0.05]"
          >
            <div className="min-w-0">
              <h3 className="text-sm uppercase tracking-[0.2em] font-bold text-muted-foreground">
                {language === "de" ? "Gesamttext" : "Full Text"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {language === "de"
                  ? "Zusammenhängende Fließtext-Ansicht"
                  : "Continuous reading view"}
              </p>
            </div>

            <div className="shrink-0 text-muted-foreground">
              {showFullText ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </button>

          {showFullText && (
            <Card className="briefing-card">
              <CardContent className="p-4 sm:p-6">
                <div className="whitespace-pre-line text-sm sm:text-base text-muted-foreground leading-7 sm:leading-8">
                  {fullText}
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {sections.length > 0 && (
        <section className="space-y-4 sm:space-y-5">
          <div className="space-y-1">
            <h2 className="text-xs sm:text-sm uppercase tracking-[0.2em] font-bold text-muted-foreground px-1">
              {language === "de" ? "Zusammengefasste Themen" : "Curated Summary Blocks"}
            </h2>
            <p className="text-sm text-muted-foreground px-1 leading-6">
              {language === "de"
                ? "Die wichtigsten Entwicklungen in komprimierter, thematisch strukturierter Form."
                : "The most relevant developments in compressed, thematically structured form."}
            </p>
          </div>

          <div className="space-y-4">
            {sections.map((section, idx) => (
              <Card key={`${section.title ?? "section"}-${idx}`} className="briefing-card overflow-hidden">
                <CardHeader className="space-y-3 p-4 sm:p-6">
                  <div>
                    <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                      {inferCategoryFromSection(section, language)}
                    </span>
                  </div>

                  <CardTitle className="text-lg sm:text-xl font-bold text-white leading-snug break-words">
                    {safeText(section.title) ||
                      (language === "de" ? `Zusammenfassung ${idx + 1}` : `Summary ${idx + 1}`)}
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                  <p className="text-sm sm:text-base text-muted-foreground leading-7 sm:leading-8 break-words">
                    {safeText(section.content)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {(briefing.whyMarketsCare || briefing.whatChanged) && (
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {briefing.whyMarketsCare && (
            <Card className="briefing-card">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg font-bold text-white">
                  {t.whyMarketsCare}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <p className="text-sm sm:text-base text-muted-foreground leading-7 sm:leading-8">
                  {briefing.whyMarketsCare}
                </p>
              </CardContent>
            </Card>
          )}

          {briefing.whatChanged && (
            <Card className="briefing-card">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg font-bold text-white">
                  {language === "de" ? "Was sich verändert hat" : "What Changed"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <p className="text-sm sm:text-base text-muted-foreground leading-7 sm:leading-8">
                  {briefing.whatChanged}
                </p>
              </CardContent>
            </Card>
          )}
        </section>
      )}

      <Card className="briefing-card">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg font-bold text-white">
            {language === "de" ? "Quellenhinweis" : "Source Note"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground p-4 pt-0 sm:p-6 sm:pt-0">
          <p className="leading-6">
            <span className="font-semibold text-white">
              {language === "de" ? "Quellenbasis:" : "Source base:"}
            </span>{" "}
            {typeof briefing.articleCount === "number" ? briefing.articleCount : "—"}{" "}
            {language === "de" ? "Artikel aus" : "articles from"}{" "}
            {typeof briefing.sourceCount === "number" ? briefing.sourceCount : "—"}{" "}
            {language === "de" ? "Quellen" : "sources"}
          </p>

          <p className="leading-6">
            <span className="font-semibold text-white">
              {language === "de" ? "Quellenfenster:" : "Source window:"}
            </span>{" "}
            {formatWindow(briefing.sourceWindowStart, briefing.sourceWindowEnd, language)}
          </p>
        </CardContent>
      </Card>

      {sources.length > 0 && (
        <section className="space-y-4">
          <button
            type="button"
            onClick={() => setShowSources((prev) => !prev)}
            className="w-full flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition hover:bg-white/[0.05]"
          >
            <div className="min-w-0">
              <h3 className="text-sm uppercase tracking-[0.2em] font-bold text-muted-foreground">
                {language === "de" ? "Verwendete Quellen" : "Used Sources"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {language === "de"
                  ? `${sources.length} Einträge anzeigen oder ausblenden`
                  : `Show or hide ${sources.length} entries`}
              </p>
            </div>

            <div className="shrink-0 text-muted-foreground">
              {showSources ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </button>

          {showSources && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {sources.map((source, idx) => (
                <a
                  key={`${source.id ?? source.url ?? source.title ?? "source"}-${idx}`}
                  href={source.url || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="briefing-card p-4 sm:p-5 block hover:border-primary/50 transition-colors min-w-0"
                >
                  <div className="space-y-3 min-w-0">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-primary">
                          {safeText(source.sourceName) || (language === "de" ? "Quelle" : "Source")}
                        </div>
                        <div className="text-sm sm:text-base font-semibold text-white leading-snug mt-1 break-words">
                          {safeText(source.title) || "—"}
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground shrink-0">
                        {formatDateTime(source.publicationDate, language)}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {safeText(source.region) && (
                        <span className="rounded-full border border-white/10 px-2 py-1">
                          {source.region}
                        </span>
                      )}
                      {safeText(source.category) && (
                        <span className="rounded-full border border-white/10 px-2 py-1">
                          {source.category}
                        </span>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}