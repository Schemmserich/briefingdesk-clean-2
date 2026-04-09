import { Article, SourceConfig, UserPreset } from './types';

export const MOCK_SOURCES: SourceConfig[] = [
  { id: '1', name: 'The Guardian', baseUrl: 'https://theguardian.com', region: 'Global', category: 'General', isEnabled: true, isPremium: false, trustScore: 85, mode: 'normal' },
  { id: '2', name: 'New York Times', baseUrl: 'https://nytimes.com', region: 'North America', category: 'General', isEnabled: true, isPremium: true, trustScore: 92, mode: 'normal' },
  { id: '3', name: 'BBC News', baseUrl: 'https://bbc.com', region: 'Europe', category: 'General', isEnabled: true, isPremium: false, trustScore: 90, mode: 'normal' },
  { id: '4', name: 'ZDF heute', baseUrl: 'https://zdf.de', region: 'Europe', category: 'General', isEnabled: true, isPremium: false, trustScore: 88, mode: 'normal' },
  { id: '5', name: 'CNN', baseUrl: 'https://cnn.com', region: 'North America', category: 'Politics', isEnabled: true, isPremium: false, trustScore: 75, mode: 'normal' },
  { id: '6', name: 'Financial Times', baseUrl: 'https://ft.com', region: 'Global', category: 'Economy', isEnabled: true, isPremium: true, trustScore: 95, mode: 'metadata-only' },
];

export const MOCK_ARTICLES: Article[] = [
  {
    id: 'art-1',
    title: 'Global Markets Rally on Tech Earnings',
    sourceName: 'The Guardian',
    publicationDate: new Date().toISOString(),
    region: 'Global',
    category: 'Economy',
    url: 'https://example.com/art1',
    content: 'Stock markets across the globe reached record highs today as major tech companies reported stronger-than-expected quarterly earnings. Investors are optimistic about AI-driven growth.',
    trustScore: 85
  },
  {
    id: 'art-2',
    title: 'Fed Signals Potential Rate Cut in Q3',
    sourceName: 'New York Times',
    publicationDate: new Date().toISOString(),
    region: 'North America',
    category: 'Economy',
    url: 'https://example.com/art2',
    content: 'The Federal Reserve indicated today that it may begin cutting interest rates as early as the third quarter, citing easing inflation pressures and a cooling labor market.',
    trustScore: 92
  },
  {
    id: 'art-3',
    title: 'European Union Proposes New Tech Regulation',
    sourceName: 'BBC News',
    publicationDate: new Date().toISOString(),
    region: 'Europe',
    category: 'Politics',
    url: 'https://example.com/art3',
    content: 'The EU Commission has unveiled a sweeping new framework for regulating generative AI models, focusing on transparency and ethical deployment across member states.',
    trustScore: 90
  },
  {
    id: 'art-4',
    title: 'Bundestag debates energy transition',
    sourceName: 'ZDF heute',
    publicationDate: new Date().toISOString(),
    region: 'Europe',
    category: 'Politics',
    url: 'https://example.com/art4',
    content: 'German lawmakers are meeting today to discuss the acceleration of the country\'s energy transition, with a focus on offshore wind and grid stability.',
    trustScore: 88
  },
  {
    id: 'art-5',
    title: 'Tech Giants See Green as Earnings Beat Estimates',
    sourceName: 'CNN',
    publicationDate: new Date().toISOString(),
    region: 'Global',
    category: 'Economy',
    url: 'https://example.com/art5',
    content: 'Market leaders in the technology sector are seeing massive gains today after reporting earnings that blew past analyst expectations. The focus remains on AI development.',
    trustScore: 75
  }
];

export const DEFAULT_PRESETS: UserPreset[] = [
  {
    id: 'preset-morning',
    name: 'Morning Preset',
    language: 'en',
    timeframe: 'today',
    categories: ['Politics', 'Economy'],
    regions: ['Global', 'Europe'],
    briefingType: 'Morning Briefing',
    includeMarketInsights: true,
    includeChangeAnalysis: true,
    isDefault: true
  }
];