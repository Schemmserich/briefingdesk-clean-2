export type Language = "en" | "de";

export type BriefingType =
  | "Ultra Short Update"
  | "Short Update"
  | "Morning Briefing"
  | "Executive Summary";

export interface BriefingRequest {
  language: Language;
  timeframe: string;
  categories: string[];
  regions: string[];
  briefingType: BriefingType;
  includeMarketInsights?: boolean;
  includeChangeAnalysis?: boolean;
}

export interface BriefingSection {
  title: string;
  content: string;
}

export interface UsedSource {
  id: string;
  title: string;
  url: string;
  publicationDate: string;
  sourceName: string;
  region: string;
  category: string;
  trustScore?: number;
}

export interface BriefingResult {
  mainTitle: string;
  overviewParagraph: string;
  briefingType: BriefingType;
  confidenceScore: number;
  sections?: BriefingSection[];
  whyMarketsCare?: string;
  whatChanged?: string;

  usedSources?: UsedSource[];
  sourceWindowStart?: string | null;
  sourceWindowEnd?: string | null;
  sourceCount?: number;
  articleCount?: number;
}
export interface SourceConfig {
  id: string;
  name: string;
  baseUrl: string;
  region: string;
  category: string;
  isEnabled: boolean;
  isPremium: boolean;
  trustScore: number;
  mode: "normal" | "metadata-only";
}
export interface Article {
  id: string;
  title: string;
  sourceId?: string;
  sourceName: string;
  publicationDate: string;
  region: string;
  category: string;
  url: string;
  content: string;
  summary?: string;
  sentiment?: "positive" | "negative" | "neutral" | "mixed";
  canonicalHash?: string;
  trustScore?: number;
}

export interface UserPreset {
  id: string;
  name: string;
  language: Language;
  timeframe: string;
  categories: string[];
  regions: string[];
  briefingType: BriefingType;
  includeMarketInsights?: boolean;
  includeChangeAnalysis?: boolean;
  isDefault?: boolean;
}