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