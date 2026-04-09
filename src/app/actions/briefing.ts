"use server";

import { generateCuratedBriefing, GenerateCuratedBriefingInput } from "@/ai/flows/generate-curated-briefing";
import { MOCK_ARTICLES } from "@/lib/mock-data";
import { BriefingRequest, Article } from "@/lib/types";

export async function generateCuratedBriefingAction(params: BriefingRequest) {
  // Filter mock articles based on request parameters
  const filteredArticles = MOCK_ARTICLES.filter(art => {
    const regionMatch = params.regions.includes("Global") || params.regions.includes(art.region);
    const categoryMatch = params.categories.length === 0 || params.categories.includes(art.category);
    return regionMatch && categoryMatch;
  });

  // Prepare input for Genkit flow
  // Note: generateCuratedBriefing flow expects its specific Article model
  const flowArticles = filteredArticles.map(art => ({
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