import Parser from "rss-parser";
import { ingestArticles } from "@/lib/sources/ingest";
import { ImportedArticle } from "@/lib/sources/types";

const parser = new Parser();

function isFresh(pubDate?: string, maxHours = 24): boolean {
  if (!pubDate) return false;

  const published = new Date(pubDate).getTime();
  if (Number.isNaN(published)) return false;

  const cutoff = Date.now() - maxHours * 60 * 60 * 1000;
  return published >= cutoff;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractKeywordScore(text: string, keywords: string[]): number {
  const normalized = normalizeText(text);
  let score = 0;

  for (const keyword of keywords) {
    if (normalized.includes(keyword.toLowerCase())) {
      score += 1;
    }
  }

  return score;
}

function getCategoryScores(text: string) {
  const politicsKeywords = [
    "president",
    "minister",
    "government",
    "parliament",
    "election",
    "vote",
    "sanction",
    "ceasefire",
    "war",
    "conflict",
    "military",
    "diplomatic",
    "geopolitical",
    "ukraine",
    "iran",
    "israel",
    "gaza",
    "china",
    "taiwan",
    "eu summit",
    "white house",
    "foreign policy",
    "regierung",
    "wahl",
    "krieg",
    "sanktion",
    "waffenruhe",
    "parlament",
  ];

  const economyKeywords = [
    "inflation",
    "interest rate",
    "rates",
    "central bank",
    "fed",
    "ecb",
    "gdp",
    "exports",
    "imports",
    "economy",
    "economic",
    "consumer spending",
    "employment",
    "labour market",
    "jobless",
    "manufacturing",
    "pmi",
    "recession",
    "growth",
    "macro",
    "wirtschaft",
    "konjunktur",
    "arbeitsmarkt",
    "export",
    "import",
    "inflation",
    "zins",
  ];

  const stockMarketKeywords = [
    "stocks",
    "stock market",
    "equities",
    "shares",
    "wall street",
    "nasdaq",
    "dow jones",
    "s&p 500",
    "dax",
    "nikkei 225",
    "market rally",
    "market selloff",
    "traders",
    "investors",
    "benchmark index",
    "börse",
    "aktien",
    "aktienmarkt",
    "index",
    "börsen",
  ];

  const technologyKeywords = [
    "technology",
    "tech",
    "artificial intelligence",
    " ai ",
    "ai",
    "chip",
    "chips",
    "semiconductor",
    "software",
    "cyber",
    "cloud",
    "data center",
    "robotics",
    "smartphone",
    "internet",
    "platform",
    "technology sector",
    "ki",
    "halbleiter",
    "software",
    "cybersecurity",
  ];

  const scienceKeywords = [
    "science",
    "research",
    "scientist",
    "space",
    "laboratory",
    "physics",
    "astronomy",
    "study finds",
    "study shows",
    "wissenschaft",
    "forschung",
    "studie",
    "weltraum",
  ];

  const healthKeywords = [
    "health",
    "medical",
    "medicine",
    "hospital",
    "disease",
    "vaccine",
    "drug",
    "pharma",
    "patient",
    "treatment",
    "virus",
    "gesundheit",
    "medizin",
    "krankheit",
    "impfstoff",
  ];

  const climateKeywords = [
    "climate",
    "emissions",
    "co2",
    "renewable",
    "solar",
    "wind power",
    "energy transition",
    "global warming",
    "fossil fuel",
    "carbon",
    "klima",
    "emission",
    "erneuerbar",
  ];

  return {
    Politics: extractKeywordScore(text, politicsKeywords),
    Economy: extractKeywordScore(text, economyKeywords),
    "Stock Markets": extractKeywordScore(text, stockMarketKeywords),
    Technology: extractKeywordScore(text, technologyKeywords),
    Science: extractKeywordScore(text, scienceKeywords),
    Health: extractKeywordScore(text, healthKeywords),
    Climate: extractKeywordScore(text, climateKeywords),
  };
}

function normalizeFeedCategory(sourceCategory: unknown): string {
  let raw = "";

  if (typeof sourceCategory === "string") {
    raw = sourceCategory;
  } else if (Array.isArray(sourceCategory)) {
    raw = sourceCategory
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "name" in item) {
          return String((item as { name?: unknown }).name ?? "");
        }
        return "";
      })
      .join(" ");
  } else if (
    sourceCategory &&
    typeof sourceCategory === "object" &&
    "name" in sourceCategory
  ) {
    raw = String((sourceCategory as { name?: unknown }).name ?? "");
  }

  const value = normalizeText(raw);

  if (
    value.includes("politics") ||
    value.includes("politic") ||
    value.includes("government") ||
    value.includes("world") ||
    value.includes("international") ||
    value.includes("ausland")
  ) {
    return "Politics";
  }

  if (
    value.includes("economy") ||
    value.includes("economic") ||
    value.includes("business") ||
    value.includes("macro") ||
    value.includes("wirtschaft") ||
    value.includes("konjunktur")
  ) {
    return "Economy";
  }

  if (
    value.includes("market") ||
    value.includes("markets") ||
    value.includes("stocks") ||
    value.includes("equities") ||
    value.includes("börse") ||
    value.includes("finanzen")
  ) {
    return "Stock Markets";
  }

  if (
    value.includes("technology") ||
    value.includes("tech") ||
    value.includes("ai") ||
    value.includes("software") ||
    value.includes("chip")
  ) {
    return "Technology";
  }

  if (
    value.includes("science") ||
    value.includes("research") ||
    value.includes("forschung") ||
    value.includes("wissenschaft")
  ) {
    return "Science";
  }

  if (
    value.includes("health") ||
    value.includes("medical") ||
    value.includes("medicine") ||
    value.includes("gesundheit")
  ) {
    return "Health";
  }

  if (
    value.includes("climate") ||
    value.includes("energy") ||
    value.includes("emissions") ||
    value.includes("klima")
  ) {
    return "Climate";
  }

  return "";
}

