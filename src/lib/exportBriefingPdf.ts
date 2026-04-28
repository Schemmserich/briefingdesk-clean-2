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

function ensurePageSpace(doc: jsPDF, currentY: number, neededSpace = 12) {
  if (currentY + neededSpace > 280) {
    doc.addPage();
    return 20;
  }
  return currentY;
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
    currentY = ensurePageSpace(doc, currentY, lineHeight + 2);
    doc.text(line, x, currentY);
    currentY += lineHeight;
  }

  return currentY;
}

function drawHeaderBand(doc: jsPDF, pageWidth: number) {
  doc.setFillColor(18, 24, 38);
  doc.rect(0, 0, pageWidth, 28, "F");
}

function drawMetaBox(doc: jsPDF, x: number, y: number, width: number, height: number) {
  doc.setFillColor(245, 247, 250);
  doc.setDrawColor(220, 224, 230);
  doc.roundedRect(x, y, width, height, 3, 3, "FD");
}

function addSectionHeading(doc: jsPDF, heading: string, x: number, y: number, width: number) {
  let currentY = ensurePageSpace(doc, y, 16);

  doc.setDrawColor(210, 214, 220);
  doc.line(x, currentY, x + width, currentY);
  currentY += 7;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(22, 28, 36);
  doc.text(heading, x, currentY);

  return currentY + 6;
}

function addLabelValueLine(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(70, 78, 92);
  doc.text(`${label}:`, x, y);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 35, 42);

  const labelWidth = 34;
  return addWrappedText(doc, value || "—", x + labelWidth, y, width - labelWidth, 5);
}

function collectBriefingBlocks(briefing: any, language: Language) {
  const blocks: Array<{ type: "heading" | "text" | "bullet"; value: string }> = [];

  if (briefing?.mainTitle) {
    blocks.push({ type: "heading", value: String(briefing.mainTitle) });
  }

  if (briefing?.subtitle) {
    blocks.push({ type: "text", value: String(briefing.subtitle) });
  }

  if (briefing?.summary) {
    blocks.push({ type: "text", value: String(briefing.summary) });
  }

  if (briefing?.executiveSummary) {
    blocks.push({ type: "text", value: String(briefing.executiveSummary) });
  }

  if (Array.isArray(briefing?.sections)) {
    for (const section of briefing.sections) {
      const heading = section?.heading || section?.title;
      if (heading) {
        blocks.push({ type: "heading", value: String(heading) });
      }

      if (section?.summary) {
        blocks.push({ type: "text", value: String(section.summary) });
      }

      if (section?.content) {
        blocks.push({ type: "text", value: String(section.content) });
      }

      if (Array.isArray(section?.bullets)) {
        for (const bullet of section.bullets) {
          blocks.push({ type: "bullet", value: String(bullet) });
        }
      }
    }
  }

  if (briefing?.marketInsights) {
    blocks.push({
      type: "heading",
      value: language === "de" ? "Markteinordnung" : "Market Insights",
    });
    blocks.push({ type: "text", value: String(briefing.marketInsights) });
  }

  if (briefing?.changeAnalysis) {
    blocks.push({
      type: "heading",
      value: language === "de" ? "Veränderungsanalyse" : "Change Analysis",
    });
    blocks.push({ type: "text", value: String(briefing.changeAnalysis) });
  }

  return blocks;
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
  const sourcesLabel = language === "de" ? "Quellen" : "Sources";

  drawHeaderBand(doc, pageWidth);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text("News Briefing", left, 17);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(220, 225, 235);
  doc.text(language === "de" ? "Archiv-Export" : "Archive Export", left, 23);

  let y = 40;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(20, 24, 32);
  y = addWrappedText(doc, entry.title || "Briefing", left, y, contentWidth, 8);

  if (entry.subtitle) {
    y += 2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(90, 98, 112);
    y = addWrappedText(doc, entry.subtitle, left, y, contentWidth, 5.5);
  }

  y += 8;

  const metaBoxHeight = 34;
  drawMetaBox(doc, left, y, contentWidth, metaBoxHeight);

  let metaY = y + 8;
  metaY = addLabelValueLine(doc, createdLabel, formatDate(entry.updatedAt, language), left + 4, metaY, contentWidth - 8);
  metaY = addLabelValueLine(doc, typeLabel, entry.briefingType || "—", left + 4, metaY + 1, contentWidth - 8);
  metaY = addLabelValueLine(doc, timeframeLabel, entry.timeframe || "—", left + 4, metaY + 1, contentWidth - 8);

  y += metaBoxHeight + 10;

  y = addSectionHeading(doc, language === "de" ? "Parameter" : "Parameters", left, y, contentWidth);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(30, 35, 42);

  y = addLabelValueLine(doc, languageLabel, entry.language || "—", left, y, contentWidth);
  y = addLabelValueLine(
    doc,
    categoriesLabel,
    entry.categories?.length ? entry.categories.join(", ") : "—",
    left,
    y + 2,
    contentWidth
  );
  y = addLabelValueLine(
    doc,
    regionsLabel,
    entry.regions?.length ? entry.regions.join(", ") : "—",
    left,
    y + 2,
    contentWidth
  );

  y += 8;
  y = addSectionHeading(doc, contentLabel, left, y, contentWidth);

  const briefing = entry.briefing as any;
  const blocks = collectBriefingBlocks(briefing, language);

  if (blocks.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(80, 88, 100);
    y = addWrappedText(
      doc,
      language === "de" ? "Kein Inhalt verfügbar." : "No content available.",
      left,
      y,
      contentWidth,
      6
    );
  } else {
    for (const block of blocks) {
      y = ensurePageSpace(doc, y, 14);

      if (block.type === "heading") {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(24, 30, 40);
        y = addWrappedText(doc, block.value, left, y, contentWidth, 6.5);
        y += 1;
      } else if (block.type === "bullet") {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(40, 45, 52);
        y = addWrappedText(doc, `• ${block.value}`, left + 2, y, contentWidth - 2, 6);
        y += 1;
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(40, 45, 52);
        y = addWrappedText(doc, block.value, left, y, contentWidth, 6);
        y += 2;
      }
    }
  }

  if (Array.isArray(briefing?.sources) && briefing.sources.length > 0) {
    y += 4;
    y = addSectionHeading(doc, sourcesLabel, left, y, contentWidth);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(55, 62, 74);

    for (const source of briefing.sources) {
      const sourceLine = [source?.name, source?.category, source?.region]
        .filter(Boolean)
        .join(" · ");

      if (sourceLine) {
        y = addWrappedText(doc, `• ${sourceLine}`, left, y, contentWidth, 5.5);
        y += 1;
      }
    }
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 126, 136);
    doc.text(
      `News Briefing · ${page}/${pageCount}`,
      pageWidth - 15,
      292,
      { align: "right" }
    );
  }

  const fileNameBase = sanitizeFileName(entry.title || "Briefing");
  doc.save(`${fileNameBase || "Briefing"}.pdf`);
}