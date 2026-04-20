type FallbackInput = {
  language?: 'de' | 'en';
  timeframe?: string;
  briefingType?: string;
  includeMarketInsights?: boolean;
  includeChangeAnalysis?: boolean;
};

type ArticleLike = {
  id?: string;
  title?: string;
  url?: string;
  publicationDate?: string;
  sourceName?: string;
  region?: string;
  category?: string;
  content?: string;
  summary?: string;
  canonicalHash?: string;
  trustScore?: number;
};

function timeframeLabel(timeframe?: string) {
  const mapping: Record<string, string> = {
    '2h': '2h',
    '4h': '4h',
    '8h': '8h',
    '12h': '12h',
    '24h': '24h',
  };

  const normalized = (timeframe ?? '24h').toLowerCase();
  return mapping[normalized] ?? normalized;
}

function safeText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function normalizeCategory(category: string) {
  const value = safeText(category);

  switch (value) {
    case 'Politics':
      return 'Politik';
    case 'Economy':
      return 'Wirtschaft';
    case 'Stock Markets':
      return 'Börse';
    case 'Technology':
      return 'Technologie';
    case 'Science':
      return 'Wissenschaft';
    case 'Health':
      return 'Gesundheit';
    case 'Climate':
      return 'Klima';
    default:
      return value || 'Allgemein';
  }
}

function averageTrust(articles: ArticleLike[]) {
  if (!articles.length) return 75;

  const values = articles
    .map((a) => Number(a.trustScore ?? 0))
    .filter((v) => Number.isFinite(v) && v > 0);

  if (!values.length) return 75;

  return Math.max(
    60,
    Math.min(98, Math.round(values.reduce((a, b) => a + b, 0) / values.length))
  );
}

function uniqueSources(articles: ArticleLike[]) {
  return Array.from(
    new Set(articles.map((a) => safeText(a.sourceName)).filter(Boolean))
  );
}

function sortByDateDesc(articles: ArticleLike[]) {
  return [...articles].sort((a, b) => {
    const aTime = new Date(a.publicationDate ?? 0).getTime();
    const bTime = new Date(b.publicationDate ?? 0).getTime();
    return bTime - aTime;
  });
}

function getTopCategories(articles: ArticleLike[], max = 3) {
  const counts = new Map<string, number>();

  for (const article of articles) {
    const category = normalizeCategory(article.category ?? '');
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([category]) => category);
}

