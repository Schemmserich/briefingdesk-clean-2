export type Language = 'en' | 'de';

export type BriefingType = 'Ultra Short Update' | 'Short Update' | 'Morning Briefing' | 'Executive Summary';

export interface User {
  id: string;
  email: string;
  name: string;
  preferredLanguage: Language;
}

export interface UserPreset {
  id: string;
  name: string;
  language: Language;
  timeframe: string;
  categories: string[];
  regions: string[];
  briefingType: BriefingType;
  includeMarketInsights: boolean;
  includeChangeAnalysis: boolean;
  isDefault?: boolean;
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
  mode: 'metadata-only' | 'normal';
}

export interface Article {
  id: string;
  title: string;
  sourceName: string;
  publicationDate: string;
  region: string;
  category: string;
  url: string;
  content: string;
  summary?: string;
  sentiment?: 'positive' | 'negative' | 'neutral' | 'mixed';
  trustScore?: number;
  canonicalHash?: string;
}

export interface BriefingRequest {
  language: Language;
  timeframe: string;
  categories: string[];
  regions: string[];
  briefingType: BriefingType;
  includeMarketInsights: boolean;
  includeChangeAnalysis: boolean;
}

export interface EventCluster {
  title: string;
  summary: string;
  supportingSources: Array<{
    title: string;
    url: string;
    sourceName: string;
    publicationDate: string;
  }>;
}

export interface BriefingResult {
  id: string;
  timestamp: string;
  request: BriefingRequest;
  mainTitle: string;
  overviewParagraph: string;
  confidenceScore: number;
  sections?: Array<{
    title: string;
    content: string;
  }>;
  eventClusters?: EventCluster[];
  whyMarketsCare?: string;
  whatChanged?: string;
}
