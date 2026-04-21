"use client";

import { BriefingResult, Language } from "@/lib/types";
import { i18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BriefingAudioPlayer } from "@/components/BriefingAudioPlayer";
import { TrendingUp, History, ShieldCheck, Newspaper, Clock3, Link2 } from "lucide-react";

interface BriefingDisplayProps {
  briefing: BriefingResult;
  language: Language;
}

function formatDateTime(value?: string | null, language: Language = "de") {
  if (!value) return "–";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "–";

  return new Intl.DateTimeFormat(language === "de" ? "de-DE" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatWindow(start?: string | null, end?: string | null, language: Language = "de") {
  if (!start || !end) return "–";

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return "–";
  }

  const sameDay =
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getDate() === endDate.getDate();

  if (language === "de") {
    if (sameDay) {
      const day = new Intl.DateTimeFormat("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(startDate);

      const startTime = new Intl.DateTimeFormat("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(startDate);

      const endTime = new Intl.DateTimeFormat("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(endDate);

      return `${day}, ${startTime}–${endTime} Uhr`;
    }

    return `${formatDateTime(start, "de")} – ${formatDateTime(end, "de")}`;
  }

  return `${formatDateTime(start, "en")} – ${formatDateTime(end, "en")}`;
}

export function BriefingDisplay({ briefing, language }: BriefingDisplayProps) {
  const t = i18n[language];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-4xl font-headline font-bold text-white leading-tight">
            {briefing.mainTitle}
          </h1>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                {t.confidenceScore}
              </span>
              <span className="text-sm font-bold text-white">
                {briefing.confidenceScore}%
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Source Verified
            </span>
          </div>
        </div>

        <p className="text-xl text-muted-foreground leading-relaxed font-medium">
          {briefing.overviewParagraph}
        </p>
      </div>

      <BriefingAudioPlayer
        language={language}
        briefing={{
          mainTitle: briefing.mainTitle,
          overviewParagraph: briefing.overviewParagraph,
          sections: briefing.sections,
          whyMarketsCare: briefing.whyMarketsCare,
          whatChanged: briefing.whatChanged,
        }}
      />

      <Card className="briefing-card bg-white/[0.02]">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Clock3 className="w-5 h-5 text-primary" />
            Quellenhinweis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <span className="font-semibold text-white">Quellenbasis:</span>{" "}
            {briefing.articleCount ?? 0} Artikel aus {briefing.sourceCount ?? 0} Quellen
          </p>
          <p>
            <span className="font-semibold text-white">Quellenfenster:</span>{" "}
            {formatWindow(briefing.sourceWindowStart, briefing.sourceWindowEnd, language)}
          </p>
        </CardContent>
      </Card>

      {briefing.sections && briefing.sections.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {briefing.sections.map((section, idx) => (
            <Card key={idx} className="briefing-card bg-white/[0.02]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold text-primary flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-primary rounded-full" />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {section.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {(briefing.whyMarketsCare || briefing.whatChanged) && (
        <div className="grid grid-cols-1 gap-6">
          {briefing.whyMarketsCare && (
            <Card className="briefing-card border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-accent" />
                  {t.whyMarketsCare}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base text-white/80 italic leading-relaxed">
                  {briefing.whyMarketsCare}
                </p>
              </CardContent>
            </Card>
          )}

          {briefing.whatChanged && (
            <Card className="briefing-card border-accent/20 bg-accent/5">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-accent" />
                  {t.whatChanged}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base text-white/80 italic leading-relaxed">
                  {briefing.whatChanged}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {briefing.usedSources && briefing.usedSources.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm uppercase tracking-[0.2em] font-bold text-muted-foreground px-1">
            Verwendete Quellen
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {briefing.usedSources.map((source, idx) => (
              <a
                key={`${source.id}-${idx}`}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="briefing-card p-5 block hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                    <Newspaper className="w-5 h-5 text-primary" />
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-bold text-primary">
                        {source.sourceName}
                      </span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatDateTime(source.publicationDate, language)}
                      </span>
                    </div>

                    <div className="text-base font-semibold text-white leading-snug">
                      {source.title}
                    </div>

                    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>
                        {source.region} • {source.category}
                      </span>
                      <span className="flex items-center gap-1">
                        <Link2 className="w-3 h-3" />
                        Original
                      </span>
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}