import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireApprovedAdminAccount } from "@/lib/serverAccess";

export const dynamic = "force-dynamic";

function noStoreJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
    },
  });
}

function safeStringEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const submittedPasscode = String(body?.passcode ?? "");
    const adminPasscode = process.env.ADMIN_PASSCODE ?? "";

    if (!adminPasscode) {
      return noStoreJson(
        { success: false, error: "ADMIN_PASSCODE is not configured." },
        500
      );
    }

    if (!safeStringEqual(submittedPasscode, adminPasscode)) {
      return noStoreJson({ success: false, error: "Invalid passcode." }, 401);
    }

    await requireApprovedAdminAccount();

    const cookieStore = await cookies();
    cookieStore.set("newsbriefing_admin", "true", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return noStoreJson({ success: true });
  } catch (error: any) {
    const status =
      error?.message === "ADMIN_ACCESS_DENIED" ||
      error?.message === "ACCESS_NOT_APPROVED"
        ? 403
        : 500;

    return noStoreJson(
      {
        success: false,
        error:
          status === 403
            ? "This user is not allowed to access admin."
            : "Login failed.",
      },
      status
    );
  }
}
