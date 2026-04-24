import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/db/client";

export async function GET() {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get("newsbriefing_admin")?.value;
  const deviceId = cookieStore.get("newsbriefing_device_id")?.value;

  if (adminCookie !== "true" || !deviceId) {
    return NextResponse.json({ authorized: false, isEligibleAdmin: false });
  }

  const { data: user, error } = await supabase
    .from("test_users")
    .select("*")
    .eq("device_id", deviceId)
    .maybeSingle();

  if (error || !user) {
    return NextResponse.json({ authorized: false, isEligibleAdmin: false });
  }

  const isEligibleAdmin =
    String(user.first_name ?? "").trim().toLowerCase() === "florian" &&
    String(user.last_name ?? "").trim().toLowerCase() === "schemm";

  return NextResponse.json({
    authorized: adminCookie === "true" && isEligibleAdmin,
    isEligibleAdmin,
  });
}