function chooseCategory(
  item: { categories?: string[]; title?: string; content?: string; contentSnippet?: string },
  fallback: string
): string {
  const feedCategory = normalizeFeedCategory(
    Array.isArray(item.categories) ? item.categories[0] : item.categories
  );

  if (feedCategory) {
    return feedCategory;
  }

  const text = [
    item.title ?? "",
    item.contentSnippet ?? "",
    item.content ?? "",
  ].join(" ");

  const scores = getCategoryScores(text);

  const orderedCategories: Array<keyof typeof scores> = [
    "Politics",
    "Economy",
    "Stock Markets",
    "Technology",
    "Science",
    "Health",
    "Climate",
  ];

  let bestCategory = fallback;
  let bestScore = 0;

  for (const category of orderedCategories) {
    const score = scores[category];

    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestScore > 0 ? bestCategory : fallback;
}

async function importBbcWorldFeed(): Promise<ImportedArticle[]> {
  const feedUrl = "https://feeds.bbci.co.uk/news/world/rss.xml";
  const feed = await parser.parseURL(feedUrl);

  return (feed.items ?? [])
    .filter((item) => isFresh(item.pubDate, 24))
    .slice(0, 12)
    .map((item, index) => ({
      externalId: item.guid ?? `bbc-world-${index}`,
      sourceSlug: "bbc",
      sourceName: "BBC",
      title: item.title ?? "Untitled",
      url: item.link ?? "https://www.bbc.com",
      publicationDate: item.pubDate
        ? new Date(item.pubDate).toISOString()
        : new Date().toISOString(),
      language: "en",
      region: "Global",
      category: chooseCategory(item, "Politics"),
      content:
        item.contentSnippet ??
        item.content ??
        item.title ??
        "No content available.",
      summary: item.contentSnippet ?? undefined,
      trustScore: 92,
    }));
}

async function importNytBusinessFeed(): Promise<ImportedArticle[]> {
  const feedUrl = "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml";
  const feed = await parser.parseURL(feedUrl);

  return (feed.items ?? [])
    .filter((item) => isFresh(item.pubDate, 24))
    .slice(0, 12)
    .map((item, index) => ({
      externalId: item.guid ?? `nyt-business-${index}`,
      sourceSlug: "nyt",
      sourceName: "New York Times",
      title: item.title ?? "Untitled",
      url: item.link ?? "https://www.nytimes.com",
      publicationDate: item.pubDate
        ? new Date(item.pubDate).toISOString()
        : new Date().toISOString(),
      language: "en",
      region: "North America",
      category: chooseCategory(item, "Economy"),
      content:
        item.contentSnippet ??
        item.content ??
        item.title ??
        "No content available.",
      summary: item.contentSnippet ?? undefined,
      trustScore: 93,
    }));
}

async function importCnbcWorldFeed(): Promise<ImportedArticle[]> {
  const feedUrl = "https://www.cnbc.com/id/100727362/device/rss/rss.html";
  const feed = await parser.parseURL(feedUrl);

  return (feed.items ?? [])
    .filter((item) => isFresh(item.pubDate, 24))
    .slice(0, 12)
    .map((item, index) => ({
      externalId: item.guid ?? `cnbc-world-${index}`,
      sourceSlug: "cnbc",
      sourceName: "CNBC",
      title: item.title ?? "Untitled",
      url: item.link ?? "https://www.cnbc.com",
      publicationDate: item.pubDate
        ? new Date(item.pubDate).toISOString()
        : new Date().toISOString(),
      language: "en",
      region: "Global",
      category: chooseCategory(item, "Stock Markets"),
      content:
        item.contentSnippet ??
        item.content ??
        item.title ??
        "No content available.",
      summary: item.contentSnippet ?? undefined,
      trustScore: 91,
    }));
}

async function importCnnFeeds(): Promise<ImportedArticle[]> {
  const feedConfigs = [
    {
      url: "http://rss.cnn.com/rss/edition.rss",
      fallbackCategory: "Politics",
      region: "Global",
    },
    {
      url: "http://rss.cnn.com/rss/money_latest.rss",
      fallbackCategory: "Economy",
      region: "North America",
    },
    {
      url: "http://rss.cnn.com/rss/edition_technology.rss",
      fallbackCategory: "Technology",
      region: "Global",
    },
  ];

  const results = await Promise.allSettled(
    feedConfigs.map(async (config) => {
      const feed = await parser.parseURL(config.url);

      return (feed.items ?? [])
        .filter((item) => isFresh(item.pubDate, 24))
        .slice(0, 8)
        .map((item, index) => ({
          externalId: item.guid ?? `cnn-${config.fallbackCategory}-${index}`,
          sourceSlug: "cnn",
          sourceName: "CNN",
          title: item.title ?? "Untitled",
          url: item.link ?? "https://www.cnn.com",
          publicationDate: item.pubDate
            ? new Date(item.pubDate).toISOString()
            : new Date().toISOString(),
          language: "en",
          region: config.region,
          category: chooseCategory(item, config.fallbackCategory),
          content:
            item.contentSnippet ??
            item.content ??
            item.title ??
            "No content available.",
          summary: item.contentSnippet ?? undefined,
          trustScore: 89,
        }));
    })
  );

  return results.flatMap((result) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    return [];
  });
}

