import "server-only";

import { cookies } from "next/headers";
import { supabase } from "@/lib/db/client";

export type VerifiedTesterAccount = {
  id: string;
  first_name: string;
  last_name: string;
  status: "pending" | "approved" | "blocked";
  is_admin: boolean;
};

const ACCOUNT_COOKIE = "newsbriefing_account_id";

function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function getVerifiedTesterAccount(): Promise<VerifiedTesterAccount | null> {
  const cookieStore = await cookies();
  const accountId = cookieStore.get(ACCOUNT_COOKIE)?.value?.trim() ?? "";

  if (!accountId || !looksLikeUuid(accountId)) return null;

  const { data, error } = await supabase
    .from("tester_accounts")
    .select("id, first_name, last_name, status, is_admin")
    .eq("id", accountId)
    .maybeSingle();

  if (error) {
    console.error("Account verification failed:", error.message);
    return null;
  }

  return (data as VerifiedTesterAccount | null) ?? null;
}

export async function requireApprovedTesterAccount(): Promise<VerifiedTesterAccount> {
  const account = await getVerifiedTesterAccount();

  if (!account || account.status !== "approved") {
    throw new Error("ACCESS_NOT_APPROVED");
  }

  return account;
}

export async function requireApprovedAdminAccount(): Promise<VerifiedTesterAccount> {
  const account = await requireApprovedTesterAccount();

  if (!account.is_admin) {
    throw new Error("ADMIN_ACCESS_DENIED");
  }

  return account;
}
