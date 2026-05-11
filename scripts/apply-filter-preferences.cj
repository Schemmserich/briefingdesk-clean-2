const fs = require("fs");
const path = require("path");

const root = process.cwd();

const dashboardPath = path.join(root, "src", "components", "BriefingDashboard.tsx");
const preferencesPath = path.join(root, "src", "lib", "briefingFilterPreferences.ts");

const preferencesCode = `import type { BriefingType, Language } from "@/lib/types";

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

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function createFallbackId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return \`user-\${Date.now()}-\${Math.random().toString(36).slice(2)}\`;
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

function getStorageKey(userId) {
  const effectiveUserId =
    userId && userId.trim().length > 0 ? userId.trim() : getBrowserUserId();

  return \`\${STORAGE_KEY_PREFIX}:\${effectiveUserId}\`;
}

function isValidLanguage(value) {
  return value === "de" || value === "en";
}

function isValidBriefingType(value) {
  return (
    value === "" ||
    value === "Ultra Short Update" ||
    value === "Short Update" ||
    value === "Morning Briefing" ||
    value === "Executive Summary"
  );
}

function cleanStringArray(value, fallback) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanBoolean(value, fallback) {
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
) {
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

export function resetBriefingFilterPreferences(userId?: string | null) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(getStorageKey(userId));
}
`;

fs.writeFileSync(preferencesPath, preferencesCode, "utf8");

let dashboard = fs.readFileSync(dashboardPath, "utf8");

const importToFind = `import { logAppError, logUsageEvent } from "@/lib/db/queries";`;

const importToAdd = `import {
  DEFAULT_BRIEFING_FILTERS,
  loadBriefingFilterPreferences,
  saveBriefingFilterPreferences,
} from "@/lib/briefingFilterPreferences";`;

if (!dashboard.includes(importToAdd)) {
  dashboard = dashboard.replace(importToFind, `${importToFind}
${importToAdd}`);
}

const validationBlock = `type ValidationState = {
  timeframe: boolean;
  regions: boolean;
  categories: boolean;
  briefingType: boolean;
};`;

const defaultParamsBlock = `const DEFAULT_DASHBOARD_PARAMS: DashboardParams = {
  language: DEFAULT_BRIEFING_FILTERS.language,
  timeframe: DEFAULT_BRIEFING_FILTERS.timeframe,
  categories: DEFAULT_BRIEFING_FILTERS.categories,
  regions: DEFAULT_BRIEFING_FILTERS.regions,
  briefingType: DEFAULT_BRIEFING_FILTERS.briefingType,
  includeMarketInsights: DEFAULT_BRIEFING_FILTERS.includeMarketInsights,
  includeChangeAnalysis: DEFAULT_BRIEFING_FILTERS.includeChangeAnalysis,
};`;

if (!dashboard.includes(defaultParamsBlock)) {
  dashboard = dashboard.replace(validationBlock, `${validationBlock}

${defaultParamsBlock}`);
}

const statePattern =
  /export function BriefingDashboard\(\) \{\r?\n  const \[lang, setLang\] = useState<Language>\("de"\);\r?\n  const \[loading, setLoading\] = useState\(false\);\r?\n  const \[result, setResult\] = useState<BriefingResult \| null>\(null\);\r?\n  const \[mobileFiltersOpen, setMobileFiltersOpen\] = useState\(false\);\r?\n  const \[showValidation, setShowValidation\] = useState\(false\);\r?\n  const \{ toast \} = useToast\(\);\r?\n\r?\n  const \[params, setParams\] = useState<DashboardParams>\(\{\r?\n    language: "de",\r?\n    timeframe: "",\r?\n    categories: \[\],\r?\n    regions: \[\],\r?\n    briefingType: "",\r?\n    includeMarketInsights: true,\r?\n    includeChangeAnalysis: true,\r?\n  \}\);/;

const newStateBlock = `export function BriefingDashboard() {
  const [lang, setLang] = useState<Language>("de");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BriefingResult | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const { toast } = useToast();

  const [params, setParams] = useState<DashboardParams>(DEFAULT_DASHBOARD_PARAMS);`;

if (!dashboard.includes(`const [filtersLoaded, setFiltersLoaded] = useState(false);`)) {
  if (!statePattern.test(dashboard)) {
    throw new Error("State-Block konnte nicht gefunden werden. Bitte Datei prüfen.");
  }

  dashboard = dashboard.replace(statePattern, newStateBlock);
}

const titleEffectBlock = `  useEffect(() => {
    document.title = "News Briefing";
  }, []);`;

const filterEffectsBlock = `  useEffect(() => {
    const savedFilters = loadBriefingFilterPreferences(DEFAULT_BRIEFING_FILTERS);
    const { schemaVersion, ...savedParams } = savedFilters;

    setParams(savedParams);
    setLang(savedParams.language);
    setFiltersLoaded(true);
  }, []);

  useEffect(() => {
    if (!filtersLoaded) {
      return;
    }

    const timeout = window.setTimeout(() => {
      saveBriefingFilterPreferences(params);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [params, filtersLoaded]);`;

if (!dashboard.includes(`const savedFilters = loadBriefingFilterPreferences`)) {
  dashboard = dashboard.replace(titleEffectBlock, `${titleEffectBlock}

${filterEffectsBlock}`);
}

fs.writeFileSync(dashboardPath, dashboard, "utf8");

console.log("Filter-Speicherung erfolgreich eingebaut.");