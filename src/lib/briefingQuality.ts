import type { BriefingResult, BriefingSection, BriefingType } from "@/lib/types";

const STOPWORDS = new Set([
  "the", "and", "for", "with", "from", "that", "this", "into", "over", "after", "before",
  "der", "die", "das", "und", "für", "mit", "von", "auf", "aus", "dass", "dies", "nach", "über",
]);

const FORMAT_LIMITS: Record<BriefingType, {
  overviewSentences: number;
  sectionCount: number;
  sectionSentences: number;
  extraSentences: number;
}> = {
  "Ultra Short Update": {
    overviewSentences: 2,
    sectionCount: 0,
    sectionSentences: 0,
    extraSentences: 1,
  },
  "Short Update": {
    overviewSentences: 2,
    sectionCount: 2,
    sectionSentences: 2,
    extraSentences: 1,
  },
  "Morning Briefing": {
    overviewSentences: 3,
    sectionCount: 5,
    sectionSentences: 3,
    extraSentences: 2,
  },
  "Executive Summary": {
    overviewSentences: 4,
    sectionCount: 6,
    sectionSentences: 4,
    extraSentences: 3,
  },
};

function cleanText(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function splitSentences(value: string): string[] {
  const cleaned = cleanText(value);
  if (!cleaned) return [];

  const matches = cleaned.match(/[^.!?]+(?:[.!?]+|$)/g);
  return (matches ?? [cleaned])
    .map((sentence) => cleanText(sentence))
    .filter(Boolean);
}

function normalize(value: string): string {
  return cleanText(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9äöüß\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string): Set<string> {
  return new Set(
    normalize(value)
      .split(" ")
      .filter((token) => token.length >= 3 && !STOPWORDS.has(token))
  );
}

function similarity(a: string, b: string): number {
  const normalizedA = normalize(a);
  const normalizedB = normalize(b);

  if (!normalizedA || !normalizedB) return 0;
  if (normalizedA === normalizedB) return 1;
  if (
    Math.min(normalizedA.length, normalizedB.length) >= 45 &&
    (normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA))
  ) {
    return 0.95;
  }

  const aTokens = tokens(a);
  const bTokens = tokens(b);
  if (!aTokens.size || !bTokens.size) return 0;

  let intersection = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) intersection += 1;
  }

  const union = aTokens.size + bTokens.size - intersection;
  return union ? intersection / union : 0;
}

function isDuplicate(candidate: string, accepted: string[]): boolean {
  return accepted.some((existing) => similarity(candidate, existing) >= 0.76);
}

function takeUniqueSentences(
  value: unknown,
  accepted: string[],
  maxSentences: number,
  options?: { keepAtLeastOne?: boolean }
): string {
  const result: string[] = [];

  for (const sentence of splitSentences(cleanText(value))) {
    if (result.length >= maxSentences) break;
    if (isDuplicate(sentence, [...accepted, ...result])) continue;
    result.push(sentence);
  }

  if (!result.length && options?.keepAtLeastOne) {
    const first = splitSentences(cleanText(value))[0];
    if (first) result.push(first);
  }

  accepted.push(...result);
  return result.join(" ");
}

function cleanSections(
  sections: BriefingSection[] | undefined,
  accepted: string[],
  maxSections: number,
  maxSentences: number
): BriefingSection[] {
  if (!sections?.length || maxSections === 0) return [];

  const result: BriefingSection[] = [];
  const usedTitles: string[] = [];

  for (const section of sections) {
    if (result.length >= maxSections) break;

    const title = cleanText(section.title);
    if (!title || isDuplicate(title, usedTitles)) continue;

    const content = takeUniqueSentences(section.content, accepted, maxSentences);
    if (!content) continue;

    usedTitles.push(title);
    result.push({ title, content });
  }

  return result;
}

export function improveBriefingQuality(
  rawResult: BriefingResult,
  requestedType: BriefingType,
  options?: {
    includeMarketInsights?: boolean;
    includeChangeAnalysis?: boolean;
  }
): BriefingResult {
  const limits = FORMAT_LIMITS[requestedType];
  const acceptedSentences: string[] = [];

  const overviewParagraph = takeUniqueSentences(
    rawResult.overviewParagraph,
    acceptedSentences,
    limits.overviewSentences,
    { keepAtLeastOne: true }
  );

  const sections = cleanSections(
    rawResult.sections,
    acceptedSentences,
    limits.sectionCount,
    limits.sectionSentences
  );

  const whyMarketsCare = options?.includeMarketInsights
    ? takeUniqueSentences(
        rawResult.whyMarketsCare,
        acceptedSentences,
        limits.extraSentences
      )
    : "";

  const whatChanged = options?.includeChangeAnalysis
    ? takeUniqueSentences(
        rawResult.whatChanged,
        acceptedSentences,
        limits.extraSentences
      )
    : "";

  const score = Number(rawResult.confidenceScore);

  return {
    ...rawResult,
    mainTitle: cleanText(rawResult.mainTitle),
    overviewParagraph,
    briefingType: requestedType,
    confidenceScore: Number.isFinite(score)
      ? Math.max(0, Math.min(100, Math.round(score)))
      : 50,
    sections: sections.length ? sections : undefined,
    whyMarketsCare: whyMarketsCare || undefined,
    whatChanged: whatChanged || undefined,
  };
}
