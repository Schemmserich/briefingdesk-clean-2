"use server";

import { getFilteredArticles } from "@/lib/db/queries";
import { generateCuratedBriefing } from "@/ai/flows/generate-curated-briefing";
import { buildFallbackBriefing } from "@/lib/fallbackBriefing";

type CachedBriefingEntry = {
  createdAt: number;
  payload: any;
};

const briefingCache = new Map<string, CachedBriefingEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000;

function buildCacheKey(input: any) {
  return JSON.stringify({
    language: input.language ?? "en",
    timeframe: input.timeframe ?? "24h",
    categories: [...(input.categories ?? [])].sort(),
    regions: [...(input.regions ?? [])].sort(),
    briefingType: input.briefingType ?? "Morning Briefing",
    includeMarketInsights: !!input.includeMarketInsights,
    includeChangeAnalysis: !!input.includeChangeAnalysis,
  });
}

function toPlainObject<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function buildSourceMeta(articles: any[]) {
  const sortedByDate = [...articles].sort((a, b) => {
    const aTime = new Date(a.publicationDate).getTime();
    const bTime = new Date(b.publicationDate).getTime();
    return aTime - bTime;
  });

  const sourceWindowStart = sortedByDate[0]?.publicationDate ?? null;
  const sourceWindowEnd =
    sortedByDate[sortedByDate.length - 1]?.publicationDate ?? null;

  const sourceNames = new Set(
    articles.map((article) => article.sourceName).filter(Boolean)
  );

  const usedSources = articles.map((article) => ({
    id: article.id,
    sourceName: article.sourceName,
    title: article.title,
    url: article.url,
    publicationDate: article.publicationDate,
    category: article.category,
    region: article.region,
  }));

  return {
    articleCount: articles.length,
    sourceCount: sourceNames.size,
    sourceWindowStart,
    sourceWindowEnd,
    usedSources,
  };
}

export async function generateCuratedBriefingAction(input: any) {
  try {
    const cacheKey = buildCacheKey(input);
    const cached = briefingCache.get(cacheKey);

    if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
      return {
        success: true,
        data: {
          ...cached.payload,
          debugVersion: "ACTION_V3_CACHE",
        },
        error: null,
      };
    }

    const filteredArticles = await getFilteredArticles({
      timeframe: input.timeframe ?? "24h",
      categories: input.categories ?? [],
      regions: input.regions ?? [],
    });

    const maxPerSource = 4;
    const selected: any[] = [];
    const sourceCounter = new Map<string, number>();

    for (const article of filteredArticles) {
      const sourceName = article.sourceName ?? "Unknown Source";
      const currentCount = sourceCounter.get(sourceName) ?? 0;

      if (currentCount >= maxPerSource) {
        continue;
      }

      selected.push(article);
      sourceCounter.set(sourceName, currentCount + 1);
    }

    const articlesForBriefing = selected.slice(0, 8);

    console.log("ACTION FILTERED ARTICLES:", articlesForBriefing.length);
    console.log(
      "ACTION FILTERED TITLES:",
      articlesForBriefing.map((a) => ({
        title: a.title,
        publicationDate: a.publicationDate,
        sourceName: a.sourceName,
      }))
    );

    if (!articlesForBriefing.length) {
      return {
        success: false,
        data: null,
        error:
          input.language === "de"
            ? "Für die gewählten Filter und das gewählte Zeitfenster wurden keine passenden Artikel gefunden. Bitte erweitere das Zeitfenster oder passe die Kategorien und Regionen an."
            : "No matching articles were found for the selected filters and timeframe. Please widen the timeframe or adjust categories and regions.",
      };
    }

    const sourceMeta = buildSourceMeta(articlesForBriefing);

    try {
      const result = await generateCuratedBriefing({
        ...input,
        articles: articlesForBriefing,
      });

      const finalResult = {
        ...toPlainObject(result),
        ...sourceMeta,
        debugVersion: "ACTION_V3_LIVE",
      };

      briefingCache.set(cacheKey, {
        createdAt: Date.now(),
        payload: finalResult,
      });

      console.log("ACTION RETURNING AI RESULT:", finalResult);

      return {
        success: true,
        data: finalResult,
        error: null,
      };
    } catch (aiError: any) {
      console.error("AI briefing failed, using fallback briefing:", aiError);

      const fallbackResult = buildFallbackBriefing(
        input,
        articlesForBriefing
      );

      const finalFallback = {
        ...fallbackResult,
        ...sourceMeta,
        debugVersion: "ACTION_V3_FALLBACK",
      };

      briefingCache.set(cacheKey, {
        createdAt: Date.now(),
        payload: finalFallback,
      });

      console.log("ACTION RETURNING FALLBACK RESULT:", finalFallback);

      return {
        success: true,
        data: finalFallback,
        error: null,
      };
    }
  } catch (error: any) {
    console.error("Briefing Generation Error Detail:", error);

    return {
      success: false,
      data: null,
      error:
        error?.message ||
        "Unexpected error while generating the briefing.",
    };
  }
}