async function importNikkeiAsiaFeeds(): Promise<ImportedArticle[]> {
  const feedConfigs = [
    {
      url: "https://asia.nikkei.com/rss/feed/nar",
      fallbackCategory: "Politics",
      region: "Asia",
    },
    {
      url: "https://asia.nikkei.com/rss/feed/business",
      fallbackCategory: "Economy",
      region: "Asia",
    },
    {
      url: "https://asia.nikkei.com/rss/feed/markets",
      fallbackCategory: "Stock Markets",
      region: "Asia",
    },
    {
      url: "https://asia.nikkei.com/rss/feed/tech-science",
      fallbackCategory: "Technology",
      region: "Asia",
    },
  ];

  const results = await Promise.allSettled(
    feedConfigs.map(async (config) => {
      const feed = await parser.parseURL(config.url);

      return (feed.items ?? [])
        .filter((item) => isFresh(item.pubDate, 24))
        .slice(0, 8)
        .map((item, index) => ({
          externalId: item.guid ?? `nikkei-${config.fallbackCategory}-${index}`,
          sourceSlug: "nikkei-asia",
          sourceName: "Nikkei Asia",
          title: item.title ?? "Untitled",
          url: item.link ?? "https://asia.nikkei.com",
          publicationDate: item.pubDate
            ? new Date(item.pubDate).toISOString()
            : new Date().toISOString(),
          language: "en",
          region: config.region,
          category: chooseCategory(item, config.fallbackCategory),
          content:
            item.contentSnippet ??
            item.content ??
            item.title ??
            "No content available.",
          summary: item.contentSnippet ?? undefined,
          trustScore: 90,
        }));
    })
  );

  return results.flatMap((result) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    return [];
  });
}

