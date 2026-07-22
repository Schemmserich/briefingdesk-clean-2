import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getVerifiedTesterAccount } from "@/lib/serverAccess";

export const dynamic = "force-dynamic";

function response(body: Record<string, unknown>) {
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
    },
  });
}

export async function GET() {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get("newsbriefing_admin")?.value;
  const currentUser = await getVerifiedTesterAccount();

  if (!currentUser) {
    return response({
      authorized: false,
      isEligibleAdmin: false,
      hasAccount: false,
    });
  }

  const isEligibleAdmin =
    currentUser.is_admin === true && currentUser.status === "approved";

  return response({
    authorized: adminCookie === "true" && isEligibleAdmin,
    isEligibleAdmin,
    hasAccount: true,
    accountId: currentUser.id,
    firstName: currentUser.first_name,
    lastName: currentUser.last_name,
  });
}
