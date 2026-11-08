import { NextRequest, NextResponse } from "next/server";
import { passwordResetStore } from "@/lib/auth/passwordResetStore";
import { staffStore } from "@/services/staffStore";
import { donorStore } from "@/services/donorStore";
import { orbinovaEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

const GENERIC_RESPONSE_MESSAGE =
  "If an account exists with this email address, password reset instructions will be sent shortly.";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = (body?.email || "").trim().toLowerCase();
    const portalScope = body?.portalScope || "hospital";

    // 1. Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    // 2. Client IP & rate-limiting check
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
    const rateLimitKey = `pw_reset_${email}_${ip}`;
    const rateCheck = await passwordResetStore.checkRateLimit(rateLimitKey);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many password reset attempts. Please try again in ${rateCheck.waitMinutes} minute(s).`,
        },
        { status: 429 }
      );
    }

    // 3. User account discovery (staffStore, donorStore, profiles, Supabase Auth)
    let foundUserId: string | null = null;
    let foundFullName: string | null = null;
    let resolvedScope: "hospital" | "donor" | "admin" = portalScope;

    // A. Check staffStore
    const staff = staffStore.get(email);
    if (staff && staff.isActive !== false) {
      foundUserId = staff.userId;
      foundFullName = staff.fullName;
      resolvedScope = "hospital";
    }

    // B. Check donorStore
    if (!foundUserId) {
      const donor = donorStore.get(email);
      if (donor) {
        foundUserId = donor.userId;
        foundFullName = donor.fullName;
        resolvedScope = "donor";
      }
    }

    // C. Check Supabase profiles / Auth
    if (!foundUserId) {
      try {
        const adminSupabase = createAdminClient();
        const { data: profile } = await (adminSupabase
          .from("profiles") as any)
          .select("id, full_name, role")
          .eq("email", email)
          .maybeSingle();

        if (profile) {
          foundUserId = profile.id;
          foundFullName = profile.full_name;
          resolvedScope = profile.role === "donor" ? "donor" : profile.role === "admin" ? "admin" : "hospital";
        }
      } catch {
        // Fallback gracefully if Supabase network is unavailable
      }
    }

    // 4. If account exists, generate token and enqueue branded email
    if (foundUserId) {
      const { rawToken } = await passwordResetStore.createResetToken({
        userId: foundUserId,
        email,
        portalScope: resolvedScope,
        expiresInMinutes: 20,
        ipAddress: ip,
      });

      // Construct reset URL using configured application origin
      const origin =
        process.env.NEXT_PUBLIC_APP_URL ||
        request.headers.get("origin") ||
        request.nextUrl.origin ||
        "http://localhost:3000";

      const resetUrl = `${origin}/reset-password?token=${rawToken}`;

      // Enqueue through the centralized email queue system
      await orbinovaEmail.sendPasswordReset({
        toEmail: email,
        fullName: foundFullName || "Healthcare User",
        resetUrl,
        expiresInMinutes: 20,
      });
    }

    // 5. Always return the generic privacy-conscious response
    return NextResponse.json({
      success: true,
      message: GENERIC_RESPONSE_MESSAGE,
    });
  } catch (err: any) {
    console.error("Forgot password handler error:", err);
    return NextResponse.json(
      {
        success: true,
        message: GENERIC_RESPONSE_MESSAGE,
      },
      { status: 200 }
    );
  }
}
