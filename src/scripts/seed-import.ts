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

function normalizeCategory(sourceCategory: unknown, fallback: string): string {
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

  const value = raw.toLowerCase();

  if (
    value.includes("politics") ||
    value.includes("politic") ||
    value.includes("government") ||
    value.includes("election") ||
    value.includes("world") ||
    value.includes("international") ||
    value.includes("war") ||
    value.includes("conflict") ||
    value.includes("diplom") ||
    value.includes("ausland") ||
    value.includes("europa")
  ) {
    return "Politics";
  }

  if (
    value.includes("economy") ||
    value.includes("economic") ||
    value.includes("business") ||
    value.includes("macro") ||
    value.includes("inflation") ||
    value.includes("rates") ||
    value.includes("gdp") ||
    value.includes("wirtschaft") ||
    value.includes("konjunktur")
  ) {
    return "Economy";
  }

  if (
    value.includes("market") ||
    value.includes("markets") ||
    value.includes("stock") ||
    value.includes("stocks") ||
    value.includes("equities") ||
    value.includes("börse") ||
    value.includes("finanzen")
  ) {
    return "Stock Markets";
  }

  if (
    value.includes("tech") ||
    value.includes("technology") ||
    value.includes("ai") ||
    value.includes("artificial intelligence") ||
    value.includes("software") ||
    value.includes("cyber") ||
    value.includes("chip") ||
    value.includes("semiconductor")
  ) {
    return "Technology";
  }

  if (
    value.includes("science") ||
    value.includes("research") ||
    value.includes("space") ||
    value.includes("forschung") ||
    value.includes("wissenschaft")
  ) {
    return "Science";
  }

  if (
    value.includes("health") ||
    value.includes("medical") ||
    value.includes("medicine") ||
    value.includes("hospital") ||
    value.includes("disease") ||
    value.includes("gesundheit")
  ) {
    return "Health";
  }

  if (
    value.includes("climate") ||
    value.includes("energy") ||
    value.includes("emissions") ||
    value.includes("co2") ||
    value.includes("klima")
  ) {
    return "Climate";
  }

  return fallback;
}

function normalizeCategoryFromText(text: string, fallback: string): string {
  const value = text.toLowerCase();

  if (
    value.includes("president") ||
    value.includes("minister") ||
    value.includes("government") ||
    value.includes("parliament") ||
    value.includes("election") ||
    value.includes("ukraine") ||
    value.includes("iran") ||
    value.includes("china") ||
    value.includes("taiwan") ||
    value.includes("sanction") ||
    value.includes("ceasefire") ||
    value.includes("diplomatic") ||
    value.includes("geopolitical")
  ) {
    return "Politics";
  }

  if (
    value.includes("inflation") ||
    value.includes("economy") ||
    value.includes("economic") ||
    value.includes("interest rate") ||
    value.includes("central bank") ||
    value.includes("gdp") ||
    value.includes("exports") ||
    value.includes("imports") ||
    value.includes("consumer") ||
    value.includes("employment")
  ) {
    return "Economy";
  }

  if (
    value.includes("stocks") ||
    value.includes("stock market") ||
    value.includes("equities") ||
    value.includes("shares") ||
    value.includes("wall street") ||
    value.includes("nasdaq") ||
    value.includes("s&p") ||
    value.includes("dow jones") ||
    value.includes("dax") ||
    value.includes("market rally")
  ) {
    return "Stock Markets";
  }

  if (
    value.includes("technology") ||
    value.includes("tech") ||
    value.includes("artificial intelligence") ||
    value.includes("ai ") ||
    value.includes(" ai") ||
    value.includes("chip") ||
    value.includes("semiconductor") ||
    value.includes("software") ||
    value.includes("cyber")
  ) {
    return "Technology";
  }

  if (
    value.includes("science") ||
    value.includes("research") ||
    value.includes("scientist") ||
    value.includes("space")
  ) {
    return "Science";
  }

  if (
    value.includes("health") ||
    value.includes("medical") ||
    value.includes("medicine") ||
    value.includes("hospital") ||
    value.includes("disease") ||
    value.includes("vaccine")
  ) {
    return "Health";
  }

  if (
    value.includes("climate") ||
    value.includes("emissions") ||
    value.includes("energy transition") ||
    value.includes("renewable") ||
    value.includes("global warming")
  ) {
    return "Climate";
  }

  return fallback;
}

function chooseCategory(
  item: { categories?: string[]; title?: string; content?: string; contentSnippet?: string },
  fallback: string
): string {
  const categoryFromFeed = normalizeCategory(
    Array.isArray(item.categories) ? item.categories[0] : item.categories,
    ""
  );

  if (categoryFromFeed) {
    return categoryFromFeed;
  }

  const text = [
    item.title ?? "",
    item.contentSnippet ?? "",
    item.content ?? "",
  ].join(" ");

  return normalizeCategoryFromText(text, fallback);
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