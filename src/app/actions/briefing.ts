"use server";

import { getFilteredArticles } from "@/lib/db/queries";
import { generateCuratedBriefing } from "@/ai/flows/generate-curated-briefing";
import { buildFallbackBriefing } from "@/lib/fallbackBriefing";
import { dedupBriefingArticles } from "@/lib/dedupBriefingArticles";

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

function localizeBriefingInput(input: any) {
  const categoryMap: Record<string, string> = {
    Politics: "Politik",
    Economy: "Wirtschaft",
    "Stock Markets": "Börse",
    Technology: "Technologie",
    Science: "Wissenschaft",
    Health: "Gesundheit",
    Climate: "Klima",
  };

  const regionMap: Record<string, string> = {
    Global: "Global",
    Europe: "Europa",
    "North America": "Nordamerika",
    Asia: "Asien",
    "ME&A": "Nahost, Afrika",
  };

  if (input.language !== "de") {
    return input;
  }

  return {
    ...input,
    categories: (input.categories ?? []).map((cat: string) => categoryMap[cat] ?? cat),
    regions: (input.regions ?? []).map((reg: string) => regionMap[reg] ?? reg),
  };
}

function limitPerSource(articles: any[], maxPerSource: number) {
  const selected: any[] = [];
  const sourceCounter = new Map<string, number>();

  for (const article of articles) {
    const sourceName = article.sourceName ?? "Unknown Source";
    const currentCount = sourceCounter.get(sourceName) ?? 0;

    if (currentCount >= maxPerSource) {
      continue;
    }

    selected.push(article);
    sourceCounter.set(sourceName, currentCount + 1);
  }

  return selected;
}

export async function generateCuratedBriefingAction(input: any) {
  try {
    const filteredArticles = await getFilteredArticles({
      timeframe: input.timeframe ?? "24h",
      categories: input.categories ?? [],
      regions: input.regions ?? [],
    });

    console.log("ACTION FILTERED ARTICLES RAW:", filteredArticles.length);

    const perSourceLimited = limitPerSource(filteredArticles, 4);
    console.log("ACTION AFTER SOURCE LIMIT:", perSourceLimited.length);

    const dedupedArticles = dedupBriefingArticles(perSourceLimited);
    console.log("ACTION AFTER DEDUPE:", dedupedArticles.length);

    const articlesForBriefing = dedupedArticles.slice(0, 10);

    console.log(
      "ACTION FINAL TITLES:",
      articlesForBriefing.map((a) => ({
        title: a.title,
        publicationDate: a.publicationDate,
        sourceName: a.sourceName,
        category: a.category,
        region: a.region,
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
      const localizedInput = localizeBriefingInput(input);

      const result = await generateCuratedBriefing({
        ...localizedInput,
        articles: articlesForBriefing,
      });

      const finalResult = {
        ...toPlainObject(result),
        ...sourceMeta,
        debugVersion: "ACTION_V3_LIVE_DEDUPED",
      };

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
        debugVersion: "ACTION_V3_FALLBACK_DEDUPED",
      };

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