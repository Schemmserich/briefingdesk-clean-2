import { supabase } from "./client";

function timeframeToHours(timeframe: string): number {
  const normalized = (timeframe ?? "24h").toLowerCase().trim();

  if (normalized.endsWith("h")) {
    const hours = Number(normalized.replace("h", ""));
    return Number.isFinite(hours) ? hours : 24;
  }

  return 24;
}

export async function getFilteredArticles(input: {
  timeframe: string;
  categories: string[];
  regions: string[];
}) {
  const hours = timeframeToHours(input.timeframe ?? "24h");
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from("articles")
    .select(`
      id,
      title,
      url,
      publication_date,
      language,
      region,
      category,
      content,
      summary,
      canonical_hash,
      trust_score,
      source_id,
      sources (
        id,
        name,
        slug,
        trust_score,
        is_active
      )
    `)
    .gte("publication_date", cutoff)
    .order("publication_date", { ascending: false });

  if (input.categories?.length) {
    query = query.in("category", input.categories);
  }

  if (input.regions?.length) {
    query = query.in("region", input.regions);
  }

  const { data, error } = await query;

  if (error) throw error;

  const filtered = (data ?? [])
    .filter((row: any) => {
      if (!row.sources) return true;
      return row.sources.is_active !== false;
    })
    .map((row: any) => ({
      id: row.id,
      title: row.title,
      url: row.url,
      publicationDate: row.publication_date,
      sourceName: row.sources?.name ?? "Unknown Source",
      region: row.region,
      category: row.category,
      content: row.content,
      summary: row.summary,
      canonicalHash: row.canonical_hash,
      trustScore: row.trust_score ?? row.sources?.trust_score ?? 50,
    }))
    .sort((a: any, b: any) => {
      const trustDiff = (b.trustScore ?? 0) - (a.trustScore ?? 0);
      if (trustDiff !== 0) return trustDiff;

      return (
        new Date(b.publicationDate).getTime() -
        new Date(a.publicationDate).getTime()
      );
    });

  return filtered;
}

export async function getTestUserByDeviceId(deviceId: string) {
  const { data, error } = await supabase
    .from("test_users")
    .select("*")
    .eq("device_id", deviceId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function registerTestUser(input: {
  deviceId: string;
  firstName: string;
  lastName: string;
}) {
  const { data, error } = await supabase
    .from("test_users")
    .insert({
      device_id: input.deviceId,
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      status: "pending",
      last_seen_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function touchTestUserLastSeen(deviceId: string) {
  const { error } = await supabase
    .from("test_users")
    .update({
      last_seen_at: new Date().toISOString(),
    })
    .eq("device_id", deviceId);

  if (error) throw error;
}

export async function logUsageEvent(input: {
  deviceId: string;
  eventType: string;
  payload?: Record<string, unknown>;
}) {
  const { error } = await supabase
    .from("usage_events")
    .insert({
      device_id: input.deviceId,
      event_type: input.eventType,
      payload: input.payload ?? {},
    });

  if (error) throw error;
}

export async function logAppError(input: {
  deviceId?: string;
  errorMessage: string;
  context?: Record<string, unknown>;
}) {
  const { error } = await supabase
    .from("app_errors")
    .insert({
      device_id: input.deviceId ?? null,
      error_message: input.errorMessage,
      context: input.context ?? {},
    });

  if (error) throw error;
}