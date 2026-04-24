import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/db/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const submittedPasscode = String(body?.passcode ?? "");
    const adminPasscode = process.env.ADMIN_PASSCODE;

    if (!adminPasscode) {
      return NextResponse.json(
        { success: false, error: "ADMIN_PASSCODE is not configured." },
        { status: 500 }
      );
    }

    if (submittedPasscode !== adminPasscode) {
      return NextResponse.json(
        { success: false, error: "Invalid passcode." },
        { status: 401 }
      );
    }

    const cookieStore = await cookies();
    const deviceId = cookieStore.get("newsbriefing_device_id")?.value;

    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: "No device ID found." },
        { status: 401 }
      );
    }

    const { data: currentUser, error } = await supabase
      .from("test_users")
      .select("*")
      .eq("device_id", deviceId)
      .maybeSingle();

    if (error || !currentUser) {
      return NextResponse.json(
        { success: false, error: "Failed to verify admin user." },
        { status: 500 }
      );
    }

    const adminNameMatched =
      String(currentUser.first_name ?? "").trim().toLowerCase() === "florian" &&
      String(currentUser.last_name ?? "").trim().toLowerCase() === "schemm";

    const isAllowedAdmin = adminNameMatched && currentUser.is_admin === true;

    if (!isAllowedAdmin) {
      return NextResponse.json(
        { success: false, error: "This user is not allowed to access admin." },
        { status: 403 }
      );
    }

    const response = NextResponse.json({ success: true });

    response.cookies.set("newsbriefing_admin", "true", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: "Login failed." },
      { status: 500 }
    );
  }
}
