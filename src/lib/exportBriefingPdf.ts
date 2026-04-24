import { ArchivedBriefing } from "@/lib/briefingArchive";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function nl2br(value: string): string {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

function formatDateTime(value: string, language: "de" | "en") {
  return new Intl.DateTimeFormat(language === "de" ? "de-DE" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function exportArchivedBriefingToPdf(entry: ArchivedBriefing) {
  if (typeof window === "undefined") return;

  const briefing = entry.briefing ?? {};
  const language = entry.language ?? "en";

  const titleParts = [briefing.briefingType, briefing.mainTitle].filter(Boolean);
  const fullTitle = titleParts.length ? titleParts.join(": ") : entry.name;

  const sectionsHtml = (briefing.sections ?? [])
    .map((section: any) => {
      const sectionTitle = section?.title ? escapeHtml(String(section.title)) : "";
      const sectionContent = section?.content ? nl2br(String(section.content)) : "";

      return `
        <section class="section">
          ${sectionTitle ? `<h2>${sectionTitle}</h2>` : ""}
          ${sectionContent ? `<p>${sectionContent}</p>` : ""}
        </section>
      `;
    })
    .join("");

  const whyMarketsCareHtml = briefing.whyMarketsCare
    ? `
      <section class="section">
        <h2>${language === "de" ? "Warum Märkte darauf achten" : "Why Markets Care"}</h2>
        <p>${nl2br(String(briefing.whyMarketsCare))}</p>
      </section>
    `
    : "";

  const whatChangedHtml = briefing.whatChanged
    ? `
      <section class="section">
        <h2>${language === "de" ? "Was sich verändert hat" : "What Changed"}</h2>
        <p>${nl2br(String(briefing.whatChanged))}</p>
      </section>
    `
    : "";

  const sourcesHtml = (briefing.usedSources ?? [])
    .map((source: any) => {
      const sourceName = source?.sourceName ? escapeHtml(String(source.sourceName)) : "";
      const sourceTitle = source?.title ? escapeHtml(String(source.title)) : "";
      const publicationDate = source?.publicationDate
        ? formatDateTime(String(source.publicationDate), language)
        : "";
      const region = source?.region ? escapeHtml(String(source.region)) : "";
      const category = source?.category ? escapeHtml(String(source.category)) : "";

      return `
        <div class="source">
          <div class="source-name">${sourceName}</div>
          <div class="source-title">${sourceTitle}</div>
          <div class="source-meta">${publicationDate}${region ? ` · ${region}` : ""}${category ? ` · ${category}` : ""}</div>
        </div>
      `;
    })
    .join("");

  const html = `
    <!DOCTYPE html>
    <html lang="${language}">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(fullTitle)}</title>
        <style>
          @page {
            size: A4;
            margin: 18mm;
          }

          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #111827;
            background: #ffffff;
            margin: 0;
            line-height: 1.5;
          }

          .wrapper {
            max-width: 800px;
            margin: 0 auto;
          }

          .eyebrow {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #6b7280;
            margin-bottom: 10px;
          }

          h1 {
            font-size: 28px;
            line-height: 1.2;
            margin: 0 0 14px 0;
            color: #111827;
          }

          .overview {
            font-size: 16px;
            color: #374151;
            margin-bottom: 24px;
          }

          .meta-box {
            border: 1px solid #d1d5db;
            border-radius: 12px;
            padding: 12px 14px;
            margin-bottom: 24px;
            background: #f9fafb;
          }

          .meta-line {
            font-size: 13px;
            color: #374151;
            margin: 4px 0;
          }

          .section {
            margin-bottom: 22px;
            page-break-inside: avoid;
          }

          h2 {
            font-size: 18px;
            margin: 0 0 8px 0;
            color: #111827;
          }

          p {
            font-size: 14px;
            margin: 0;
            color: #374151;
          }

          .sources {
            margin-top: 28px;
            padding-top: 18px;
            border-top: 1px solid #d1d5db;
          }

          .source {
            margin-bottom: 10px;
            page-break-inside: avoid;
          }

          .source-name {
            font-size: 13px;
            font-weight: 700;
            color: #111827;
          }

          .source-title {
            font-size: 13px;
            color: #374151;
          }

          .source-meta {
            font-size: 12px;
            color: #6b7280;
          }

          .print-note {
            margin-top: 24px;
            font-size: 12px;
            color: #6b7280;
          }

          @media print {
            .print-note {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="eyebrow">${language === "de" ? "News Briefing Archivexport" : "News Briefing Archive Export"}</div>
          <h1>${escapeHtml(fullTitle)}</h1>

          ${
            briefing.overviewParagraph
              ? `<div class="overview">${nl2br(String(briefing.overviewParagraph))}</div>`
              : ""
          }

          <div class="meta-box">
            <div class="meta-line"><strong>${language === "de" ? "Archivname" : "Archive name"}:</strong> ${escapeHtml(entry.name)}</div>
            <div class="meta-line"><strong>${language === "de" ? "Gespeichert am" : "Saved at"}:</strong> ${formatDateTime(entry.updatedAt, language)}</div>
            <div class="meta-line"><strong>${language === "de" ? "Typ" : "Type"}:</strong> ${escapeHtml(String(briefing.briefingType ?? "Briefing"))}</div>
          </div>

          ${sectionsHtml}
          ${whyMarketsCareHtml}
          ${whatChangedHtml}

          ${
            sourcesHtml
              ? `
                <div class="sources">
                  <h2>${language === "de" ? "Verwendete Quellen" : "Used Sources"}</h2>
                  ${sourcesHtml}
                </div>
              `
              : ""
          }

          <div class="print-note">
            ${language === "de"
              ? "Im Druckdialog bitte „Als PDF speichern“ auswählen."
              : "In the print dialog, choose “Save as PDF”."}
          </div>
        </div>

        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
            }, 250);
          };
        </script>
      </body>
    </html>
  `;

  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=1100");
  if (!printWindow) return;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}