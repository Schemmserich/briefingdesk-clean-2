"use server";

import { generateCuratedBriefing } from "@/ai/flows/generate-curated-briefing";
import { MOCK_ARTICLES } from "@/lib/mock-data";
import { BriefingRequest } from "@/lib/types";

export async function generateCuratedBriefingAction(params: BriefingRequest) {
  // Pass relevant articles to the AI
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

  const input = {
    language: params.language,
    timeframe: params.timeframe,
    categories: params.categories,
    regions: params.regions,
    articles: flowArticles,
    briefingType: params.briefingType,
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
  } catch (error: any) {
    console.error("Briefing Generation Error Detail:", error);
    // Provide a more descriptive error if possible
    throw new Error(`Briefing generation failed: ${error.message || "Unknown error"}`);
  }
}
