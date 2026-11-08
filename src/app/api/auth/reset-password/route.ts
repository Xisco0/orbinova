import { NextRequest, NextResponse } from "next/server";
import { passwordResetStore } from "@/lib/auth/passwordResetStore";
import { staffStore } from "@/services/staffStore";
import { donorStore } from "@/services/donorStore";
import { sessionManager } from "@/lib/auth/sessionManager";
import { accountSecurity } from "@/lib/auth/accountSecurity";
import { orbinovaEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/auth/reset-password?token=...
 * Verifies token validity without consuming it
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { valid: false, error: "Missing password reset token." },
        { status: 400 }
      );
    }

    const verification = await passwordResetStore.verifyToken(token);

    if (!verification.valid || !verification.record) {
      return NextResponse.json(
        { valid: false, error: verification.error || "Invalid or expired reset token." },
        { status: 400 }
      );
    }

    // Mask email for user reassurance (e.g., "d***r@hospital.com")
    const email = verification.record.email;
    const [localPart, domain] = email.split("@");
    const maskedLocal =
      localPart.length <= 2
        ? `${localPart[0]}*`
        : `${localPart[0]}${"*".repeat(localPart.length - 2)}${localPart[localPart.length - 1]}`;
    const maskedEmail = `${maskedLocal}@${domain}`;

    return NextResponse.json({
      valid: true,
      maskedEmail,
      portalScope: verification.record.portalScope,
    });
  } catch (err: any) {
    return NextResponse.json(
      { valid: false, error: "Failed to verify reset token." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/reset-password
 * Consumes the token and updates the user's password
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { token, newPassword } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing reset token." },
        { status: 400 }
      );
    }

    // 1. Verify token
    const verification = await passwordResetStore.verifyToken(token);
    if (!verification.valid || !verification.record) {
      return NextResponse.json(
        { success: false, error: verification.error || "Invalid or expired reset link." },
        { status: 400 }
      );
    }

    const { tokenHash, userId, email, portalScope } = verification.record;

    // 2. Validate password strength
    if (!newPassword || typeof newPassword !== "string") {
      return NextResponse.json(
        { success: false, error: "New password is required." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasDigit = /[0-9]/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

    if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
        },
        { status: 400 }
      );
    }

    // 3. Mark token as consumed immediately to prevent race conditions & token reuse
    await passwordResetStore.markTokenUsed(tokenHash);

    // 4. Update password in authoritative stores
    // A. Staff Store update
    const staff = staffStore.get(email) || staffStore.get(userId);
    if (staff) {
      staffStore.save({
        ...staff,
        temporaryPassword: newPassword,
        mustChangePassword: false,
      });
    }

    // B. Supabase Auth update
    try {
      const adminSupabase = createAdminClient();
      await adminSupabase.auth.admin.updateUserById(userId, {
        password: newPassword,
        user_metadata: {
          must_change_password: false,
        },
      });
    } catch {
      // In local or mock dev environments, staffStore handles local fallback
    }

    // 5. Invalidate existing sessions for this user (Single Active Session Policy)
    sessionManager.revokeSession(userId);

    // 6. Reset login lockout / failed attempt counters
    await accountSecurity.unlockAccount(email, {
      userId,
      role: portalScope,
      organizationId: staff?.organizationId,
    });

    // 7. Enqueue password changed security notification email
    try {
      await orbinovaEmail.sendPasswordChangedAlert({
        userEmail: email,
        fullName: staff?.fullName || "Healthcare User",
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Non-blocking security notification
    }

    return NextResponse.json({
      success: true,
      message: "Your password has been successfully reset. Please sign in with your new password.",
      portalScope,
    });
  } catch (err: any) {
    console.error("Reset password handler error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to reset password. Please try again." },
      { status: 500 }
    );
  }
}
