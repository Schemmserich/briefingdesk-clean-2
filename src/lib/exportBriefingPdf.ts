"use client";

import jsPDF from "jspdf";
import type { SavedBriefingEntry } from "@/lib/briefingArchive";
import type { Language } from "@/lib/types";

type ExportBriefingPdfInput = {
  entry: SavedBriefingEntry;
  language: Language;
};

function formatDate(value?: string | null, language: Language = "de") {
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

function sanitizeFileName(value: string) {
  return value
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function addWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const lines = doc.splitTextToSize(text || "", maxWidth) as string[];
  let currentY = y;

  for (const line of lines) {
    if (currentY > 280) {
      doc.addPage();
      currentY = 20;
    }

    doc.text(line, x, currentY);
    currentY += lineHeight;
  }

  return currentY;
}

export async function exportBriefingPdf({
  entry,
  language,
}: ExportBriefingPdfInput) {
  const doc = new jsPDF({
    orientation: "p",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - 30;
  const left = 15;

  const createdLabel = language === "de" ? "Gespeichert am" : "Saved at";
  const typeLabel = language === "de" ? "Briefing-Typ" : "Briefing Type";
  const timeframeLabel = language === "de" ? "Zeitfenster" : "Timeframe";
  const categoriesLabel = language === "de" ? "Kategorien" : "Categories";
  const regionsLabel = language === "de" ? "Regionen" : "Regions";
  const languageLabel = language === "de" ? "Sprache" : "Language";
  const contentLabel = language === "de" ? "Briefing-Inhalt" : "Briefing Content";

  let y = 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  y = addWrappedText(doc, entry.title || "Briefing", left, y, contentWidth, 9);

  if (entry.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    y += 1;
    y = addWrappedText(doc, entry.subtitle, left, y, contentWidth, 6);
  }

  y += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const metaLines = [
    `${createdLabel}: ${formatDate(entry.updatedAt, language)}`,
    `${typeLabel}: ${entry.briefingType || "—"}`,
    `${timeframeLabel}: ${entry.timeframe || "—"}`,
    `${languageLabel}: ${entry.language || "—"}`,
    `${categoriesLabel}: ${entry.categories?.length ? entry.categories.join(", ") : "—"}`,
    `${regionsLabel}: ${entry.regions?.length ? entry.regions.join(", ") : "—"}`,
  ];

  for (const line of metaLines) {
    y = addWrappedText(doc, line, left, y, contentWidth, 5.5);
  }

  y += 4;

  doc.setDrawColor(70, 70, 70);
  doc.line(left, y, pageWidth - left, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  y = addWrappedText(doc, contentLabel, left, y, contentWidth, 7);

  y += 2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  const briefing = entry.briefing as any;
  const contentBlocks: string[] = [];

  if (briefing?.mainTitle) {
    contentBlocks.push(String(briefing.mainTitle));
  }

  if (briefing?.subtitle) {
    contentBlocks.push(String(briefing.subtitle));
  }

  if (briefing?.summary) {
    contentBlocks.push(String(briefing.summary));
  }

  if (briefing?.executiveSummary) {
    contentBlocks.push(String(briefing.executiveSummary));
  }

  if (Array.isArray(briefing?.sections)) {
    for (const section of briefing.sections) {
      if (section?.heading) {
        contentBlocks.push(String(section.heading));
      }

      if (section?.title) {
        contentBlocks.push(String(section.title));
      }

      if (section?.summary) {
        contentBlocks.push(String(section.summary));
      }

      if (section?.content) {
        contentBlocks.push(String(section.content));
      }

      if (Array.isArray(section?.bullets) && section.bullets.length > 0) {
        for (const bullet of section.bullets) {
          contentBlocks.push(`• ${String(bullet)}`);
        }
      }
    }
  }

  if (briefing?.marketInsights) {
    contentBlocks.push(String(briefing.marketInsights));
  }

  if (briefing?.changeAnalysis) {
    contentBlocks.push(String(briefing.changeAnalysis));
  }

  if (Array.isArray(briefing?.sources) && briefing.sources.length > 0) {
    contentBlocks.push(language === "de" ? "Quellen:" : "Sources:");
    for (const source of briefing.sources) {
      const sourceLine = [source?.name, source?.category, source?.region]
        .filter(Boolean)
        .join(" · ");
      if (sourceLine) {
        contentBlocks.push(`- ${sourceLine}`);
      }
    }
  }

  if (contentBlocks.length === 0) {
    contentBlocks.push(language === "de" ? "Kein Inhalt verfügbar." : "No content available.");
  }

  for (const block of contentBlocks) {
    y = addWrappedText(doc, block, left, y, contentWidth, 6);
    y += 2;
  }

  const fileNameBase = sanitizeFileName(entry.title || "Briefing");
  doc.save(`${fileNameBase || "Briefing"}.pdf`);
}