"use client";

import { BriefingResult, Language } from "@/lib/types";
import { i18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ExternalLink, TrendingUp, History, Info, ShieldCheck, Newspaper } from "lucide-react";

interface BriefingDisplayProps {
  briefing: BriefingResult;
  language: Language;
}

export function BriefingDisplay({ briefing, language }: BriefingDisplayProps) {
  const t = i18n[language];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header & Confidence */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-4xl font-headline font-bold text-white leading-tight">
            {briefing.mainTitle}
          </h1>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{t.confidenceScore}</span>
              <span className="text-sm font-bold text-white">{briefing.confidenceScore}%</span>
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

      {/* Categorized Sections */}
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

      {/* Analytical Sections */}
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

      {/* Event Clusters */}
      {briefing.eventClusters && briefing.eventClusters.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm uppercase tracking-[0.2em] font-bold text-muted-foreground px-1">Top Event Clusters</h3>
          <Accordion type="single" collapsible className="space-y-4">
            {briefing.eventClusters.map((cluster, idx) => (
              <AccordionItem key={idx} value={`item-${idx}`} className="border border-white/5 bg-white/[0.02] rounded-xl overflow-hidden px-4 hover:bg-white/[0.04] transition-colors">
                <AccordionTrigger className="hover:no-underline py-6">
                  <div className="flex items-center gap-4 text-left">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                      <Newspaper className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-white">{cluster.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{cluster.supportingSources.length} sources linked</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  <div className="space-y-6">
                    <p className="text-muted-foreground text-base leading-relaxed pl-14">
                      {cluster.summary}
                    </p>
                    
                    <div className="space-y-3 pl-14">
                      <h5 className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-2">
                        <Info className="w-3 h-3" /> {t.supportingSources}
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {cluster.supportingSources.map((source, sIdx) => (
                          <a 
                            key={sIdx} 
                            href={source.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex flex-col p-3 rounded-lg bg-white/5 border border-white/5 hover:border-primary/50 transition-all group"
                          >
                            <span className="text-xs font-bold text-primary mb-1 group-hover:text-accent transition-colors">{source.sourceName}</span>
                            <span className="text-sm font-medium text-white line-clamp-1 group-hover:underline">{source.title}</span>
                            <span className="text-[10px] text-muted-foreground mt-2">{new Date(source.publicationDate).toLocaleString()}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}
    </div>
  );
}