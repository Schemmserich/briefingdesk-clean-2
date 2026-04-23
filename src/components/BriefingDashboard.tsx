"use client";

import { useMemo, useState } from "react";
import { i18n } from "@/lib/i18n";
import { Language, BriefingRequest, BriefingType, BriefingResult } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { BriefingDisplay } from "./BriefingDisplay";
import { generateCuratedBriefingAction } from "@/app/actions/briefing";
import {
  Loader2,
  Zap,
  Save,
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

type FilterPanelProps = {
  lang: Language;
  setLang: (lang: Language) => void;
  params: BriefingRequest;
  setParams: React.Dispatch<React.SetStateAction<BriefingRequest>>;
};

function FilterPanel({ lang, setLang, params, setParams }: FilterPanelProps) {
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

  return (
    <Card className="briefing-card border-white/5">
      <CardHeader className="border-b border-white/5 pb-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" />
            {t.parameters}
          </CardTitle>

          <div className="flex gap-1 bg-secondary p-1 rounded-md shrink-0">
            <button
              type="button"
              onClick={() => {
                setLang("en");
                setParams((p) => ({ ...p, language: "en" }));
              }}
              className={cn(
                "px-2.5 py-1 text-xs rounded transition-colors",
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
                "px-2.5 py-1 text-xs rounded transition-colors",
                lang === "de" ? "bg-primary text-white" : "text-muted-foreground"
              )}
            >
              DE
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5 sm:pt-6 space-y-6">
        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Calendar className="w-3 h-3" /> {t.timeframe}
          </Label>

          <div className="flex flex-wrap gap-2">
            {Object.entries(t.timeframes).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setParams((p) => ({ ...p, timeframe: key }))}
                className={cn(
                  "px-3 py-2 rounded-full text-xs transition-all border min-h-10",
                  params.timeframe === key
                    ? "bg-primary border-primary text-white"
                    : "border-white/10 text-muted-foreground hover:border-white/20"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Globe className="w-3 h-3" /> {t.regions}
          </Label>

          <div className="flex flex-wrap gap-2">
            {regions.map((reg) => (
              <button
                key={reg}
                type="button"
                onClick={() => toggleRegion(reg)}
                className={cn(
                  "px-3 py-2 rounded-full text-xs transition-all border min-h-10",
                  params.regions.includes(reg)
                    ? "bg-accent border-accent text-white"
                    : "border-white/10 text-muted-foreground hover:border-white/20"
                )}
              >
                {reg}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Layers className="w-3 h-3" /> {t.categories}
          </Label>

          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={cn(
                  "px-3 py-2 rounded-full text-xs transition-all border min-h-10",
                  params.categories.includes(cat)
                    ? "bg-secondary border-primary/40 text-white"
                    : "border-white/10 text-muted-foreground hover:border-white/20"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            {t.outputFormat}
          </Label>

          <Select
            value={params.briefingType}
            onValueChange={(v) =>
              setParams((p) => ({ ...p, briefingType: v as BriefingType }))
            }
          >
            <SelectTrigger className="bg-secondary/50 border-white/10 min-h-11">
              <SelectValue placeholder={t.selectPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Ultra Short Update">{t.briefingTypes.ultra}</SelectItem>
              <SelectItem value="Short Update">{t.briefingTypes.short}</SelectItem>
              <SelectItem value="Morning Briefing">{t.briefingTypes.morning}</SelectItem>
              <SelectItem value="Executive Summary">{t.briefingTypes.executive}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between gap-3 bg-white/5 p-3 rounded-lg min-h-14">
            <Label htmlFor="market-insights" className="text-sm cursor-pointer leading-snug">
              {t.marketInsights}
            </Label>
            <Checkbox
              id="market-insights"
              checked={params.includeMarketInsights}
              onCheckedChange={(checked) =>
                setParams((p) => ({ ...p, includeMarketInsights: !!checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between gap-3 bg-white/5 p-3 rounded-lg min-h-14">
            <Label htmlFor="change-analysis" className="text-sm cursor-pointer leading-snug">
              {t.changeAnalysis}
            </Label>
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
  const [lang, setLang] = useState<Language>("en");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BriefingResult | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const { toast } = useToast();

  const [params, setParams] = useState<BriefingRequest>({
    language: "en",
    timeframe: "24h",
    categories: ["Politics", "Economy", "Stock Markets", "Science"],
    regions: ["Global"],
    briefingType: "Morning Briefing",
    includeMarketInsights: true,
    includeChangeAnalysis: true,
  });

  const t = i18n[lang];

  const activeFilterCount = useMemo(() => {
    let count = 0;
    count += params.categories.length;
    count += params.regions.length;
    if (params.includeMarketInsights) count += 1;
    if (params.includeChangeAnalysis) count += 1;
    return count;
  }, [params]);

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await generateCuratedBriefingAction(params);

      console.log("FRONTEND RESPONSE:", response);

      if (!response?.success) {
        toast({
          variant: "destructive",
          title: "Error",
          description: response?.error || "Failed to generate briefing.",
        });
        return;
      }

      setResult(response.data as BriefingResult);

      toast({
        title: "Success",
        description: "Briefing generated successfully.",
      });
    } catch (error: any) {
      console.error(error);

      const isUnavailable =
        error.message?.includes("503") ||
        error.message?.includes("high demand");

      const isQuotaExceeded =
        error.message?.includes("429") ||
        error.message?.includes("quota");

      let errorTitle = "Error";
      let errorDesc = "Failed to generate briefing.";

      if (isUnavailable) {
        errorTitle = "AI High Demand";
        errorDesc =
          "The AI is currently under high load. Please wait a few seconds and try again.";
      } else if (isQuotaExceeded) {
        errorTitle = "Quota Exceeded";
        errorDesc =
          "The API rate limit has been reached. Please try again in about a minute.";
      } else {
        errorDesc = error.message || errorDesc;
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8">
      <div className="hidden lg:block lg:col-span-4 space-y-6">
        <FilterPanel
          lang={lang}
          setLang={setLang}
          params={params}
          setParams={setParams}
        />

        <div className="grid grid-cols-1 gap-3">
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

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="border-white/10 hover:bg-white/5 text-xs h-10">
              <Save className="w-4 h-4 mr-1.5" /> {t.savePreset}
            </Button>
            <Button variant="outline" className="border-white/10 hover:bg-white/5 text-xs h-10">
              <Zap className="w-4 h-4 mr-1.5 text-accent" /> {t.useMorningPreset}
            </Button>
          </div>
        </div>
      </div>

      <div className="lg:hidden space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="h-12 border-white/10 hover:bg-white/5 justify-between"
              >
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4" />
                  {t.parameters}
                </span>
                <span className="text-xs text-muted-foreground">
                  {activeFilterCount}
                </span>
              </Button>
            </SheetTrigger>

            <SheetContent side="bottom" className="h-[88vh] overflow-y-auto">
              <SheetHeader className="mb-4">
                <SheetTitle>{t.parameters}</SheetTitle>
              </SheetHeader>

              <div className="pb-24">
                <FilterPanel
                  lang={lang}
                  setLang={setLang}
                  params={params}
                  setParams={setParams}
                />
              </div>

              <div className="sticky bottom-0 left-0 right-0 pt-4 bg-background">
                <Button
                  size="lg"
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12"
                  onClick={() => setMobileFiltersOpen(false)}
                >
                  Einstellungen übernehmen
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          <Button
            size="lg"
            className="h-12 bg-primary hover:bg-primary/90 text-white font-bold shadow-xl shadow-primary/20"
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

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="border-white/10 hover:bg-white/5 text-xs h-10">
            <Save className="w-4 h-4 mr-1.5" /> {t.savePreset}
          </Button>
          <Button variant="outline" className="border-white/10 hover:bg-white/5 text-xs h-10">
            <Zap className="w-4 h-4 mr-1.5 text-accent" /> {t.useMorningPreset}
          </Button>
        </div>
      </div>

      <div className="lg:col-span-8">
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
            <Newspaper className="w-12 h-12 text-white/10" />
            <p className="text-sm sm:text-base text-muted-foreground">
              {t.noBriefings}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}