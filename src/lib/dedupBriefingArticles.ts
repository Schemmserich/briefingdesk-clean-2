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
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  const stopwords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "of",
    "to",
    "in",
    "on",
    "for",
    "with",
    "at",
    "from",
    "by",
    "is",
    "are",
    "was",
    "were",
    "be",
    "as",
    "that",
    "this",
    "it",
    "its",
    "their",
    "his",
    "her",
    "after",
    "before",
    "into",
    "about",
    "over",
    "under",
    "new",
    "more",
    "less",
    "says",
    "said",
    "will",
    "would",
    "could",
    "should",
    "de",
    "der",
    "die",
    "das",
    "und",
    "oder",
    "mit",
    "von",
    "für",
    "auf",
    "im",
    "in",
    "am",
    "ist",
    "sind",
    "war",
    "waren",
    "ein",
    "eine",
    "einer",
    "einem",
    "eines",
    "dem",
    "den",
    "des",
    "zu",
    "zur",
    "zum",
    "nach",
    "über",
    "unter",
    "auch",
    "bei",
  ]);

  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length >= 3 && !stopwords.has(token));
}

function uniqueTokens(tokens: string[]): string[] {
  return [...new Set(tokens)];
}

function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);

  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function getArticleBaseText(article: BriefingArticle): string {
  return [
    article.title ?? "",
    article.summary ?? "",
    article.content ?? "",
  ].join(" ");
}

function getArticleScore(article: BriefingArticle): number {
  const contentLength = (article.content ?? "").length;
  const summaryLength = (article.summary ?? "").length;
  const titleLength = (article.title ?? "").length;

  let score = 0;

  score += Math.min(contentLength, 4000) * 0.001;
  score += Math.min(summaryLength, 1000) * 0.002;
  score += Math.min(titleLength, 200) * 0.003;

  if (article.category) score += 1;
  if (article.region) score += 1;
  if (article.publicationDate) score += 1;
  if (article.url) score += 1;

  return score;
}

function areLikelySameTopic(a: BriefingArticle, b: BriefingArticle): boolean {
  const aTitleTokens = uniqueTokens(tokenize(a.title ?? ""));
  const bTitleTokens = uniqueTokens(tokenize(b.title ?? ""));
  const titleSimilarity = jaccardSimilarity(aTitleTokens, bTitleTokens);

  const aBodyTokens = uniqueTokens(tokenize(getArticleBaseText(a)));
  const bBodyTokens = uniqueTokens(tokenize(getArticleBaseText(b)));
  const bodySimilarity = jaccardSimilarity(aBodyTokens, bBodyTokens);

  const sameCategory =
    !!a.category &&
    !!b.category &&
    a.category.toLowerCase() === b.category.toLowerCase();

  const sameRegion =
    !!a.region &&
    !!b.region &&
    a.region.toLowerCase() === b.region.toLowerCase();

  const sameSource =
    !!a.sourceName &&
    !!b.sourceName &&
    a.sourceName.toLowerCase() === b.sourceName.toLowerCase();

  if (titleSimilarity >= 0.72) return true;
  if (titleSimilarity >= 0.55 && bodySimilarity >= 0.4) return true;
  if (!sameSource && sameCategory && sameRegion && bodySimilarity >= 0.52) return true;

  return false;
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
    const isDuplicate = result.some((kept) => areLikelySameTopic(candidate, kept));

    if (!isDuplicate) {
      result.push(candidate);
    }
  }

  return result;
}