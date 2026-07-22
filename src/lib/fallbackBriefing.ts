import type { BriefingRequest, BriefingResult, BriefingType } from "@/lib/types";

type ArticleLike = {
  id?: string;
  title?: string;
  content?: string;
  summary?: string;
  sourceName?: string;
  publicationDate?: string;
  category?: string;
  region?: string;
  url?: string;
  trustScore?: number;
};

const SECTION_LIMITS: Record<BriefingType, number> = {
  "Ultra Short Update": 0,
  "Short Update": 2,
  "Morning Briefing": 5,
  "Executive Summary": 6,
};

const CATEGORY_DE: Record<string, string> = {
  Politics: "Politik",
  Economy: "Wirtschaft",
  "Stock Markets": "Börse",
  Technology: "Technologie",
  Science: "Wissenschaft",
  Health: "Gesundheit",
  Climate: "Klima",
};

const CATEGORY_EN: Record<string, string> = {
  Politik: "Politics",
  Wirtschaft: "Economy",
  Börse: "Stock Markets",
  Technologie: "Technology",
  Wissenschaft: "Science",
  Gesundheit: "Health",
  Klima: "Climate",
};

function cleanText(value: unknown): string {
  return String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function splitSentences(value: string): string[] {
  const cleaned = cleanText(value);
  if (!cleaned) return [];
  return (cleaned.match(/[^.!?]+(?:[.!?]+|$)/g) ?? [cleaned])
    .map(cleanText)
    .filter(Boolean);
}

function sortByDateDesc(articles: ArticleLike[]) {
  return [...articles].sort(
    (a, b) =>
      new Date(b.publicationDate ?? 0).getTime() -
      new Date(a.publicationDate ?? 0).getTime()
  );
}

function localizeCategory(value: string | undefined, language: "de" | "en") {
  const category = cleanText(value) || (language === "de" ? "Allgemein" : "General");
  return language === "de"
    ? CATEGORY_DE[category] ?? category
    : CATEGORY_EN[category] ?? category;
}

function uniqueValues(values: Array<string | undefined>) {
  return [...new Set(values.map(cleanText).filter(Boolean))];
}

function extractArticleDetail(article: ArticleLike, maxSentences: number) {
  const title = cleanText(article.title);
  const sourceText = cleanText(article.summary) || cleanText(article.content);
  const candidates = splitSentences(sourceText).filter((sentence) => {
    const normalizedSentence = sentence.toLowerCase();
    const normalizedTitle = title.toLowerCase();
    return !normalizedTitle || !normalizedSentence.startsWith(normalizedTitle);
  });

  if (candidates.length) return candidates.slice(0, maxSentences).join(" ");
  return title;
}

function averageTrust(articles: ArticleLike[]) {
  const values = articles
    .map((article) => Number(article.trustScore))
    .filter(Number.isFinite);

  if (!values.length) return 55;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function buildTitle(language: "de" | "en", articles: ArticleLike[]) {
  const topTitle = cleanText(articles[0]?.title);
  if (topTitle) return topTitle.length > 110 ? `${topTitle.slice(0, 107).trim()}…` : topTitle;
  return language === "de" ? "Die wichtigsten Nachrichten im Überblick" : "The most important news at a glance";
}

function buildOverview(language: "de" | "en", articles: ArticleLike[]) {
  const topTitles = uniqueValues(articles.slice(0, 3).map((article) => article.title));
  const categories = uniqueValues(
    articles.slice(0, 6).map((article) => localizeCategory(article.category, language))
  ).slice(0, 3);

  if (!topTitles.length) {
    return language === "de"
      ? "Für die gewählten Einstellungen liegen derzeit nur wenige belastbare Informationen vor."
      : "Only limited reliable information is currently available for the selected settings.";
  }

  if (language === "de") {
    const first = `Im Mittelpunkt steht ${topTitles[0]}.`;
    const second = topTitles[1]
      ? `Daneben ist ${topTitles[1]} besonders relevant.`
      : categories.length
        ? `Die Nachrichtenlage konzentriert sich vor allem auf ${categories.join(", ")}.`
        : "";
    return [first, second].filter(Boolean).join(" ");
  }

  const first = `The main focus is ${topTitles[0]}.`;
  const second = topTitles[1]
    ? `Another particularly relevant development is ${topTitles[1]}.`
    : categories.length
      ? `The news agenda is concentrated mainly on ${categories.join(", ")}.`
      : "";
  return [first, second].filter(Boolean).join(" ");
}

function buildSections(
  language: "de" | "en",
  briefingType: BriefingType,
  articles: ArticleLike[]
) {
  const maxSections = SECTION_LIMITS[briefingType];
  if (!maxSections) return undefined;

  const maxSentences = briefingType === "Executive Summary" ? 3 : 2;

  return articles.slice(0, maxSections).map((article, index) => ({
    title:
      cleanText(article.title) ||
      (language === "de" ? `Entwicklung ${index + 1}` : `Development ${index + 1}`),
    content: extractArticleDetail(article, maxSentences),
  }));
}

function buildWhyMarketsCare(language: "de" | "en", articles: ArticleLike[]) {
  const categories = new Set(
    articles.map((article) => localizeCategory(article.category, "en"))
  );
  const parts: string[] = [];

  if (language === "de") {
    if (categories.has("Economy") || categories.has("Stock Markets")) {
      parts.push("Die Meldungen können Erwartungen zu Wachstum, Zinsen, Unternehmensgewinnen und Risikoprämien verändern.");
    }
    if (categories.has("Politics")) {
      parts.push("Politische Entscheidungen wirken vor allem über Energiepreise, Handel, Währungen und die allgemeine Risikobereitschaft.");
    }
    if (categories.has("Technology")) {
      parts.push("Technologienachrichten beeinflussen Investitionszyklen, Bewertungen und die Erwartungen an künftiges Wachstum.");
    }
    return parts.slice(0, 2).join(" ") || "Die Relevanz für Märkte hängt vor allem von möglichen Folgen für Wachstum, Preise und Risikobereitschaft ab.";
  }

  if (categories.has("Economy") || categories.has("Stock Markets")) {
    parts.push("The reports may change expectations for growth, interest rates, corporate earnings and risk premia.");
  }
  if (categories.has("Politics")) {
    parts.push("Political decisions mainly transmit through energy prices, trade, currencies and overall risk appetite.");
  }
  if (categories.has("Technology")) {
    parts.push("Technology news affects investment cycles, valuations and expectations for future growth.");
  }
  return parts.slice(0, 2).join(" ") || "Market relevance mainly depends on possible effects on growth, prices and risk appetite.";
}

function buildWhatChanged(language: "de" | "en", articles: ArticleLike[]) {
  const newest = sortByDateDesc(articles).slice(0, 2);
  const titles = uniqueValues(newest.map((article) => article.title));

  if (!titles.length) {
    return language === "de"
      ? "Aus den vorliegenden Artikeln lässt sich keine belastbare Veränderung innerhalb des Zeitfensters ableiten."
      : "The supplied articles do not establish a reliable change within the selected window.";
  }

  return language === "de"
    ? `Neu in den Vordergrund gerückt sind ${titles.join(" sowie ")}. Ein belastbarer Vergleich mit dem vorherigen Zeitfenster ist ohne ältere Vergleichsdaten nur eingeschränkt möglich.`
    : `The developments that newly moved to the foreground are ${titles.join(" and ")}. A robust comparison with the previous window is limited without older comparison data.`;
}

export function buildFallbackBriefing(
  input: BriefingRequest,
  articles: ArticleLike[]
): BriefingResult {
  const language: "de" | "en" = input.language === "en" ? "en" : "de";
  const sortedArticles = sortByDateDesc(articles);

  return {
    mainTitle: buildTitle(language, sortedArticles),
    overviewParagraph: buildOverview(language, sortedArticles),
    briefingType: input.briefingType,
    confidenceScore: averageTrust(sortedArticles),
    sections: buildSections(language, input.briefingType, sortedArticles),
    whyMarketsCare: input.includeMarketInsights
      ? buildWhyMarketsCare(language, sortedArticles)
      : undefined,
    whatChanged: input.includeChangeAnalysis
      ? buildWhatChanged(language, sortedArticles)
      : undefined,
  };
}
