"use server";

import { generateCuratedBriefing, GenerateCuratedBriefingInput } from "@/ai/flows/generate-curated-briefing";
import { MOCK_ARTICLES } from "@/lib/mock-data";
import { BriefingRequest } from "@/lib/types";

export async function generateCuratedBriefingAction(params: BriefingRequest) {
  // Instead of strict pre-filtering, we pass all relevant enabled articles
  // and let the AI perform the final categorization and region matching
  // This ensures that "all sources" are considered even if metadata is slightly off.
  const flowArticles = MOCK_ARTICLES.map(art => ({
    id: art.id,
    title: art.title,
    url: art.url,
    publicationDate: art.publicationDate,
    sourceName: art.sourceName,
    region: art.region,
    category: art.category,
    content: art.content,
    trustScore: art.trustScore || 80
  }));

  const input: GenerateCuratedBriefingInput = {
    language: params.language as 'en' | 'de',
    timeframe: params.timeframe,
    categories: params.categories,
    regions: params.regions,
    articles: flowArticles,
    briefingType: params.briefingType as any,
    includeMarketInsights: params.includeMarketInsights,
    includeChangeAnalysis: params.includeChangeAnalysis,
  };

  try {
    const result = await generateCuratedBriefing(input);
    return {
      ...result,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      request: params,
    };
  } catch (error) {
    console.error("Briefing Generation Error:", error);
    throw new Error("Failed to generate briefing result.");
  }
}
