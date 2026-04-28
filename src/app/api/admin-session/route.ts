import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/db/client";

export async function GET() {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get("newsbriefing_admin")?.value;
  const accountId = cookieStore.get("newsbriefing_account_id")?.value;

  if (!accountId) {
    return NextResponse.json({
      authorized: false,
      isEligibleAdmin: false,
      hasAccount: false,
    });
  }

  const { data: currentUser, error } = await supabase
    .from("tester_accounts")
    .select("*")
    .eq("id", accountId)
    .maybeSingle();

  if (error || !currentUser) {
    return NextResponse.json({
      authorized: false,
      isEligibleAdmin: false,
      hasAccount: false,
    });
  }

  const isEligibleAdmin =
    currentUser.is_admin === true && currentUser.status === "approved";

  return NextResponse.json({
    authorized: adminCookie === "true" && isEligibleAdmin,
    isEligibleAdmin,
    hasAccount: true,
    accountId: currentUser.id,
    firstName: currentUser.first_name,
    lastName: currentUser.last_name,
  });
}