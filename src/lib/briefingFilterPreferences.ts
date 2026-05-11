import type { BriefingType, Language } from "@/lib/types";

export type BriefingFilterPreferences = {
  language: Language;
  timeframe: string;
  categories: string[];
  regions: string[];
  briefingType: BriefingType | "";
  includeMarketInsights: boolean;
  includeChangeAnalysis: boolean;
  schemaVersion: 1;
};

export type BriefingFilterPreferenceInput = Omit<
  BriefingFilterPreferences,
  "schemaVersion"
>;

export const DEFAULT_BRIEFING_FILTERS: BriefingFilterPreferences = {
  language: "de",
  timeframe: "",
  categories: [],
  regions: [],
  briefingType: "",
  includeMarketInsights: true,
  includeChangeAnalysis: true,
  schemaVersion: 1,
};

const STORAGE_KEY_PREFIX = "briefing-app:last-filter-settings:v1";
const BROWSER_USER_ID_KEY = "briefing-app:browser-user-id:v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function createFallbackId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `user-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getBrowserUserId(): string {
  if (!isBrowser()) {
    return "server";
  }

  const existingId = window.localStorage.getItem(BROWSER_USER_ID_KEY);

  if (existingId) {
    return existingId;
  }

  const newId = createFallbackId();
  window.localStorage.setItem(BROWSER_USER_ID_KEY, newId);

  return newId;
}

function getStorageKey(userId?: string | null): string {
  const effectiveUserId =
    userId && userId.trim().length > 0 ? userId.trim() : getBrowserUserId();

  return `${STORAGE_KEY_PREFIX}:${effectiveUserId}`;
}

function isValidLanguage(value: unknown): value is Language {
  return value === "de" || value === "en";
}

function isValidBriefingType(value: unknown): value is BriefingType | "" {
  return (
    value === "" ||
    value === "Ultra Short Update" ||
    value === "Short Update" ||
    value === "Morning Briefing" ||
    value === "Executive Summary"
  );
}

function cleanStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function loadBriefingFilterPreferences(
  fallbackFilters: BriefingFilterPreferences = DEFAULT_BRIEFING_FILTERS,
  userId?: string | null
): BriefingFilterPreferences {
  if (!isBrowser()) {
    return fallbackFilters;
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(userId));

    if (!raw) {
      return fallbackFilters;
    }

    const parsed = JSON.parse(raw) as Partial<BriefingFilterPreferences>;

    return {
      language: isValidLanguage(parsed.language)
        ? parsed.language
        : fallbackFilters.language,

      timeframe:
        typeof parsed.timeframe === "string"
          ? parsed.timeframe
          : fallbackFilters.timeframe,

      categories: cleanStringArray(parsed.categories, fallbackFilters.categories),

      regions: cleanStringArray(parsed.regions, fallbackFilters.regions),

      briefingType: isValidBriefingType(parsed.briefingType)
        ? parsed.briefingType
        : fallbackFilters.briefingType,

      includeMarketInsights: cleanBoolean(
        parsed.includeMarketInsights,
        fallbackFilters.includeMarketInsights
      ),

      includeChangeAnalysis: cleanBoolean(
        parsed.includeChangeAnalysis,
        fallbackFilters.includeChangeAnalysis
      ),

      schemaVersion: 1,
    };
  } catch {
    return fallbackFilters;
  }
}

export function saveBriefingFilterPreferences(
  filters: BriefingFilterPreferenceInput | BriefingFilterPreferences,
  userId?: string | null
): void {
  if (!isBrowser()) {
    return;
  }

  const filtersToSave: BriefingFilterPreferences = {
    language: filters.language,
    timeframe: filters.timeframe,
    categories: filters.categories,
    regions: filters.regions,
    briefingType: filters.briefingType,
    includeMarketInsights: filters.includeMarketInsights,
    includeChangeAnalysis: filters.includeChangeAnalysis,
    schemaVersion: 1,
  };

  window.localStorage.setItem(getStorageKey(userId), JSON.stringify(filtersToSave));
}

export function resetBriefingFilterPreferences(userId?: string | null): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(getStorageKey(userId));
}