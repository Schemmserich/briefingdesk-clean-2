import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/db/client";

export async function GET() {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get("newsbriefing_admin")?.value;
  const deviceId = cookieStore.get("newsbriefing_device_id")?.value;

  if (!deviceId) {
    return NextResponse.json({
      authorized: false,
      isEligibleAdmin: false,
      adminNameMatched: false,
    });
  }

  const { data: currentUser, error } = await supabase
    .from("test_users")
    .select("*")
    .eq("device_id", deviceId)
    .maybeSingle();

  if (error || !currentUser) {
    return NextResponse.json({
      authorized: false,
      isEligibleAdmin: false,
      adminNameMatched: false,
    });
  }

  const adminNameMatched =
    String(currentUser.first_name ?? "").trim().toLowerCase() === "florian" &&
    String(currentUser.last_name ?? "").trim().toLowerCase() === "schemm";

  const isEligibleAdmin = adminNameMatched && currentUser.is_admin === true;

  return NextResponse.json({
    authorized: adminCookie === "true" && isEligibleAdmin,
    isEligibleAdmin,
    adminNameMatched,
  });
}