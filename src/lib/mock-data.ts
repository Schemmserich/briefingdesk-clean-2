import { Article, SourceConfig, UserPreset } from './types';

// Helfer, um ISO-Strings für "vor N Stunden" relativ zur aktuellen Zeit zu erhalten
const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString();

export const MOCK_SOURCES: SourceConfig[] = [
  { id: '1', name: 'The Guardian', baseUrl: 'https://theguardian.com', region: 'Global', category: 'General', isEnabled: true, isPremium: false, trustScore: 85, mode: 'normal' },
  { id: '2', name: 'New York Times', baseUrl: 'https://nytimes.com', region: 'North America', category: 'General', isEnabled: true, isPremium: true, trustScore: 92, mode: 'normal' },
  { id: '3', name: 'BBC News', baseUrl: 'https://bbc.com', region: 'Europe', category: 'General', isEnabled: true, isPremium: false, trustScore: 90, mode: 'normal' },
  { id: '4', name: 'ZDF heute', baseUrl: 'https://zdf.de', region: 'Europe', category: 'General', isEnabled: true, isPremium: false, trustScore: 88, mode: 'normal' },
  { id: '5', name: 'CNBC', baseUrl: 'https://cnbc.com', region: 'North America', category: 'Stock Markets', isEnabled: true, isPremium: false, trustScore: 84, mode: 'normal' },
  { id: '6', name: 'Financial Times', baseUrl: 'https://ft.com', region: 'Global', category: 'Economy', isEnabled: true, isPremium: true, trustScore: 95, mode: 'metadata-only' },
  { id: '7', name: 'Handelsblatt', baseUrl: 'https://handelsblatt.com', region: 'Europe', category: 'Economy', isEnabled: true, isPremium: true, trustScore: 91, mode: 'normal' },
  { id: '8', name: 'Frankfurter Allgemeine', baseUrl: 'https://faz.net', region: 'Europe', category: 'Politics', isEnabled: true, isPremium: false, trustScore: 89, mode: 'normal' },
  { id: '9', name: 'CNBC News', baseUrl: 'https://cnbc.com/news', region: 'Global', category: 'General', isEnabled: true, isPremium: false, trustScore: 85, mode: 'normal' },
];

export const MOCK_ARTICLES: Article[] = [
  {
    id: 'art-1',
    title: 'Global Markets Rally on Tech Earnings',
    sourceName: 'CNBC',
    publicationDate: hoursAgo(0.5),
    region: 'Global',
    category: 'Stock Markets',
    url: 'https://www.cnbc.com/markets',
    content: 'Stock markets across the globe reached record highs today as major tech companies reported stronger-than-expected quarterly earnings. Investors are optimistic about AI-driven growth.',
    trustScore: 84
  },
  {
    id: 'art-2',
    title: 'Fed Signals Potential Rate Cut in Q3',
    sourceName: 'New York Times',
    publicationDate: hoursAgo(1.5),
    region: 'North America',
    category: 'Economy',
    url: 'https://nytimes.com/business',
    content: 'The Federal Reserve indicated today that it may begin cutting interest rates as early as the third quarter, citing easing inflation pressures and a cooling labor market.',
    trustScore: 92
  },
  {
    id: 'art-h1',
    title: 'Deutscher Export überrascht mit deutlichem Plus',
    sourceName: 'Handelsblatt',
    publicationDate: hoursAgo(2),
    region: 'Europe',
    category: 'Economy',
    url: 'https://handelsblatt.com/export',
    content: 'Trotz globaler Unsicherheiten konnten die deutschen Exporteure im vergangenen Monat deutlich zulegen. Vor allem das Geschäft mit China und den USA zog kräftig an.',
    trustScore: 91
  },
  {
    id: 'art-f1',
    title: 'Regierung einigt sich auf neuen Klimaplan',
    sourceName: 'Frankfurter Allgemeine',
    publicationDate: hoursAgo(3),
    region: 'Europe',
    category: 'Politics',
    url: 'https://faz.net/politik',
    content: 'Nach wochenlangen Verhandlungen hat die Bundesregierung einen Kompromiss für das neue Klimaschutzgesetz gefunden. Ziel ist eine beschleunigte Reduktion der Emissionen bis 2030.',
    trustScore: 89
  },
  {
    id: 'art-3',
    title: 'Quantum Computing Breakthrough at MIT',
    sourceName: 'BBC News',
    publicationDate: hoursAgo(4),
    region: 'North America',
    category: 'Science',
    url: 'https://bbc.com/science',
    content: 'Researchers at MIT have achieved a new level of quantum coherence in a solid-state system, paving the way for more stable quantum bits and scalable processors.',
    trustScore: 90
  }
];

export const DEFAULT_PRESETS: UserPreset[] = [
  {
    id: 'preset-morning',
    name: 'Morning Preset',
    language: 'en',
    timeframe: '24h',
    categories: ['Politics', 'Economy', 'Stock Markets'],
    regions: ['Global', 'Europe'],
    briefingType: 'Morning Briefing',
    includeMarketInsights: true,
    includeChangeAnalysis: true,
    isDefault: true
  }
];
