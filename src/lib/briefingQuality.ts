import type { BriefingResult, BriefingSection, BriefingType } from "@/lib/types";

const STOPWORDS = new Set([
  "the", "and", "for", "with", "from", "that", "this", "into", "over", "after", "before",
  "has", "have", "had", "was", "were", "been", "came", "carried", "out", "as", "in", "on", "at",
  "der", "die", "das", "und", "für", "mit", "von", "auf", "aus", "dass", "dies", "nach", "über",
  "hat", "haben", "hatte", "wurde", "wurden", "war", "waren", "als", "im", "am", "zu", "zum",
  "zur", "einen", "eine", "einer", "einem", "erfolgte", "erfolgten", "ausgeführt", "durchgeführt",
]);

const CONCEPT_PATTERNS: Array<{ pattern: RegExp; concepts: string[] }> = [
  { pattern: /^(israel|israeli|israelisch)/, concepts: ["israel"] },
  { pattern: /^(libanon|libanes|lebanon|lebanese)/, concepts: ["lebanon"] },
  { pattern: /^(usa|u\.s|us|amerika|amerikan|washington)/, concepts: ["usa"] },
  { pattern: /^(china|chines|peking|beijing)/, concepts: ["china"] },
  { pattern: /^(angriff|attack|strike|schlag|bombard|beschuss|raid|offensive)/, concepts: ["attack"] },
  { pattern: /^(vergelt|retaliat)/, concepts: ["attack", "response"] },
  { pattern: /^(reaktion|reagier|response|respond)/, concepts: ["response"] },
  { pattern: /^(sanktion|sanction|embargo)/, concepts: ["sanction"] },
  { pattern: /^(zoll|zölle|tariff|importabgab|duties)/, concepts: ["tariff"] },
  { pattern: /^(wahl|wähl|election|vote|voting)/, concepts: ["election"] },
  { pattern: /^(waffenruh|feuerpaus|ceasefire|truce)/, concepts: ["ceasefire"] },
  { pattern: /^(verhandlung|gespräch|talk|negotiat)/, concepts: ["talks"] },
  { pattern: /^(zinssenk|ratecut|ratescut)/, concepts: ["rate-cut"] },
  { pattern: /^(zinserhöh|ratehike|ratesraised)/, concepts: ["rate-hike"] },
  { pattern: /^(übernahm|übernahme|acquisition|takeover)/, concepts: ["acquisition"] },
];

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

function expandToken(token: string): string[] {
  const concepts = CONCEPT_PATTERNS.flatMap(({ pattern, concepts: values }) =>
    pattern.test(token) ? values : []
  );
  return concepts.length ? [...new Set(concepts)] : [token];
}

function tokens(value: string): Set<string> {
  const result = new Set<string>();

  for (const token of normalize(value).split(" ")) {
    if ((token.length < 3 && token !== "us") || STOPWORDS.has(token)) continue;
    for (const expanded of expandToken(token)) result.add(expanded);
  }

  return result;
}

function intersectionSize(a: Set<string>, b: Set<string>): number {
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  return intersection;
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

  const intersection = intersectionSize(aTokens, bTokens);
  const union = aTokens.size + bTokens.size - intersection;
  return union ? intersection / union : 0;
}

export function isBriefingTextDuplicate(a: string, b: string): boolean {
  const directSimilarity = similarity(a, b);
  const aTokens = tokens(a);
  const bTokens = tokens(b);
  if (!aTokens.size || !bTokens.size) return false;

  const intersection = intersectionSize(aTokens, bTokens);
  const overlap = intersection / Math.min(aTokens.size, bTokens.size);
  const maxNewDetails = Math.max(
    aTokens.size - intersection,
    bTokens.size - intersection
  );
  const sharedConcepts = [...aTokens].filter(
    (token) => bTokens.has(token) && CONCEPT_PATTERNS.some(({ concepts }) => concepts.includes(token))
  ).length;

  // A sentence that adds several meaningful tokens is allowed to survive even
  // when it starts by restating an event. This prevents the de-duplication pass
  // from deleting genuinely new facts such as casualties or market effects.
  if (directSimilarity >= 0.58 && maxNewDetails <= 1) return true;
  if (intersection >= 3 && overlap >= 0.7 && maxNewDetails <= 1) return true;
  if (
    intersection >= 3 &&
    sharedConcepts >= 2 &&
    overlap >= 0.5 &&
    maxNewDetails <= 1
  ) return true;

  return false;
}

function isDuplicate(candidate: string, accepted: string[]): boolean {
  return accepted.some((existing) => isBriefingTextDuplicate(candidate, existing));
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

    // A section's first sentence often paraphrases its own headline. Treat the
    // headline as already stated so only additional information survives.
    const content = takeUniqueSentences(
      section.content,
      [...accepted, title],
      maxSentences
    );
    if (!content) continue;

    usedTitles.push(title);
    accepted.push(title, ...splitSentences(content));
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
