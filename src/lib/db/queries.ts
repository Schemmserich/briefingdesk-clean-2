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
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();

  const existingUser = await getTestUserByDeviceId(input.deviceId);

  if (existingUser) {
    const { data, error } = await supabase
      .from("test_users")
      .update({
        first_name: firstName,
        last_name: lastName,
        last_seen_at: new Date().toISOString(),
      })
      .eq("device_id", input.deviceId)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("test_users")
    .insert({
      device_id: input.deviceId,
      first_name: firstName,
      last_name: lastName,
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

export async function getAllTestUsers() {
  const { data, error } = await supabase
    .from("test_users")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function updateTestUserStatus(input: {
  deviceId: string;
  status: "pending" | "approved" | "blocked";
}) {
  const updatePayload: Record<string, unknown> = {
    status: input.status,
    last_seen_at: new Date().toISOString(),
  };

  if (input.status === "approved") {
    updatePayload.approved_at = new Date().toISOString();
  }

  if (input.status !== "approved") {
    updatePayload.approved_at = null;
  }

  const { data, error } = await supabase
    .from("test_users")
    .update(updatePayload)
    .eq("device_id", input.deviceId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getUsageEvents(limit = 50) {
  const { data, error } = await supabase
    .from("usage_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function getAppErrors(limit = 30) {
  const { data, error } = await supabase
    .from("app_errors")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function deleteTestUserCompletely(deviceId: string) {
  const { error: usageError } = await supabase
    .from("usage_events")
    .delete()
    .eq("device_id", deviceId);

  if (usageError) {
    throw new Error(`usage_events delete failed: ${usageError.message}`);
  }

  const { error: appErrorsError } = await supabase
    .from("app_errors")
    .delete()
    .eq("device_id", deviceId);

  if (appErrorsError) {
    throw new Error(`app_errors delete failed: ${appErrorsError.message}`);
  }

  const { error: userError } = await supabase
    .from("test_users")
    .delete()
    .eq("device_id", deviceId);

  if (userError) {
    throw new Error(`test_users delete failed: ${userError.message}`);
  }

  const stillExisting = await getTestUserByDeviceId(deviceId);

  if (stillExisting) {
    throw new Error("test_users delete failed: user still exists after delete");
  }

  return true;
}  const { error: usageError } = await supabase
    .from("usage_events")
    .delete()
    .eq("device_id", deviceId);

  if (usageError) throw usageError;

  const { error: appErrorsError } = await supabase
    .from("app_errors")
    .delete()
    .eq("device_id", deviceId);

  if (appErrorsError) throw appErrorsError;

  const { error: userError } = await supabase
    .from("test_users")
    .delete()
    .eq("device_id", deviceId);

  if (userError) throw userError;
}