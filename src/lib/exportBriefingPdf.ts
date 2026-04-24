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

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(title, x, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  return y;
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

  let y = 20;

  const fullTitle = derivePdfHeadline(entry);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  y = addWrappedText(doc, fullTitle, marginLeft, y, maxWidth, 8, pageHeight, marginBottom);

  y += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const savedAtText =
    language === "de"
      ? `Gespeichert am: ${formatArchiveDate(entry.updatedAt, language)}`
      : `Saved at: ${formatArchiveDate(entry.updatedAt, language)}`;

  const metaLines = [
    language === "de"
      ? `Archivname: ${entry.name}`
      : `Archive name: ${entry.name}`,
    savedAtText,
  ];

  for (const line of metaLines) {
    y = addWrappedText(doc, line, marginLeft, y, maxWidth, 5, pageHeight, marginBottom);
  }

  y += 6;

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
      5.5,
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
        5.5,
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
      5.5,
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
      5.5,
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
        5,
        pageHeight,
        marginBottom
      );
    }
  }

  const filename = sanitizeFilename(entry.name || fullTitle || "news-briefing");
  doc.save(`${filename}.pdf`);
}