async function importTagesschauFeeds(): Promise<ImportedArticle[]> {
  const feedConfigs = [
    {
      url: "https://www.tagesschau.de/ausland/index~rss2.xml",
      fallbackCategory: "Politics",
      region: "Global",
    },
    {
      url: "https://www.tagesschau.de/ausland/europa/index~rss2.xml",
      fallbackCategory: "Politics",
      region: "Europe",
    },
    {
      url: "https://www.tagesschau.de/wirtschaft/index~rss2.xml",
      fallbackCategory: "Economy",
      region: "Europe",
    },
    {
      url: "https://www.tagesschau.de/wirtschaft/finanzen/index~rss2.xml",
      fallbackCategory: "Stock Markets",
      region: "Europe",
    },
    {
      url: "https://www.tagesschau.de/wirtschaft/unternehmen/index~rss2.xml",
      fallbackCategory: "Economy",
      region: "Europe",
    },
    {
      url: "https://www.tagesschau.de/wirtschaft/konjunktur/index~rss2.xml",
      fallbackCategory: "Economy",
      region: "Europe",
    },
    {
      url: "https://www.tagesschau.de/wissen/gesundheit/index~rss2.xml",
      fallbackCategory: "Health",
      region: "Europe",
    },
    {
      url: "https://www.tagesschau.de/wissen/klima/index~rss2.xml",
      fallbackCategory: "Climate",
      region: "Europe",
    },
    {
      url: "https://www.tagesschau.de/wissen/forschung/index~rss2.xml",
      fallbackCategory: "Science",
      region: "Europe",
    },
    {
      url: "https://www.tagesschau.de/wissen/technologie/index~rss2.xml",
      fallbackCategory: "Technology",
      region: "Europe",
    },
  ];

  const results = await Promise.allSettled(
    feedConfigs.map(async (config) => {
      const feed = await parser.parseURL(config.url);

      return (feed.items ?? [])
        .filter((item) => isFresh(item.pubDate, 24))
        .slice(0, 8)
        .map((item, index) => ({
          externalId:
            item.guid ?? `${config.fallbackCategory}-${index}-${config.url}`,
          sourceSlug: "tagesschau",
          sourceName: "Tagesschau",
          title: item.title ?? "Untitled",
          url: item.link ?? "https://www.tagesschau.de",
          publicationDate: item.pubDate
            ? new Date(item.pubDate).toISOString()
            : new Date().toISOString(),
          language: "de",
          region: config.region,
          category: chooseCategory(item, config.fallbackCategory),
          content:
            item.contentSnippet ??
            item.content ??
            item.title ??
            "No content available.",
          summary: item.contentSnippet ?? undefined,
          trustScore: 90,
        }));
    })
  );

  return results.flatMap((result) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    return [];
  });
}

async function main() {
  try {
    console.log("Seed importer file loaded");
    console.log("Starting article import...");

    const results = await Promise.allSettled([
      importBbcWorldFeed(),
      importNytBusinessFeed(),
      importCnbcWorldFeed(),
      importCnnFeeds(),
      importNikkeiAsiaFeeds(),
      importTagesschauFeeds(),
    ]);

    const successfulImports = results.flatMap((result) => {
      if (result.status === "fulfilled") {
        return result.value;
      }
      return [];
    });

    const failedImports = results.filter(
      (result) => result.status === "rejected"
    );

    if (failedImports.length > 0) {
      console.warn("Some feeds could not be imported:", failedImports.length);
      failedImports.forEach((result, index) => {
        if (result.status === "rejected") {
          console.warn(`Feed ${index + 1} failed:`, result.reason);
        }
      });
    }

    console.log("Fresh articles found:", successfulImports.length);

    const result = await ingestArticles(successfulImports);

    console.log("Import finished successfully.");
    console.log("Inserted:", result.inserted);
    console.log("Skipped duplicates:", result.skipped);
  } catch (error) {
    console.error("Import failed:", error);
    process.exit(1);
  }
}

main();