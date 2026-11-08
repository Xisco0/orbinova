import { NextRequest, NextResponse } from "next/server";
import { validateEmailUniqueness } from "@/lib/auth/emailUniqueness";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get("email");
    const excludeUserId = searchParams.get("excludeUserId") || undefined;

    if (!email || !email.includes("@")) {
      return NextResponse.json({
        isUnique: false,
        error: "Please enter a valid email address.",
      });
    }

    const result = await validateEmailUniqueness(email, excludeUserId);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { isUnique: false, error: err?.message || "Failed to validate email." },
      { status: 500 }
    );
  }
}
