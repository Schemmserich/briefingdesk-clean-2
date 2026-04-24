import jsPDF from "jspdf";
import { ArchivedBriefing } from "@/lib/briefingArchive";

function sanitizeFilename(value: string) {
  return value
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function formatArchiveDate(value: string, language: "de" | "en") {
  const locale = language === "de" ? "de-DE" : "en-US";

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function addWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  pageHeight: number,
  marginBottom: number
) {
  const lines = doc.splitTextToSize(text, maxWidth);

  for (const line of lines) {
    if (y > pageHeight - marginBottom) {
      doc.addPage();
      y = 20;
    }

    doc.text(line, x, y);
    y += lineHeight;
  }

  return y;
}

function addSectionTitle(
  doc: jsPDF,
  title: string,
  x: number,
  y: number,
  pageHeight: number,
  marginBottom: number
) {
  if (y > pageHeight - marginBottom) {
    doc.addPage();
    y = 20;
  }

  doc.setDrawColor(59, 130, 246);
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(x, y - 5, 178, 9, 2, 2, "F");

  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(title, x + 2, y + 1);

  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(31, 41, 55);

  return y;
}

function drawMetaBox(
  doc: jsPDF,
  lines: string[],
  x: number,
  y: number,
  width: number
) {
  const height = 8 + lines.length * 6;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, y, width, height, 3, 3, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(55, 65, 81);

  let currentY = y + 6;
  for (const line of lines) {
    doc.text(line, x + 4, currentY);
    currentY += 6;
  }

  return y + height;
}

function derivePdfHeadline(entry: ArchivedBriefing) {
  const briefing = entry.briefing ?? {};
  const briefingType = String(briefing.briefingType ?? entry.params?.briefingType ?? "").trim();
  let mainTitle = String(briefing.mainTitle ?? "").trim();

  if (!mainTitle) {
    const overview = String(briefing.overviewParagraph ?? "").trim();
    if (overview) {
      const firstSentence = overview.split(/(?<=[.!?])\s+/)[0]?.trim() || overview;
      mainTitle =
        firstSentence.length > 120
          ? `${firstSentence.slice(0, 117).trim()}...`
          : firstSentence;
    }
  }

  if (!mainTitle) {
    mainTitle = entry.name;
  }

  if (briefingType && mainTitle) {
    return `${briefingType}: ${mainTitle}`;
  }

  return mainTitle || briefingType || entry.name || "News Briefing";
}

export function exportArchivedBriefingToPdf(entry: ArchivedBriefing) {
  const briefing = entry.briefing ?? {};
  const language: "de" | "en" = entry.language === "de" ? "de" : "en";

  const doc = new jsPDF({
    orientation: "p",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 16;
  const marginRight = 16;
  const marginBottom = 18;
  const maxWidth = pageWidth - marginLeft - marginRight;

  let y = 18;

  const fullTitle = derivePdfHeadline(entry);

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("News Briefing", marginLeft, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    language === "de" ? "Archivexport" : "Archive Export",
    marginLeft,
    21
  );

  y = 38;

  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  y = addWrappedText(doc, fullTitle, marginLeft, y, maxWidth, 8, pageHeight, marginBottom);

  y += 4;

  const metaLines = [
    language === "de"
      ? `Archivname: ${entry.name}`
      : `Archive name: ${entry.name}`,
    language === "de"
      ? `Gespeichert am: ${formatArchiveDate(entry.updatedAt, language)}`
      : `Saved at: ${formatArchiveDate(entry.updatedAt, language)}`,
    language === "de"
      ? `Typ: ${String(briefing.briefingType ?? entry.params?.briefingType ?? "Briefing")}`
      : `Type: ${String(briefing.briefingType ?? entry.params?.briefingType ?? "Briefing")}`,
  ];

  y = drawMetaBox(doc, metaLines, marginLeft, y, maxWidth) + 8;

  doc.setTextColor(31, 41, 55);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  if (briefing.overviewParagraph) {
    y = addSectionTitle(
      doc,
      language === "de" ? "Überblick" : "Overview",
      marginLeft,
      y,
      pageHeight,
      marginBottom
    );
    y = addWrappedText(
      doc,
      String(briefing.overviewParagraph),
      marginLeft,
      y,
      maxWidth,
      5.8,
      pageHeight,
      marginBottom
    );
    y += 6;
  }

  for (const section of briefing.sections ?? []) {
    const title = section?.title ? String(section.title) : "";
    const content = section?.content ? String(section.content) : "";

    if (!title && !content) continue;

    y = addSectionTitle(
      doc,
      title || (language === "de" ? "Abschnitt" : "Section"),
      marginLeft,
      y,
      pageHeight,
      marginBottom
    );

    if (content) {
      y = addWrappedText(
        doc,
        content,
        marginLeft,
        y,
        maxWidth,
        5.6,
        pageHeight,
        marginBottom
      );
      y += 6;
    }
  }

  if (briefing.whyMarketsCare) {
    y = addSectionTitle(
      doc,
      language === "de" ? "Warum Märkte darauf achten" : "Why Markets Care",
      marginLeft,
      y,
      pageHeight,
      marginBottom
    );
    y = addWrappedText(
      doc,
      String(briefing.whyMarketsCare),
      marginLeft,
      y,
      maxWidth,
      5.6,
      pageHeight,
      marginBottom
    );
    y += 6;
  }

  if (briefing.whatChanged) {
    y = addSectionTitle(
      doc,
      language === "de" ? "Was sich verändert hat" : "What Changed",
      marginLeft,
      y,
      pageHeight,
      marginBottom
    );
    y = addWrappedText(
      doc,
      String(briefing.whatChanged),
      marginLeft,
      y,
      maxWidth,
      5.6,
      pageHeight,
      marginBottom
    );
    y += 6;
  }

  if ((briefing.usedSources ?? []).length > 0) {
    y = addSectionTitle(
      doc,
      language === "de" ? "Verwendete Quellen" : "Used Sources",
      marginLeft,
      y,
      pageHeight,
      marginBottom
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(55, 65, 81);

    for (const source of briefing.usedSources ?? []) {
      const sourceLine = [
        source?.sourceName ?? "",
        source?.title ?? "",
        source?.publicationDate
          ? formatArchiveDate(String(source.publicationDate), language)
          : "",
      ]
        .filter(Boolean)
        .join(" · ");

      if (!sourceLine) continue;

      y = addWrappedText(
        doc,
        `• ${sourceLine}`,
        marginLeft,
        y,
        maxWidth,
        5.2,
        pageHeight,
        marginBottom
      );
    }
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(marginLeft, pageHeight - 12, pageWidth - marginRight, pageHeight - 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("News Briefing", marginLeft, pageHeight - 6);
    doc.text(
      `${i}/${pageCount}`,
      pageWidth - marginRight - 8,
      pageHeight - 6
    );
  }

  const filename = sanitizeFilename(entry.name || fullTitle || "news-briefing");
  doc.save(`${filename}.pdf`);
}