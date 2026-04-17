'use server';

import { generateCuratedBriefing } from '@/ai/flows/generate-curated-briefing';
import { getFilteredArticles } from '@/lib/db/queries';
import { buildFallbackBriefing } from '@/lib/fallbackBriefing';

function buildSourceMeta(articles: any[]) {
  if (!articles.length) {
    return {
      usedSources: [],
      sourceWindowStart: null,
      sourceWindowEnd: null,
      sourceCount: 0,
      articleCount: 0,
    };
  }

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
    title: article.title,
    url: article.url,
    publicationDate: article.publicationDate,
    sourceName: article.sourceName,
    region: article.region,
    category: article.category,
    trustScore: article.trustScore,
  }));

  return {
    usedSources,
    sourceWindowStart,
    sourceWindowEnd,
    sourceCount: sourceNames.size,
    articleCount: articles.length,
  };
}

export async function generateCuratedBriefingAction(input: any) {
  try {
    const filteredArticles = await getFilteredArticles({
      timeframe: input.timeframe,
      categories: input.categories ?? [],
      regions: input.regions ?? [],
    });

    const articlesForBriefing = filteredArticles.slice(0, 15);

    if (articlesForBriefing.length === 0) {
      return {
        success: false,
        data: null,
        error:
          'Für die gewählten Filter und das gewählte Zeitfenster wurden keine passenden Artikel gefunden. Bitte erweitere das Zeitfenster oder passe die Kategorien und Regionen an.',
      };
    }

    const sourceMeta = buildSourceMeta(articlesForBriefing);

    try {
      const result = await generateCuratedBriefing({
        ...input,
        articles: articlesForBriefing,
      });

      return {
        success: true,
        data: {
          ...result,
          ...sourceMeta,
        },
        error: null,
      };
    } catch (aiError: any) {
      console.error('AI briefing failed, using fallback briefing:', aiError);

      const fallbackResult = buildFallbackBriefing(
        {
          language: input.language,
          timeframe: input.timeframe,
          briefingType: input.briefingType,
          includeMarketInsights: input.includeMarketInsights,
          includeChangeAnalysis: input.includeChangeAnalysis,
        },
        articlesForBriefing
      );

      return {
        success: true,
        data: {
          ...fallbackResult,
          ...sourceMeta,
        },
        error: null,
      };
    }
  } catch (error: any) {
    console.error('Briefing Generation Error Detail:', error);

    return {
      success: false,
      data: null,
      error:
        error?.message ||
        'The briefing could not be generated right now. Please try again shortly.',
    };
  }
}