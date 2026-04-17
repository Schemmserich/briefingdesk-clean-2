type Article = {
  id: string;
  title: string;
  url: string;
  publicationDate: string;
  sourceName: string;
  region: string;
  category: string;
  content: string;
  summary?: string;
  trustScore?: number;
};

type BriefingInput = {
  language: "en" | "de";
  timeframe: string;
  briefingType:
    | "Ultra Short Update"
    | "Short Update"
    | "Morning Briefing"
    | "Executive Summary";
  includeMarketInsights?: boolean;
  includeChangeAnalysis?: boolean;
};

function groupByCategory(articles: Article[]) {
  const map = new Map<string, Article[]>();

  for (const article of articles) {
    const key = article.category || "Other";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(article);
  }

  return map;
}

function formatTopTitles(articles: Article[], max = 3) {
  return articles
    .slice(0, max)
    .map((a) => a.title)
    .join("; ");
}

function buildGermanOverview(articles: Article[], timeframe: string) {
  const top = articles.slice(0, 3);
  if (!top.length) {
    return `Für das gewählte Zeitfenster ${timeframe} liegen aktuell keine passenden Artikel vor.`;
  }

  return `Dieses Briefing basiert auf ${articles.length} Artikeln aus dem Zeitfenster ${timeframe}. Im Fokus stehen derzeit: ${formatTopTitles(top)}.`;
}

function buildEnglishOverview(articles: Article[], timeframe: string) {
  const top = articles.slice(0, 3);
  if (!top.length) {
    return `There are currently no matching articles for the selected ${timeframe} window.`;
  }

  return `This briefing is based on ${articles.length} articles from the selected ${timeframe} window. Current focus topics include: ${formatTopTitles(top)}.`;
}

function buildSections(articles: Article[], language: "en" | "de") {
  const grouped = groupByCategory(articles);
  const sections: { title: string; content: string }[] = [];

  for (const [category, group] of grouped.entries()) {
    const topArticles = group.slice(0, 3);

    const content =
      language === "de"
        ? `In der Kategorie ${category} sind besonders relevant: ${topArticles
            .map((a) => `${a.title} (${a.sourceName})`)
            .join("; ")}.`
        : `Within ${category}, the most relevant items are: ${topArticles
            .map((a) => `${a.title} (${a.sourceName})`)
            .join("; ")}.`;

    sections.push({
      title: category,
      content,
    });
  }

  return sections.slice(0, 4);
}

function buildWhyMarketsCare(articles: Article[], language: "en" | "de") {
  const markets = articles.filter(
    (a) => a.category === "Stock Markets" || a.category === "Economy"
  );

  if (!markets.length) return undefined;

  return language === "de"
    ? `Die Marktrelevanz ergibt sich vor allem aus den Artikeln zu Wirtschaft und Kapitalmärkten. Besonders wichtig sind derzeit: ${formatTopTitles(markets, 3)}.`
    : `Market relevance mainly stems from the economy and capital-markets articles. Key items currently include: ${formatTopTitles(markets, 3)}.`;
}

function buildWhatChanged(articles: Article[], language: "en" | "de", timeframe: string) {
  if (!articles.length) return undefined;

  return language === "de"
    ? `Im gewählten Zeitfenster ${timeframe} wurden ${articles.length} passende Artikel berücksichtigt. Die neuesten Schwerpunkte sind: ${formatTopTitles(articles, 3)}.`
    : `Within the selected ${timeframe} window, ${articles.length} matching articles were considered. The newest focus topics are: ${formatTopTitles(articles, 3)}.`;
}

export function buildFallbackBriefing(input: BriefingInput, articles: Article[]) {
  const sorted = [...articles].sort((a, b) => {
    const aTime = new Date(a.publicationDate).getTime();
    const bTime = new Date(b.publicationDate).getTime();
    return bTime - aTime;
  });

  const overviewParagraph =
    input.language === "de"
      ? buildGermanOverview(sorted, input.timeframe)
      : buildEnglishOverview(sorted, input.timeframe);

  const sections =
    input.briefingType === "Ultra Short Update"
      ? undefined
      : buildSections(sorted, input.language);

  const mainTitle =
    input.language === "de"
      ? `Nachrichtenüberblick (${input.timeframe})`
      : `News Briefing (${input.timeframe})`;

  return {
    mainTitle,
    overviewParagraph,
    briefingType: input.briefingType,
    confidenceScore: 78,
    sections,
    whyMarketsCare: input.includeMarketInsights
      ? buildWhyMarketsCare(sorted, input.language)
      : undefined,
    whatChanged: input.includeChangeAnalysis
      ? buildWhatChanged(sorted, input.language, input.timeframe)
      : undefined,
  };
}