function getTopRegions(articles: ArticleLike[], max = 3) {
  const counts = new Map<string, number>();

  for (const article of articles) {
    const region = safeText(article.region) || 'Global';
    counts.set(region, (counts.get(region) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([region]) => region);
}

function topTitles(articles: ArticleLike[], max = 3) {
  return sortByDateDesc(articles)
    .map((a) => safeText(a.title))
    .filter(Boolean)
    .slice(0, max);
}

function hasCategory(articles: ArticleLike[], category: string) {
  return articles.some(
    (article) => normalizeCategory(article.category ?? '') === category
  );
}

function hasRegion(articles: ArticleLike[], region: string) {
  return articles.some((article) => (safeText(article.region) || 'Global') === region);
}

function buildThemeSummaryDe(articles: ArticleLike[]) {
  const categories = getTopCategories(articles, 3);
  const regions = getTopRegions(articles, 3);

  const categoryText =
    categories.length > 0 ? categories.join(', ') : 'aktuelle Nachrichtenlagen';

  const regionText =
    regions.length > 0 ? regions.join(', ') : 'mehrere Weltregionen';

  return `Im Mittelpunkt stehen derzeit Entwicklungen in den Bereichen ${categoryText} mit besonderer Relevanz für ${regionText}.`;
}

function buildThemeSummaryEn(articles: ArticleLike[]) {
  const categories = getTopCategories(articles, 3);
  const regions = getTopRegions(articles, 3);

  const categoryText =
    categories.length > 0 ? categories.join(', ') : 'current developments';

  const regionText =
    regions.length > 0 ? regions.join(', ') : 'multiple regions';

  return `The current focus is on developments across ${categoryText}, with particular relevance for ${regionText}.`;
}

function buildNarrativeFocusDe(articles: ArticleLike[]) {
  const parts: string[] = [];

  if (hasCategory(articles, 'Politik')) {
    parts.push('geopolitische Spannungen und politische Richtungsentscheidungen');
  }

  if (hasCategory(articles, 'Wirtschaft')) {
    parts.push('wirtschaftspolitische und konjunkturrelevante Entwicklungen');
  }

  if (hasCategory(articles, 'Börse')) {
    parts.push('marktbewegende Unternehmens- und Börsenmeldungen');
  }

  if (hasCategory(articles, 'Technologie')) {
    parts.push('technologiebezogene Unternehmensnachrichten');
  }

  if (hasRegion(articles, 'Europe')) {
    parts.push('wichtige Impulse aus Europa');
  }

  if (hasRegion(articles, 'North America')) {
    parts.push('prägende Nachrichten aus Nordamerika');
  }

  if (!parts.length) {
    return 'Das Nachrichtenbild wird aktuell vor allem durch mehrere kurzzyklische politische und wirtschaftliche Entwicklungen geprägt.';
  }

  const unique = Array.from(new Set(parts)).slice(0, 4);

  return `Besonders prägend für das Zeitfenster sind ${unique.join(', ')}.`;
}

function buildNarrativeFocusEn(articles: ArticleLike[]) {
  const parts: string[] = [];

  if (hasCategory(articles, 'Politik')) {
    parts.push('geopolitical tensions and policy decisions');
  }

  if (hasCategory(articles, 'Wirtschaft')) {
    parts.push('economic and macro-relevant developments');
  }

  if (hasCategory(articles, 'Börse')) {
    parts.push('market-moving corporate and equity stories');
  }

  if (hasCategory(articles, 'Technologie')) {
    parts.push('technology-related company news');
  }

  if (hasRegion(articles, 'Europe')) {
    parts.push('key impulses from Europe');
  }

  if (hasRegion(articles, 'North America')) {
    parts.push('important developments from North America');
  }

  if (!parts.length) {
    return 'The news flow is currently shaped mainly by a mix of political and economic short-term developments.';
  }

  const unique = Array.from(new Set(parts)).slice(0, 4);

  return `The window is particularly shaped by ${unique.join(', ')}.`;
}

function buildFallbackMainTitle(
  language: 'de' | 'en',
  briefingType: string | undefined,
  timeframe: string
) {
  const normalized = safeText(briefingType).toLowerCase();

  if (language === 'de') {
    if (normalized.includes('morning')) {
      return 'Morgenbriefing';
    }
    if (normalized.includes('executive')) {
      return 'Executive Summary';
    }
    if (normalized.includes('ultra')) {
      return `Kurzupdate (${timeframe})`;
    }
    if (normalized.includes('short')) {
      return `Nachrichtenüberblick (${timeframe})`;
    }
    return `Nachrichtenüberblick (${timeframe})`;
  }

  if (normalized.includes('morning')) {
    return 'Morning Briefing';
  }
  if (normalized.includes('executive')) {
    return 'Executive Summary';
  }
  if (normalized.includes('ultra')) {
    return `Ultra Short Update (${timeframe})`;
  }
  if (normalized.includes('short')) {
    return `News Overview (${timeframe})`;
  }
  return `News Overview (${timeframe})`;
}

function buildCategoryThemeDe(category: string, articles: ArticleLike[]) {
  const regions = getTopRegions(articles, 2);
  const regionText =
    regions.length > 0 ? ` mit besonderer Relevanz für ${regions.join(', ')}` : '';

  switch (category) {
    case 'Wirtschaft':
      return `In der Kategorie Wirtschaft standen vor allem konjunkturelle, handelspolitische und unternehmensbezogene Entwicklungen im Vordergrund${regionText}.`;
    case 'Politik':
      return `In der Kategorie Politik prägten vor allem internationale Spannungen, diplomatische Reaktionen und politische Richtungsentscheidungen die Nachrichtenlage${regionText}.`;
    case 'Börse':
      return `In der Kategorie Börse standen vor allem kursrelevante Unternehmensmeldungen, Marktbewegungen und stimmungsbestimmende Entwicklungen im Fokus${regionText}.`;
    case 'Technologie':
      return `In der Kategorie Technologie dominierten technologische Unternehmensmeldungen, regulatorische Fragen und branchenspezifische Entwicklungen${regionText}.`;
    case 'Wissenschaft':
      return `In der Kategorie Wissenschaft standen vor allem Studien, Forschungsergebnisse und wissenschaftsnahe Entwicklungen im Vordergrund${regionText}.`;
    case 'Gesundheit':
      return `In der Kategorie Gesundheit konzentrierte sich die Berichterstattung auf medizinische, gesundheitspolitische und gesellschaftlich relevante Entwicklungen${regionText}.`;
    case 'Klima':
      return `In der Kategorie Klima prägten vor allem energie-, umwelt- und klimapolitische Entwicklungen das Bild${regionText}.`;
    default:
      return `In der Kategorie ${category} standen mehrere relevante Entwicklungen im Mittelpunkt${regionText}.`;
  }
}

function buildCategoryThemeEn(category: string, articles: ArticleLike[]) {
  const regions = getTopRegions(articles, 2);
  const regionText =
    regions.length > 0 ? ` with particular relevance for ${regions.join(', ')}` : '';

  switch (category) {
    case 'Wirtschaft':
      return `In the Economy category, macro, trade-related, and company-specific developments dominated the coverage${regionText}.`;
    case 'Politik':
      return `In the Politics category, international tensions, diplomatic reactions, and policy decisions shaped the news flow${regionText}.`;
    case 'Börse':
      return `In the Stock Markets category, market-moving company news, price reactions, and sentiment-sensitive developments were in focus${regionText}.`;
    case 'Technologie':
      return `In the Technology category, company developments, regulation, and sector-specific innovation themes were especially relevant${regionText}.`;
    case 'Wissenschaft':
      return `In the Science category, research findings, studies, and science-related developments were most relevant${regionText}.`;
    case 'Gesundheit':
      return `In the Health category, medical, public health, and policy-related developments shaped the coverage${regionText}.`;
    case 'Klima':
      return `In the Climate category, environmental, energy, and climate-related developments were central${regionText}.`;
    default:
      return `In the ${category} category, several relevant developments stood out${regionText}.`;
  }
}

function summarizeCategory(
  language: 'de' | 'en',
  category: string,
  articles: ArticleLike[]
) {
  const sources = uniqueSources(articles).slice(0, 3).join(', ');

  if (language === 'de') {
    const theme = buildCategoryThemeDe(category, articles);
    const sourcePart = sources
      ? ` Die Einordnung stützt sich vor allem auf ${sources}.`
      : '';

    switch (category) {
      case 'Wirtschaft':
        return `${theme} Im Mittelpunkt standen dabei insbesondere wirtschaftspolitische, unternehmensnahe und marktbezogene Signale.${sourcePart}`;
      case 'Politik':
        return `${theme} Besonders relevant waren geopolitische Spannungen, Regierungsentscheidungen und diplomatische Entwicklungen.${sourcePart}`;
      case 'Börse':
        return `${theme} Ausschlaggebend waren vor allem Unternehmensnachrichten, Kursbewegungen und risikorelevante Impulse.${sourcePart}`;
      case 'Technologie':
        return `${theme} Entscheidend waren dabei strategische, regulatorische und innovationsbezogene Impulse.${sourcePart}`;
      case 'Wissenschaft':
        return `${theme} Im Vordergrund standen neue Erkenntnisse, Studien und fachliche Einordnungen.${sourcePart}`;
      case 'Gesundheit':
        return `${theme} Maßgeblich waren gesundheitspolitische, medizinische und gesellschaftliche Aspekte.${sourcePart}`;
      case 'Klima':
        return `${theme} Besonders relevant waren energiepolitische, ökologische und wirtschaftliche Auswirkungen.${sourcePart}`;
      default:
        return `${theme}${sourcePart}`;
    }
  }

  const theme = buildCategoryThemeEn(category, articles);
  const sourcePart = sources
    ? ` The assessment is primarily based on ${sources}.`
    : '';

  switch (category) {
    case 'Wirtschaft':
      return `${theme} The main drivers were macro, policy, and corporate signals.${sourcePart}`;
    case 'Politik':
      return `${theme} Geopolitical tensions, government decisions, and diplomatic developments were especially relevant.${sourcePart}`;
    case 'Börse':
      return `${theme} Company news, market moves, and risk-sensitive developments were the key drivers.${sourcePart}`;
    case 'Technologie':
      return `${theme} Strategic, regulatory, and innovation-related impulses were particularly important.${sourcePart}`;
    case 'Wissenschaft':
      return `${theme} New findings, studies, and expert assessment played the central role.${sourcePart}`;
    case 'Gesundheit':
      return `${theme} Medical, social, and health-policy aspects were especially important.${sourcePart}`;
    case 'Klima':
      return `${theme} Energy, environmental, and economic implications were particularly relevant.${sourcePart}`;
    default:
      return `${theme}${sourcePart}`;
  }
}

function buildOverview(language: 'de' | 'en', timeframe: string, articles: ArticleLike[]) {
  const sourceCount = uniqueSources(articles).length;

  if (language === 'de') {
    return `Dieses Briefing basiert auf ${articles.length} Artikeln aus dem Zeitfenster ${timeframe}. ${buildThemeSummaryDe(articles)} Die Auswertung stützt sich auf ${sourceCount} Quellen. ${buildNarrativeFocusDe(articles)}`;
  }

  return `This briefing is based on ${articles.length} articles from the ${timeframe} window. ${buildThemeSummaryEn(articles)} The assessment draws on ${sourceCount} sources. ${buildNarrativeFocusEn(articles)}`;
}

function buildWhyMarketsCare(language: 'de' | 'en', articles: ArticleLike[]) {
  const categories = getTopCategories(articles, 4);
  const hasEconomyCategory = categories.includes('Wirtschaft');
  const hasStocks = categories.includes('Börse');
  const hasPoliticsCategory = categories.includes('Politik');
  const hasTech = categories.includes('Technologie');

  if (language === 'de') {
    const parts: string[] = [];

    if (hasEconomyCategory || hasStocks) {
      parts.push(
        'Wirtschafts- und marktnahe Meldungen beeinflussen Erwartungen zu Wachstum, Zinsen, Margen und Risikoprämien unmittelbar.'
      );
    }

    if (hasPoliticsCategory) {
      parts.push(
        'Politische und geopolitische Entwicklungen können Energiepreise, Lieferketten, Währungen und die allgemeine Risikoneigung der Investoren spürbar verändern.'
      );
    }

    if (hasTech) {
      parts.push(
        'Technologiethemen wirken häufig direkt auf Bewertungen, Investitionszyklen und die Stimmung in wachstumsorientierten Sektoren.'
      );
    }

    if (!parts.length) {
      parts.push(
        'Die ausgewählten Meldungen sind marktseitig relevant, weil sie Erwartungen an Konjunktur, Unternehmensumfeld und Risikoappetit beeinflussen können.'
      );
    }

    return parts.join(' ');
  }

  const parts: string[] = [];

  if (hasEconomyCategory || hasStocks) {
    parts.push(
      'Economic and market-sensitive reporting directly influences expectations around growth, rates, margins, and risk premia.'
    );
  }

  if (hasPoliticsCategory) {
    parts.push(
      'Political and geopolitical developments can materially affect energy prices, supply chains, currencies, and investor risk appetite.'
    );
  }

  if (hasTech) {
    parts.push(
      'Technology stories often shape valuations, investment cycles, and sentiment in growth-oriented sectors.'
    );
  }

  if (!parts.length) {
    parts.push(
      'These developments matter for markets because they can shift macro expectations, corporate outlooks, and risk sentiment.'
    );
  }

  return parts.join(' ');
}

function buildWhatChanged(language: 'de' | 'en', timeframe: string, articles: ArticleLike[]) {
  const categories = getTopCategories(articles, 3);
  const regions = getTopRegions(articles, 2);

  if (language === 'de') {
    return `Im betrachteten ${timeframe}-Fenster verschob sich der Fokus der Berichterstattung vor allem in Richtung ${categories.join(', ') || 'aktueller Nachrichtenlagen'}. Besonders relevant war dies für ${regions.join(', ') || 'mehrere Regionen'}, wodurch kurzfristig markt- und politikrelevante Entwicklungen stärker in den Vordergrund rückten.`;
  }

  return `Within the selected ${timeframe} window, the news flow shifted mainly toward ${categories.join(', ') || 'current developments'}. This was particularly relevant for ${regions.join(', ') || 'multiple regions'}, bringing more immediate market- and policy-sensitive developments to the forefront.`;
}

function buildClusters(language: 'de' | 'en', articles: ArticleLike[]) {
  const grouped = new Map<string, ArticleLike[]>();

  for (const article of articles) {
    const category = normalizeCategory(article.category ?? '');
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category)!.push(article);
  }

  const entries = Array.from(grouped.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 4);

  return entries.map(([category, items], idx) => ({
    title:
      language === 'de'
        ? `${category}: wichtigste Entwicklungen`
        : `${category}: key developments`,
    summary: summarizeCategory(language, category, items),
    supportingSources: sortByDateDesc(items).slice(0, 4).map((item) => ({
      id: item.id ?? `${category}-${idx}`,
      title: safeText(item.title) || 'Untitled',
      url: safeText(item.url) || '#',
      publicationDate: item.publicationDate ?? new Date().toISOString(),
      sourceName: safeText(item.sourceName) || 'Unknown Source',
      region: safeText(item.region) || 'Global',
      category: normalizeCategory(item.category ?? ''),
      trustScore: Number(item.trustScore ?? 0),
    })),
  }));
}

export function buildFallbackBriefing(
  input: FallbackInput,
  articles: ArticleLike[]
) {
  const language: 'de' | 'en' = input.language === 'en' ? 'en' : 'de';
  const timeframe = timeframeLabel(input.timeframe);
  const sortedArticles = sortByDateDesc(articles);
  const categories = getTopCategories(sortedArticles, 4);

  const sections = categories.map((category) => {
    const categoryArticles = sortedArticles.filter(
      (article) => normalizeCategory(article.category ?? '') === category
    );

    return {
      title: category,
      content: summarizeCategory(language, category, categoryArticles),
    };
  });

  const confidenceScore = averageTrust(sortedArticles);

  return {
    mainTitle: buildFallbackMainTitle(language, input.briefingType, timeframe),
    overviewParagraph: buildOverview(language, timeframe, sortedArticles),
    confidenceScore,
    sections,
    whyMarketsCare: input.includeMarketInsights
      ? buildWhyMarketsCare(language, sortedArticles)
      : undefined,
    whatChanged: input.includeChangeAnalysis
      ? buildWhatChanged(language, timeframe, sortedArticles)
      : undefined,
    eventClusters: buildClusters(language, sortedArticles),
  };
}