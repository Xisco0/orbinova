import { NextRequest, NextResponse } from "next/server";
import { validateScopedEmailUniqueness, EmailUniquenessScope } from "@/lib/auth/emailUniqueness";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get("email");
    const excludeUserId = searchParams.get("excludeUserId") || undefined;
    const scope = (searchParams.get("scope") as EmailUniquenessScope) || "donor";
    const organizationId = searchParams.get("orgId") || searchParams.get("organizationId") || undefined;
    const candidateName = searchParams.get("name") || undefined;

    if (!email || !email.includes("@")) {
      return NextResponse.json({
        isUnique: false,
        error: "Please enter a valid email address.",
      });
    }

    const result = await validateScopedEmailUniqueness(email, scope, {
      excludeUserId,
      organizationId,
      candidateName,
    });

    return NextResponse.json({
      isUnique: result.isUnique,
      error: result.error,
      conflictType: result.conflictType,
      isExistingUser: result.isExistingCentralUser,
      existingUserId: result.existingUserId,
      notice: result.isExistingCentralUser
        ? "Existing ORBINOVA account found. If identity matches, donor profile will link to their existing login without creating duplicate accounts."
        : undefined,
    });
  } catch (err: any) {
    return NextResponse.json(
      { isUnique: false, error: err?.message || "Failed to validate email." },
      { status: 500 }
    );
  }
}
