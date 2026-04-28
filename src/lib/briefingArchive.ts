import { supabase } from "@/lib/db/client";
import type { BriefingRequest, BriefingResult, Language } from "@/lib/types";

export type SavedBriefingEntry = {
  id: string;
  accountId: string;
  title: string;
  subtitle: string;
  language: Language;
  briefingType: string;
  timeframe: string;
  categories: string[];
  regions: string[];
  includeMarketInsights: boolean;
  includeChangeAnalysis: boolean;
  briefing: BriefingResult;
  createdAt: string;
  updatedAt: string;
};

type SaveBriefingInput = {
  accountId: string;
  language: Language;
  params: BriefingRequest;
  briefing: BriefingResult;
};

function buildStoredTitle(params: BriefingRequest, briefing: BriefingResult) {
  const mainTitle = String(briefing.mainTitle ?? "").trim();
  const briefingType = String(params.briefingType ?? "").trim();

  if (mainTitle && briefingType) {
    return `${briefingType}: ${mainTitle}`;
  }

  if (mainTitle) return mainTitle;
  if (briefingType) return briefingType;
  return "Briefing";
}

function buildStoredSubtitle(params: BriefingRequest) {
  return [
    params.timeframe || "",
    ...(params.regions ?? []),
    ...(params.categories ?? []),
  ]
    .filter(Boolean)
    .join(" · ");
}

function mapRowToEntry(row: any): SavedBriefingEntry {
  return {
    id: row.id,
    accountId: row.account_id,
    title: row.title,
    subtitle: row.subtitle ?? "",
    language: row.language,
    briefingType: row.briefing_type,
    timeframe: row.timeframe ?? "",
    categories: Array.isArray(row.categories) ? row.categories : [],
    regions: Array.isArray(row.regions) ? row.regions : [],
    includeMarketInsights: !!row.include_market_insights,
    includeChangeAnalysis: !!row.include_change_analysis,
    briefing: row.briefing_payload as BriefingResult,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function saveAutoBriefing(input: SaveBriefingInput) {
  const nowIso = new Date().toISOString();

  const insertPayload = {
    account_id: input.accountId,
    title: buildStoredTitle(input.params, input.briefing),
    subtitle: buildStoredSubtitle(input.params),
    language: input.language,
    briefing_type: input.params.briefingType,
    timeframe: input.params.timeframe,
    categories: input.params.categories ?? [],
    regions: input.params.regions ?? [],
    include_market_insights: !!input.params.includeMarketInsights,
    include_change_analysis: !!input.params.includeChangeAnalysis,
    briefing_payload: input.briefing,
    created_at: nowIso,
    updated_at: nowIso,
  };

  const { data, error } = await supabase
    .from("saved_briefings")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) throw error;

  await trimSavedBriefingsForAccount(input.accountId, 6);

  return mapRowToEntry(data);
}

export async function getSavedBriefingsForAccount(accountId: string) {
  const { data, error } = await supabase
    .from("saved_briefings")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map(mapRowToEntry);
}

export async function renameSavedBriefing(entryId: string, title: string) {
  const cleanedTitle = title.trim();

  const { data, error } = await supabase
    .from("saved_briefings")
    .update({
      title: cleanedTitle,
      updated_at: new Date().toISOString(),
    })
    .eq("id", entryId)
    .select("*")
    .single();

  if (error) throw error;
  return mapRowToEntry(data);
}

export async function deleteSavedBriefing(entryId: string) {
  const { error } = await supabase
    .from("saved_briefings")
    .delete()
    .eq("id", entryId);

  if (error) throw error;
}

export async function getAllSavedBriefings(limit = 100) {
  const { data, error } = await supabase
    .from("saved_briefings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map(mapRowToEntry);
}

async function trimSavedBriefingsForAccount(accountId: string, keepCount: number) {
  const { data, error } = await supabase
    .from("saved_briefings")
    .select("id, created_at")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = data ?? [];
  if (rows.length <= keepCount) return;

  const idsToDelete = rows.slice(keepCount).map((row) => row.id);

  const { error: deleteError } = await supabase
    .from("saved_briefings")
    .delete()
    .in("id", idsToDelete);

  if (deleteError) throw deleteError;
}