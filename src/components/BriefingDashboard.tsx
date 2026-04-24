"use client";

import { useEffect, useState } from "react";
import { i18n } from "@/lib/i18n";
import { Language, BriefingRequest, BriefingType, BriefingResult } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { BriefingDisplay } from "./BriefingDisplay";
import { generateCuratedBriefingAction } from "@/app/actions/briefing";
import { saveAutoBriefing } from "@/lib/briefingArchive";
import { getCurrentTesterAccountId } from "@/lib/testerIdentity";
import { logAppError, logUsageEvent } from "@/lib/db/queries";
import {
  Loader2,
  Zap,
  Calendar,
  Globe,
  Layers,
  Settings2,
  Newspaper,
  SlidersHorizontal,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const categories = ["Politics", "Economy", "Stock Markets", "Technology", "Science", "Health", "Climate"];
const regions = ["Global", "Europe", "North America", "Asia", "ME&A"];

const categoryLabels: Record<Language, Record<string, string>> = {
  en: {
    Politics: "Politics",
    Economy: "Economy",
    "Stock Markets": "Stock Markets",
    Technology: "Technology",
    Science: "Science",
    Health: "Health",
    Climate: "Climate",
  },
  de: {
    Politics: "Politik",
    Economy: "Wirtschaft",
    "Stock Markets": "Börse",
    Technology: "Technologie",
    Science: "Wissenschaft",
    Health: "Gesundheit",
    Climate: "Klima",
  },
};

const regionLabels: Record<Language, Record<string, string>> = {
  en: {
    Global: "Global",
    Europe: "Europe",
    "North America": "North America",
    Asia: "Asia",
    "ME&A": "ME&A",
  },
  de: {
    Global: "Global",
    Europe: "Europa",
    "North America": "Nordamerika",
    Asia: "Asien",
    "ME&A": "Nahost, Afrika",
  },
};

type DashboardParams = {
  language: Language;
  timeframe: string;
  categories: string[];
  regions: string[];
  briefingType: BriefingType | "";
  includeMarketInsights: boolean;
  includeChangeAnalysis: boolean;
};

type ValidationState = {
  timeframe: boolean;
  regions: boolean;
  categories: boolean;
  briefingType: boolean;
};

type FilterPanelProps = {
  lang: Language;
  setLang: (lang: Language) => void;
  params: DashboardParams;
  setParams: React.Dispatch<React.SetStateAction<DashboardParams>>;
  validation: ValidationState;
  showValidation: boolean;
};

function FilterPanel({
  lang,
  setLang,
  params,
  setParams,
  validation,
  showValidation,
}: FilterPanelProps) {
  const t = i18n[lang];

  const toggleCategory = (cat: string) => {
    setParams((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
    }));
  };

  const toggleRegion = (reg: string) => {
    setParams((prev) => ({
      ...prev,
      regions: prev.regions.includes(reg)
        ? prev.regions.filter((r) => r !== reg)
        : [...prev.regions, reg],
    }));
  };

  const briefingTypeOptions: Array<{ value: BriefingType; label: string }> = [
    { value: "Ultra Short Update", label: t.briefingTypes.ultra },
    { value: "Short Update", label: t.briefingTypes.short },
    { value: "Morning Briefing", label: t.briefingTypes.morning },
    { value: "Executive Summary", label: t.briefingTypes.executive },
  ];

  function labelClass(hasError: boolean) {
    return cn(
      "text-xs uppercase tracking-wider flex items-center gap-2",
      showValidation && hasError ? "text-red-400" : "text-muted-foreground"
    );
  }

  return (
    <Card className="briefing-card border-white/5 max-w-full overflow-hidden">
      <CardHeader className="border-b border-white/5 pb-4">
        <div className="flex items-center justify-between gap-3 min-w-0">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2 min-w-0">
            <Settings2 className="w-5 h-5 text-primary shrink-0" />
            <span className="truncate">{t.parameters}</span>
          </CardTitle>

          <div className="flex gap-1 bg-secondary p-1 rounded-md shrink-0">
            <button
              type="button"
              onClick={() => {
                setLang("en");
                setParams((p) => ({ ...p, language: "en" }));
              }}
              className={cn(
                "px-2.5 py-1 text-xs rounded transition-colors min-h-9",
                lang === "en" ? "bg-primary text-white" : "text-muted-foreground"
              )}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => {
                setLang("de");
                setParams((p) => ({ ...p, language: "de" }));
              }}
              className={cn(
                "px-2.5 py-1 text-xs rounded transition-colors min-h-9",
                lang === "de" ? "bg-primary text-white" : "text-muted-foreground"
              )}
            >
              DE
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5 sm:pt-6 space-y-6 max-w-full overflow-x-hidden">
        <div className="space-y-3">
          <Label className={labelClass(!validation.timeframe)}>
            <Calendar className="w-3 h-3 shrink-0" /> {t.timeframe}
          </Label>

          <div className="flex flex-wrap gap-2 max-w-full">
            {Object.entries(t.timeframes).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setParams((p) => ({ ...p, timeframe: key }))}
                className={cn(
                  "px-3 py-2 rounded-full text-xs transition-all border min-h-10 max-w-full",
                  params.timeframe === key
                    ? "bg-primary border-primary text-white"
                    : showValidation && !validation.timeframe
                    ? "border-red-400/40 text-red-300 hover:border-red-400/60"
                    : "border-white/10 text-muted-foreground hover:border-white/20"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {showValidation && !validation.timeframe && (
            <p className="text-xs text-red-400">
              {lang === "de"
                ? "Bitte wähle zuerst ein Zeitfenster aus."
                : "Please select a timeframe first."}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <Label className={labelClass(!validation.regions)}>
            <Globe className="w-3 h-3 shrink-0" /> {t.regions}
          </Label>

          <div className="flex flex-wrap gap-2 max-w-full">
            {regions.map((reg) => (
              <button
                key={reg}
                type="button"
                onClick={() => toggleRegion(reg)}
                className={cn(
                  "px-3 py-2 rounded-full text-xs transition-all border min-h-10 max-w-full",
                  params.regions.includes(reg)
                    ? "bg-accent border-accent text-white"
                    : showValidation && !validation.regions
                    ? "border-red-400/40 text-red-300 hover:border-red-400/60"
                    : "border-white/10 text-muted-foreground hover:border-white/20"
                )}
              >
                {regionLabels[lang][reg] ?? reg}
              </button>
            ))}
          </div>

          {showValidation && !validation.regions && (
            <p className="text-xs text-red-400">
              {lang === "de"
                ? "Bitte wähle mindestens eine Region aus."
                : "Please select at least one region."}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <Label className={labelClass(!validation.categories)}>
            <Layers className="w-3 h-3 shrink-0" /> {t.categories}
          </Label>

          <div className="flex flex-wrap gap-2 max-w-full">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={cn(
                  "px-3 py-2 rounded-full text-xs transition-all border min-h-10 max-w-full",
                  params.categories.includes(cat)
                    ? "bg-secondary border-primary/40 text-white"
                    : showValidation && !validation.categories
                    ? "border-red-400/40 text-red-300 hover:border-red-400/60"
                    : "border-white/10 text-muted-foreground hover:border-white/20"
                )}
              >
                {categoryLabels[lang][cat] ?? cat}
              </button>
            ))}
          </div>

          {showValidation && !validation.categories && (
            <p className="text-xs text-red-400">
              {lang === "de"
                ? "Bitte wähle mindestens eine Kategorie aus."
                : "Please select at least one category."}
            </p>
          )}
        </div>

        <div className="space-y-3 min-w-0">
          <Label className={labelClass(!validation.briefingType)}>
            {t.outputFormat}
          </Label>

          <div className="hidden sm:block min-w-0">
            <Select
              value={params.briefingType || undefined}
              onValueChange={(v) =>
                setParams((p) => ({ ...p, briefingType: v as BriefingType }))
              }
            >
              <SelectTrigger
                className={cn(
                  "bg-secondary/50 min-h-11 w-full min-w-0",
                  showValidation && !validation.briefingType
                    ? "border-red-400/40 text-red-300"
                    : "border-white/10"
                )}
              >
                <SelectValue placeholder={lang === "de" ? "Bitte auswählen" : "Please select"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Ultra Short Update">{t.briefingTypes.ultra}</SelectItem>
                <SelectItem value="Short Update">{t.briefingTypes.short}</SelectItem>
                <SelectItem value="Morning Briefing">{t.briefingTypes.morning}</SelectItem>
                <SelectItem value="Executive Summary">{t.briefingTypes.executive}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:hidden">
            {briefingTypeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setParams((p) => ({ ...p, briefingType: option.value }))
                }
                className={cn(
                  "w-full rounded-xl border px-3 py-3 text-sm text-left transition min-h-12",
                  params.briefingType === option.value
                    ? "bg-primary border-primary text-white"
                    : showValidation && !validation.briefingType
                    ? "border-red-400/40 bg-red-500/5 text-red-300 hover:bg-red-500/10"
                    : "border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/5 hover:text-white"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {showValidation && !validation.briefingType && (
            <p className="text-xs text-red-400">
              {lang === "de"
                ? "Bitte wähle ein Ausgabeformat aus."
                : "Please select an output format."}
            </p>
          )}
        </div>

        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between gap-3 bg-white/5 p-3 rounded-lg min-h-14">
            <div className="space-y-1">
              <Label htmlFor="market-insights" className="text-sm cursor-pointer leading-snug">
                {t.marketInsights}
              </Label>
              <p className="text-xs text-muted-foreground leading-5">
                {lang === "de"
                  ? "Fügt einen Abschnitt hinzu, warum die Themen für Märkte und Anleger relevant sind."
                  : "Adds a section explaining why the topics matter for markets and investors."}
              </p>
            </div>
            <Checkbox
              id="market-insights"
              checked={params.includeMarketInsights}
              onCheckedChange={(checked) =>
                setParams((p) => ({ ...p, includeMarketInsights: !!checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between gap-3 bg-white/5 p-3 rounded-lg min-h-14">
            <div className="space-y-1">
              <Label htmlFor="change-analysis" className="text-sm cursor-pointer leading-snug">
                {t.changeAnalysis}
              </Label>
              <p className="text-xs text-muted-foreground leading-5">
                {lang === "de"
                  ? "Hebt hervor, was sich im gewählten Zeitfenster tatsächlich verändert hat."
                  : "Highlights what actually changed in the selected time window."}
              </p>
            </div>
            <Checkbox
              id="change-analysis"
              checked={params.includeChangeAnalysis}
              onCheckedChange={(checked) =>
                setParams((p) => ({ ...p, includeChangeAnalysis: !!checked }))
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function BriefingDashboard() {
  const [lang, setLang] = useState<Language>("de");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BriefingResult | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const { toast } = useToast();

  const [params, setParams] = useState<DashboardParams>({
    language: "de",
    timeframe: "",
    categories: [],
    regions: [],
    briefingType: "",
    includeMarketInsights: true,
    includeChangeAnalysis: true,
  });

  const t = i18n[lang];

  useEffect(() => {
    document.title = "News Briefing";
  }, []);

  function validateParams(currentParams: DashboardParams): ValidationState {
    return {
      timeframe: !!currentParams.timeframe,
      regions: currentParams.regions.length > 0,
      categories: currentParams.categories.length > 0,
      briefingType: !!currentParams.briefingType,
    };
  }

  function isValid(validation: ValidationState) {
    return Object.values(validation).every(Boolean);
  }

  function showValidationErrorToast() {
    toast({
      variant: "destructive",
      title: lang === "de" ? "Einstellungen unvollständig" : "Settings incomplete",
      description:
        lang === "de"
          ? "Bitte wähle zuerst Zeitfenster, mindestens eine Region, mindestens eine Kategorie und ein Ausgabeformat aus."
          : "Please select a timeframe, at least one region, at least one category, and an output format first.",
    });
  }

  const validation = validateParams(params);

  const handleApplySettings = () => {
    const nextValidation = validateParams(params);

    if (!isValid(nextValidation)) {
      setShowValidation(true);
      showValidationErrorToast();
      return;
    }

    setShowValidation(false);
    setMobileFiltersOpen(false);

    toast({
      title: lang === "de" ? "Einstellungen übernommen" : "Settings applied",
      description:
        lang === "de"
          ? "Die Filtereinstellungen wurden übernommen."
          : "The filter settings have been applied.",
    });
  };

  const handleGenerate = async () => {
    const nextValidation = validateParams(params);

    if (!isValid(nextValidation)) {
      setShowValidation(true);
      showValidationErrorToast();
      return;
    }

    setShowValidation(false);
    setLoading(true);
    setResult(null);

    const accountId = getCurrentTesterAccountId();

    try {
      const payload: BriefingRequest = {
        language: params.language,
        timeframe: params.timeframe,
        categories: params.categories,
        regions: params.regions,
        briefingType: params.briefingType as BriefingType,
        includeMarketInsights: params.includeMarketInsights,
        includeChangeAnalysis: params.includeChangeAnalysis,
      };

      const response = await generateCuratedBriefingAction(payload);

      if (!response?.success) {
        if (accountId) {
          await logAppError({
            accountId,
            errorMessage: response?.error || "Briefing generation failed",
            context: {
              location: "BriefingDashboard.handleGenerate",
              params: payload,
            },
          });
        }

        toast({
          variant: "destructive",
          title: lang === "de" ? "Fehler" : "Error",
          description:
            response?.error ||
            (lang === "de"
              ? "Briefing konnte nicht erstellt werden."
              : "Failed to generate briefing."),
        });
        return;
      }

      const briefingData = response.data as BriefingResult;
      setResult(briefingData);

      saveAutoBriefing({
        language: lang,
        params: payload,
        briefing: briefingData,
      });

      if (accountId) {
        await logUsageEvent({
          accountId,
          eventType: "briefing_generated",
          payload: {
            language: payload.language,
            timeframe: payload.timeframe,
            categories: payload.categories,
            regions: payload.regions,
            briefingType: payload.briefingType,
            includeMarketInsights: payload.includeMarketInsights,
            includeChangeAnalysis: payload.includeChangeAnalysis,
            headline: briefingData.mainTitle ?? "",
          },
        });
      }

      toast({
        title: lang === "de" ? "Erfolgreich" : "Success",
        description:
          lang === "de"
            ? "Briefing erstellt und automatisch im Archiv gespeichert."
            : "Briefing generated and automatically saved to archive.",
      });
    } catch (error: any) {
      const isUnavailable =
        error.message?.includes("503") ||
        error.message?.includes("high demand");

      const isQuotaExceeded =
        error.message?.includes("429") ||
        error.message?.includes("quota");

      let errorTitle = lang === "de" ? "Fehler" : "Error";
      let errorDesc =
        lang === "de"
          ? "Briefing konnte nicht erstellt werden."
          : "Failed to generate briefing.";

      if (isUnavailable) {
        errorTitle = lang === "de" ? "KI ausgelastet" : "AI High Demand";
        errorDesc =
          lang === "de"
            ? "Die KI ist derzeit stark ausgelastet. Bitte versuche es in wenigen Sekunden erneut."
            : "The AI is currently under high load. Please wait a few seconds and try again.";
      } else if (isQuotaExceeded) {
        errorTitle = lang === "de" ? "Limit erreicht" : "Quota Exceeded";
        errorDesc =
          lang === "de"
            ? "Das API-Limit wurde erreicht. Bitte versuche es in etwa einer Minute erneut."
            : "The API rate limit has been reached. Please try again in about a minute.";
      } else {
        errorDesc = error.message || errorDesc;
      }

      if (accountId) {
        await logAppError({
          accountId,
          errorMessage: error?.message || "Unexpected briefing generation error",
          context: {
            location: "BriefingDashboard.handleGenerate.catch",
            params: {
              language: params.language,
              timeframe: params.timeframe,
              categories: params.categories,
              regions: params.regions,
              briefingType: params.briefingType,
              includeMarketInsights: params.includeMarketInsights,
              includeChangeAnalysis: params.includeChangeAnalysis,
            },
          },
        });
      }

      toast({
        variant: "destructive",
        title: errorTitle,
        description: errorDesc,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-4 sm:space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-headline font-bold text-white tracking-tight">
            News Briefing
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-3xl leading-6 sm:leading-7">
            {lang === "de"
              ? "Wähle deine Kriterien aus und erstelle in wenigen Sekunden ein professionell kuratiertes Nachrichten-Briefing."
              : "Select your criteria and generate a professionally curated news briefing in seconds."}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 max-w-full overflow-x-hidden pb-24 lg:pb-0">
          <div className="hidden lg:block lg:col-span-4 space-y-6 min-w-0">
            <FilterPanel
              lang={lang}
              setLang={setLang}
              params={params}
              setParams={setParams}
              validation={validation}
              showValidation={showValidation}
            />

            <div className="grid grid-cols-1 gap-3">
              {showValidation && !isValid(validation) && (
                <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 leading-6">
                  {lang === "de"
                    ? "Die Einstellungen sind noch nicht vollständig. Bitte wähle zuerst Zeitfenster, Region, Kategorie und Ausgabeformat aus."
                    : "The settings are not complete yet. Please choose timeframe, region, category, and output format first."}
                </div>
              )}

              <Button
                size="lg"
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 shadow-xl shadow-primary/20"
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Zap className="w-5 h-5 mr-2" />
                )}
                {t.generateBriefing}
              </Button>
            </div>
          </div>

          <div className="lg:hidden min-w-0">
            <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
              <SheetContent side="bottom" className="h-[88vh] overflow-y-auto overflow-x-hidden">
                <SheetHeader className="mb-4">
                  <SheetTitle>{t.parameters}</SheetTitle>
                </SheetHeader>

                <div className="pb-24 max-w-full overflow-x-hidden space-y-4">
                  <FilterPanel
                    lang={lang}
                    setLang={setLang}
                    params={params}
                    setParams={setParams}
                    validation={validation}
                    showValidation={showValidation}
                  />

                  {showValidation && !isValid(validation) && (
                    <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 leading-6">
                      {lang === "de"
                        ? "Die Einstellungen sind noch nicht vollständig. Bitte wähle zuerst Zeitfenster, Region, Kategorie und Ausgabeformat aus."
                        : "The settings are not complete yet. Please choose timeframe, region, category, and output format first."}
                    </div>
                  )}
                </div>

                <div className="sticky bottom-0 left-0 right-0 pt-4 bg-background">
                  <Button
                    size="lg"
                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12"
                    onClick={handleApplySettings}
                  >
                    {lang === "de" ? "Einstellungen übernehmen" : "Apply settings"}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="lg:col-span-8 min-w-0 max-w-full">
            {loading ? (
              <div className="min-h-[420px] sm:min-h-[520px] lg:h-[600px] flex flex-col items-center justify-center space-y-4 bg-card/30 rounded-xl border border-dashed border-white/10 px-6 text-center">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                  <Newspaper className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-primary" />
                </div>
                <p className="text-base sm:text-lg font-medium text-muted-foreground animate-pulse">
                  {t.loading}
                </p>
              </div>
            ) : result ? (
              <BriefingDisplay briefing={result} language={lang} />
            ) : (
              <div className="min-h-[420px] sm:min-h-[520px] lg:h-[600px] flex flex-col items-center justify-center space-y-4 bg-card/30 rounded-xl border border-dashed border-white/10 px-6 text-center">
                <div className="w-14 h-14 rounded-full border border-white/10 bg-white/[0.03] flex items-center justify-center">
                  <Newspaper className="w-7 h-7 text-white/20" />
                </div>
                <div className="space-y-2 max-w-md">
                  <p className="text-base sm:text-lg font-semibold text-white">
                    {lang === "de" ? "Noch kein Briefing erstellt" : "No briefing generated yet"}
                  </p>
                  <p className="text-sm sm:text-base text-muted-foreground leading-6">
                    {lang === "de"
                      ? "Wähle deine Parameter aus und erstelle anschließend dein Briefing."
                      : "Select your parameters and then generate your briefing."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="h-12 border-white/10 hover:bg-white/5 shrink-0"
              onClick={() => setMobileFiltersOpen(true)}
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              {lang === "de" ? "Filter" : "Filters"}
            </Button>

            <Button
              size="lg"
              className="flex-1 h-12 bg-primary hover:bg-primary/90 text-white font-bold shadow-xl shadow-primary/20"
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Zap className="w-5 h-5 mr-2" />
              )}
              {t.generateBriefing}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}