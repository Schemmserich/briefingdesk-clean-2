export type BriefingFilterPreferences = {
  language: "de" | "en";
  timeRangeHours: 2 | 4 | 8 | 12 | 24;
  categories: string[];
  regions: string[];
  sourceMode?: string;
  schemaVersion: 1;
};

export const DEFAULT_BRIEFING_FILTERS: BriefingFilterPreferences = {
  language: "de",
  timeRangeHours: 12,
  categories: ["Wirtschaft", "Finanzen", "Technologie"],
  regions: ["Deutschland", "Europa", "USA"],
  sourceMode: "balanced",
  schemaVersion: 1,
};

const STORAGE_KEY_PREFIX = "briefing-app:last-filter-settings:v1";
const BROWSER_USER_ID_KEY = "briefing-app:browser-user-id:v1";

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function createFallbackId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `user-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getBrowserUserId() {
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

function getStorageKey(userId?: string | null) {
  const effectiveUserId =
    userId && userId.trim().length > 0 ? userId.trim() : getBrowserUserId();

  return `${STORAGE_KEY_PREFIX}:${effectiveUserId}`;
}

function isValidLanguage(value: unknown): value is "de" | "en" {
  return value === "de" || value === "en";
}

function isValidTimeRange(value: unknown): value is 2 | 4 | 8 | 12 | 24 {
  return value === 2 || value === 4 || value === 8 || value === 12 || value === 24;
}

function cleanStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const cleaned = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  return cleaned.length > 0 ? cleaned : fallback;
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

      timeRangeHours: isValidTimeRange(parsed.timeRangeHours)
        ? parsed.timeRangeHours
        : fallbackFilters.timeRangeHours,

      categories: cleanStringArray(parsed.categories, fallbackFilters.categories),

      regions: cleanStringArray(parsed.regions, fallbackFilters.regions),

      sourceMode:
        typeof parsed.sourceMode === "string" && parsed.sourceMode.trim().length > 0
          ? parsed.sourceMode
          : fallbackFilters.sourceMode,

      schemaVersion: 1,
    };
  } catch {
    return fallbackFilters;
  }
}

export function saveBriefingFilterPreferences(
  filters: BriefingFilterPreferences,
  userId?: string | null
) {
  if (!isBrowser()) {
    return;
  }

  const filtersToSave: BriefingFilterPreferences = {
    ...filters,
    schemaVersion: 1,
  };

  window.localStorage.setItem(getStorageKey(userId), JSON.stringify(filtersToSave));
}

export function resetBriefingFilterPreferences(userId?: string | null) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(getStorageKey(userId));
}