"use server";

import { generateCuratedBriefing } from "@/ai/flows/generate-curated-briefing";
import { buildFallbackBriefing } from "@/lib/fallbackBriefing";
import { improveBriefingQuality } from "@/lib/briefingQuality";
import { dedupBriefingArticles } from "@/lib/dedupBriefingArticles";
import { getFilteredArticles } from "@/lib/db/queries";
import { requireApprovedTesterAccount } from "@/lib/serverAccess";
import type { BriefingRequest, BriefingResult, BriefingType } from "@/lib/types";

const ARTICLE_TARGETS: Record<BriefingType, number> = {
  "Ultra Short Update": 4,
  "Short Update": 6,
  "Morning Briefing": 10,
  "Executive Summary": 12,
};

function toPlainObject<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function buildSourceMeta(articles: any[]) {
  const sortedByDate = [...articles].sort(
    (a, b) =>
      new Date(a.publicationDate).getTime() -
      new Date(b.publicationDate).getTime()
  );

  const sourceNames = new Set(
    articles.map((article) => article.sourceName).filter(Boolean)
  );

  return {
    articleCount: articles.length,
    sourceCount: sourceNames.size,
    sourceWindowStart: sortedByDate[0]?.publicationDate ?? null,
    sourceWindowEnd:
      sortedByDate[sortedByDate.length - 1]?.publicationDate ?? null,
    usedSources: articles.map((article) => ({
      id: article.id,
      sourceName: article.sourceName,
      title: article.title,
      url: article.url,
      publicationDate: article.publicationDate,
      category: article.category,
      region: article.region,
      trustScore: article.trustScore,
    })),
  };
}

function localizeBriefingInput(input: BriefingRequest): BriefingRequest {
  if (input.language !== "de") return input;

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

  return {
    ...input,
    categories: input.categories.map((value) => categoryMap[value] ?? value),
    regions: input.regions.map((value) => regionMap[value] ?? value),
  };
}

function prepareArticleForAi(article: any) {
  return {
    ...article,
    title: String(article.title ?? "").trim(),
    summary: String(article.summary ?? "").trim().slice(0, 900),
    content: String(article.content ?? "").trim().slice(0, 3_500),
  };
}

function selectDiverseArticles(articles: any[], targetCount: number) {
  const selected: any[] = [];
  const selectedIds = new Set<string>();
  const sourceCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();

  const add = (article: any) => {
    const key = String(article.id ?? article.url ?? article.title);
    if (selectedIds.has(key)) return false;

    selected.push(article);
    selectedIds.add(key);

    const source = String(article.sourceName ?? "Unknown Source");
    const category = String(article.category ?? "General");
    sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
    categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    return true;
  };

  const passes = [
    { maxPerSource: 1, maxPerCategory: 1 },
    { maxPerSource: 2, maxPerCategory: 3 },
    { maxPerSource: 3, maxPerCategory: Number.POSITIVE_INFINITY },
  ];

  for (const pass of passes) {
    for (const article of articles) {
      if (selected.length >= targetCount) break;

      const source = String(article.sourceName ?? "Unknown Source");
      const category = String(article.category ?? "General");

      if ((sourceCounts.get(source) ?? 0) >= pass.maxPerSource) continue;
      if ((categoryCounts.get(category) ?? 0) >= pass.maxPerCategory) continue;

      add(article);
    }

    if (selected.length >= targetCount) break;
  }

  return selected.slice(0, targetCount).map(prepareArticleForAi);
}

function validateRequest(input: BriefingRequest) {
  const allowedTypes = new Set<BriefingType>([
    "Ultra Short Update",
    "Short Update",
    "Morning Briefing",
    "Executive Summary",
  ]);

  return (
    (input.language === "de" || input.language === "en") &&
    allowedTypes.has(input.briefingType) &&
    Boolean(input.timeframe) &&
    Array.isArray(input.categories) &&
    input.categories.length > 0 &&
    Array.isArray(input.regions) &&
    input.regions.length > 0
  );
}

export async function generateCuratedBriefingAction(input: BriefingRequest) {
  try {
    await requireApprovedTesterAccount();

    if (!validateRequest(input)) {
      return {
        success: false,
        data: null,
        error:
          input.language === "en"
            ? "The briefing settings are incomplete or invalid."
            : "Die Briefing-Einstellungen sind unvollständig oder ungültig.",
      };
    }

    const filteredArticles = await getFilteredArticles({
      timeframe: input.timeframe,
      categories: input.categories,
      regions: input.regions,
    });

    const dedupedArticles = dedupBriefingArticles(filteredArticles);
    const targetCount = ARTICLE_TARGETS[input.briefingType];
    const articlesForBriefing = selectDiverseArticles(
      dedupedArticles,
      targetCount
    );

    if (!articlesForBriefing.length) {
      return {
        success: false,
        data: null,
        error:
          input.language === "de"
            ? "Für die gewählten Filter und das Zeitfenster wurden keine passenden Artikel gefunden. Bitte erweitere das Zeitfenster oder passe Kategorien und Regionen an."
            : "No matching articles were found. Please widen the timeframe or adjust categories and regions.",
      };
    }

    const sourceMeta = buildSourceMeta(articlesForBriefing);
    let rawResult: BriefingResult;
    let generationMode: "ai" | "fallback" = "ai";

    try {
      const localizedInput = localizeBriefingInput(input);
      rawResult = await generateCuratedBriefing({
        ...localizedInput,
        articles: articlesForBriefing,
      });
    } catch (aiError) {
      console.error("AI briefing failed; using deterministic fallback:", aiError);
      generationMode = "fallback";
      rawResult = buildFallbackBriefing(input, articlesForBriefing);
    }

    const improvedResult = improveBriefingQuality(
      toPlainObject(rawResult),
      input.briefingType,
      {
        includeMarketInsights: input.includeMarketInsights,
        includeChangeAnalysis: input.includeChangeAnalysis,
      }
    );

    return {
      success: true,
      data: {
        ...improvedResult,
        ...sourceMeta,
        debugVersion: `QUALITY_V4_${generationMode.toUpperCase()}`,
      },
      error: null,
    };
  } catch (error: any) {
    console.error("Briefing generation failed:", error);

    const isAccessError =
      error?.message === "ACCESS_NOT_APPROVED" ||
      error?.message === "ADMIN_ACCESS_DENIED";

    return {
      success: false,
      data: null,
      error: isAccessError
        ? input?.language === "en"
          ? "Your access could not be verified. Please reload the app and sign in again."
          : "Dein Zugang konnte nicht verifiziert werden. Bitte lade die App neu und melde dich erneut an."
        : input?.language === "en"
          ? "The briefing could not be generated due to a temporary technical error."
          : "Das Briefing konnte wegen eines vorübergehenden technischen Fehlers nicht erstellt werden.",
    };
  }
}
