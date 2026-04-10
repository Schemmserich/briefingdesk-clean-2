import { Article, SourceConfig, UserPreset } from './types';

// Helper to get ISO string for "N hours ago"
const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString();

export const MOCK_SOURCES: SourceConfig[] = [
  { id: '1', name: 'The Guardian', baseUrl: 'https://theguardian.com', region: 'Global', category: 'General', isEnabled: true, isPremium: false, trustScore: 85, mode: 'normal' },
  { id: '2', name: 'New York Times', baseUrl: 'https://nytimes.com', region: 'North America', category: 'General', isEnabled: true, isPremium: true, trustScore: 92, mode: 'normal' },
  { id: '3', name: 'BBC News', baseUrl: 'https://bbc.com', region: 'Europe', category: 'General', isEnabled: true, isPremium: false, trustScore: 90, mode: 'normal' },
  { id: '4', name: 'ZDF heute', baseUrl: 'https://zdf.de', region: 'Europe', category: 'General', isEnabled: true, isPremium: false, trustScore: 88, mode: 'normal' },
  { id: '5', name: 'CNN', baseUrl: 'https://cnn.com', region: 'North America', category: 'Politics', isEnabled: true, isPremium: false, trustScore: 75, mode: 'normal' },
  { id: '6', name: 'Financial Times', baseUrl: 'https://ft.com', region: 'Global', category: 'Economy', isEnabled: true, isPremium: true, trustScore: 95, mode: 'metadata-only' },
  { id: '7', name: 'CNBC', baseUrl: 'https://cnbc.com', region: 'North America', category: 'Stock Markets', isEnabled: true, isPremium: false, trustScore: 82, mode: 'normal' },
  { id: '8', name: 'Handelsblatt', baseUrl: 'https://handelsblatt.com', region: 'Europe', category: 'Economy', isEnabled: true, isPremium: true, trustScore: 91, mode: 'normal' },
  { id: '9', name: 'Frankfurter Allgemeine', baseUrl: 'https://faz.net', region: 'Europe', category: 'Politics', isEnabled: true, isPremium: false, trustScore: 89, mode: 'normal' },
];

export const MOCK_ARTICLES: Article[] = [
  {
    id: 'art-1',
    title: 'Global Markets Rally on Tech Earnings',
    sourceName: 'The Guardian',
    publicationDate: hoursAgo(0.5),
    region: 'Global',
    category: 'Stock Markets',
    url: 'https://example.com/art1',
    content: 'Stock markets across the globe reached record highs today as major tech companies reported stronger-than-expected quarterly earnings. Investors are optimistic about AI-driven growth.',
    trustScore: 85
  },
  {
    id: 'art-2',
    title: 'Fed Signals Potential Rate Cut in Q3',
    sourceName: 'New York Times',
    publicationDate: hoursAgo(1.5),
    region: 'North America',
    category: 'Economy',
    url: 'https://example.com/art2',
    content: 'The Federal Reserve indicated today that it may begin cutting interest rates as early as the third quarter, citing easing inflation pressures and a cooling labor market.',
    trustScore: 92
  },
  {
    id: 'art-c1',
    title: 'S&P 500 hits new intraday record',
    sourceName: 'CNBC',
    publicationDate: hoursAgo(0.7),
    region: 'North America',
    category: 'Stock Markets',
    url: 'https://example.com/cnbc1',
    content: 'The S&P 500 rose on Wednesday to hit a new all-time intraday high as the latest batch of corporate earnings fueled the ongoing stock market rally.',
    trustScore: 82
  },
  {
    id: 'art-h1',
    title: 'Deutscher Export überrascht mit deutlichem Plus',
    sourceName: 'Handelsblatt',
    publicationDate: hoursAgo(2.5),
    region: 'Europe',
    category: 'Economy',
    url: 'https://example.com/hb1',
    content: 'Trotz globaler Unsicherheiten konnten die deutschen Exporteure im vergangenen Monat deutlich zulegen. Vor allem das Geschäft mit China und den USA zog kräftig an.',
    trustScore: 91
  },
  {
    id: 'art-f1',
    title: 'Regierung einigt sich auf neuen Klimaplan',
    sourceName: 'Frankfurter Allgemeine',
    publicationDate: hoursAgo(3.2),
    region: 'Europe',
    category: 'Politics',
    url: 'https://example.com/faz1',
    content: 'Nach wochenlangen Verhandlungen hat die Bundesregierung einen Kompromiss für das neue Klimaschutzgesetz gefunden. Ziel ist eine beschleunigte Reduktion der Emissionen bis 2030.',
    trustScore: 89
  },
  {
    id: 'art-6',
    title: 'DAX erreicht Rekordhoch trotz Konjunktursorgen',
    sourceName: 'ZDF heute',
    publicationDate: hoursAgo(2),
    region: 'Europe',
    category: 'Stock Markets',
    url: 'https://example.com/art6',
    content: 'Der deutsche Leitindex DAX hat heute trotz anhaltender Sorgen um die Binnennachfrage ein neues Allzeithoch erreicht. Analysten führen dies auf die starken Exportzahlen der Automobilindustrie zurück.',
    trustScore: 88
  },
  {
    id: 'art-3',
    title: 'Quantum Computing Breakthrough at MIT',
    sourceName: 'Science Daily',
    publicationDate: hoursAgo(3),
    region: 'North America',
    category: 'Science',
    url: 'https://example.com/art3',
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
