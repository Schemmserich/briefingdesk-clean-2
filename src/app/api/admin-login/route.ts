import { NextResponse } from "next/server";

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