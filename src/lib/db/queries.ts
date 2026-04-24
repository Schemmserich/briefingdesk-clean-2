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

  return (data ?? [])
    .filter((row: any) => !row.sources || row.sources.is_active !== false)
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
      return new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime();
    });
}

export async function getTesterAccountById(accountId: string) {
  const { data, error } = await supabase
    .from("tester_accounts")
    .select("*")
    .eq("id", accountId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getTesterAccountByCredentials(input: {
  firstName: string;
  lastName: string;
  pinHash: string;
}) {
  const { data, error } = await supabase
    .from("tester_accounts")
    .select("*")
    .ilike("first_name", input.firstName.trim())
    .ilike("last_name", input.lastName.trim())
    .eq("pin_hash", input.pinHash)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function registerOrLoginTesterAccount(input: {
  firstName: string;
  lastName: string;
  pinHash: string;
}) {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();

  const existing = await getTesterAccountByCredentials({
    firstName,
    lastName,
    pinHash: input.pinHash,
  });

  if (existing) {
    const { data, error } = await supabase
      .from("tester_accounts")
      .update({
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("tester_accounts")
    .insert({
      first_name: firstName,
      last_name: lastName,
      pin_hash: input.pinHash,
      status: "pending",
      is_admin: firstName.toLowerCase() === "florian" && lastName.toLowerCase() === "schemm",
      last_seen_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function touchTesterAccountLastSeen(accountId: string) {
  const { error } = await supabase
    .from("tester_accounts")
    .update({
      last_seen_at: new Date().toISOString(),
    })
    .eq("id", accountId);

  if (error) throw error;
}

export async function logUsageEvent(input: {
  accountId: string;
  eventType: string;
  payload?: Record<string, unknown>;
}) {
  const { error } = await supabase
    .from("usage_events")
    .insert({
      account_id: input.accountId,
      event_type: input.eventType,
      payload: input.payload ?? {},
    });

  if (error) throw error;
}

export async function logAppError(input: {
  accountId?: string;
  errorMessage: string;
  context?: Record<string, unknown>;
}) {
  const { error } = await supabase
    .from("app_errors")
    .insert({
      account_id: input.accountId ?? null,
      error_message: input.errorMessage,
      context: input.context ?? {},
    });

  if (error) throw error;
}

export async function getAllTesterAccounts() {
  const { data, error } = await supabase
    .from("tester_accounts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function updateTesterAccountStatus(input: {
  accountId: string;
  status: "pending" | "approved" | "blocked";
}) {
  const updatePayload: Record<string, unknown> = {
    status: input.status,
    last_seen_at: new Date().toISOString(),
  };

  if (input.status === "approved") {
    updatePayload.approved_at = new Date().toISOString();
  } else {
    updatePayload.approved_at = null;
  }

  const { data, error } = await supabase
    .from("tester_accounts")
    .update(updatePayload)
    .eq("id", input.accountId)
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

export async function deleteTesterAccountCompletely(accountId: string) {
  const { error: usageError } = await supabase
    .from("usage_events")
    .delete()
    .eq("account_id", accountId);

  if (usageError) throw new Error(`usage_events delete failed: ${usageError.message}`);

  const { error: appErrorsError } = await supabase
    .from("app_errors")
    .delete()
    .eq("account_id", accountId);

  if (appErrorsError) throw new Error(`app_errors delete failed: ${appErrorsError.message}`);

  const { error: accountError } = await supabase
    .from("tester_accounts")
    .delete()
    .eq("id", accountId);

  if (accountError) throw new Error(`tester_accounts delete failed: ${accountError.message}`);

  return true;
}