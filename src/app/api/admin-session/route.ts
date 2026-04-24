import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get("newsbriefing_admin");

  return NextResponse.json({
    authorized: adminCookie?.value === "true",
  });
}