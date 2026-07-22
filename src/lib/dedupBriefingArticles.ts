type BriefingArticle = {
  id?: string;
  title?: string;
  content?: string;
  summary?: string;
  sourceName?: string;
  publicationDate?: string;
  category?: string;
  region?: string;
  url?: string;
  canonicalHash?: string;
  trustScore?: number;
};

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with", "at", "from", "by",
  "is", "are", "was", "were", "be", "as", "that", "this", "it", "its", "their", "after", "before",
  "into", "about", "over", "under", "new", "more", "less", "says", "said", "will", "would", "could",
  "should", "de", "der", "die", "das", "und", "oder", "mit", "von", "für", "auf", "im", "in", "am",
  "ist", "sind", "war", "waren", "ein", "eine", "einer", "einem", "eines", "dem", "den", "des", "zu",
  "zur", "zum", "nach", "über", "unter", "auch", "bei", "gegen", "durch", "laut", "wie", "sich",
]);

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9äöüß\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

function uniqueTokens(value: string): Set<string> {
  return new Set(tokenize(value));
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;

  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }

  const union = a.size + b.size - intersection;
  return union ? intersection / union : 0;
}

function overlapCoefficient(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;

  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }

  return intersection / Math.min(a.size, b.size);
}

function normalizeUrl(value?: string): string {
  if (!value) return "";

  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith("utm_") || key === "ref" || key === "source") {
        url.searchParams.delete(key);
      }
    }
    return `${url.hostname.toLowerCase()}${url.pathname.replace(/\/$/, "")}${url.search}`;
  } catch {
    return normalizeText(value);
  }
}

function getBodyText(article: BriefingArticle): string {
  return [article.summary ?? "", article.content ?? ""].join(" ");
}

function hoursBetween(a?: string, b?: string): number {
  const aTime = a ? new Date(a).getTime() : NaN;
  const bTime = b ? new Date(b).getTime() : NaN;
  if (!Number.isFinite(aTime) || !Number.isFinite(bTime)) return Number.POSITIVE_INFINITY;
  return Math.abs(aTime - bTime) / 3_600_000;
}

function sameLabel(a?: string, b?: string): boolean {
  return !!a && !!b && normalizeText(a) === normalizeText(b);
}

function areLikelySameEvent(a: BriefingArticle, b: BriefingArticle): boolean {
  if (a.canonicalHash && b.canonicalHash && a.canonicalHash === b.canonicalHash) return true;

  const aUrl = normalizeUrl(a.url);
  const bUrl = normalizeUrl(b.url);
  if (aUrl && bUrl && aUrl === bUrl) return true;

  const aTitle = normalizeText(a.title ?? "");
  const bTitle = normalizeText(b.title ?? "");
  if (aTitle && bTitle && aTitle === bTitle) return true;

  if (
    Math.min(aTitle.length, bTitle.length) >= 36 &&
    (aTitle.includes(bTitle) || bTitle.includes(aTitle))
  ) {
    return true;
  }

  const aTitleTokens = uniqueTokens(a.title ?? "");
  const bTitleTokens = uniqueTokens(b.title ?? "");
  const titleJaccard = jaccardSimilarity(aTitleTokens, bTitleTokens);
  const titleOverlap = overlapCoefficient(aTitleTokens, bTitleTokens);

  const aBodyTokens = uniqueTokens(getBodyText(a));
  const bBodyTokens = uniqueTokens(getBodyText(b));
  const bodyJaccard = jaccardSimilarity(aBodyTokens, bBodyTokens);
  const bodyOverlap = overlapCoefficient(aBodyTokens, bBodyTokens);

  const sameCategory = sameLabel(a.category, b.category);
  const sameRegion = sameLabel(a.region, b.region);
  const closeInTime = hoursBetween(a.publicationDate, b.publicationDate) <= 36;

  if (titleJaccard >= 0.55 || titleOverlap >= 0.70) return true;
  if (titleJaccard >= 0.42 && bodyOverlap >= 0.62 && closeInTime) return true;
  if (sameCategory && sameRegion && closeInTime && bodyJaccard >= 0.48) return true;

  return false;
}

function getArticleScore(article: BriefingArticle): number {
  const trustScore = Number(article.trustScore ?? 50);
  const publishedAt = article.publicationDate ? new Date(article.publicationDate).getTime() : 0;
  const ageHours = publishedAt ? Math.max(0, (Date.now() - publishedAt) / 3_600_000) : 168;
  const recencyScore = Math.max(0, 24 - Math.min(ageHours, 24)) / 6;
  const informationScore = Math.min((article.summary ?? article.content ?? "").length, 1800) / 900;

  return trustScore / 20 + recencyScore + informationScore;
}

export function dedupBriefingArticles<T extends BriefingArticle>(articles: T[]): T[] {
  const sorted = [...articles].sort((a, b) => {
    const scoreDiff = getArticleScore(b) - getArticleScore(a);
    if (scoreDiff !== 0) return scoreDiff;

    const aTime = a.publicationDate ? new Date(a.publicationDate).getTime() : 0;
    const bTime = b.publicationDate ? new Date(b.publicationDate).getTime() : 0;
    return bTime - aTime;
  });

  const result: T[] = [];

  for (const candidate of sorted) {
    if (!result.some((kept) => areLikelySameEvent(candidate, kept))) {
      result.push(candidate);
    }
  }

  return result;
}
