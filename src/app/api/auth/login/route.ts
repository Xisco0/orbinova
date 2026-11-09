import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { Database, UserRole } from "@/types/database";
import {
  PortalScope,
  PORTAL_COOKIE_NAMES,
  PORTAL_COOKIE_OPTIONS,
  isRoleAuthorizedForPortal,
  isUserAuthorizedForPortal,
} from "@/lib/auth/portalAuth";
import { ROLE_PORTAL_MAP } from "@/constants/theme";
import { accountSecurity } from "@/lib/auth/accountSecurity";
import { rateLimiter } from "@/lib/auth/rateLimiter";
import { staffStore } from "@/services/staffStore";
import { donorStore } from "@/services/donorStore";
import { sessionManager, getSessionCookieName } from "@/lib/auth/sessionManager";
import { centralizedAuditService } from "@/services/centralizedAuditService";

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const ip = forwarded.split(",")[0].trim();
    if (ip) return ip;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();
  return "127.0.0.1";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, portalScope = "hospital" } = body as {
      email?: string;
      password?: string;
      portalScope?: PortalScope;
    };

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const clientIp = getClientIp(request);

    // =========================================================================
    // 1. PROTECTION A: LOGIN RATE LIMITING (IP + Normalized Email)
    // Cooldown expires automatically after 5 minutes.
    // =========================================================================
    const rateLimitPreCheck = rateLimiter.checkLimit({ ip: clientIp, email: normalizedEmail });
    if (rateLimitPreCheck.isLimited) {
      return NextResponse.json(
        {
          success: false,
          error: rateLimitPreCheck.message || "Too many login attempts. Please try again in 5 minutes.",
          rateLimited: true,
          remainingSeconds: rateLimitPreCheck.remainingSeconds,
          retryAfter: rateLimitPreCheck.remainingSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimitPreCheck.remainingSeconds),
          },
        }
      );
    }

    // =========================================================================
    // 2. PROTECTION B: ACCOUNT LOCKOUT (5 Consecutive Incorrect Passwords)
    // Requires authorized administrator recovery. Does NOT auto-unlock on timer.
    // =========================================================================
    const lockoutStatus = accountSecurity.isAccountLocked(normalizedEmail);
    if (lockoutStatus.isLocked) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Your account has been locked due to multiple unsuccessful login attempts. Please contact your institution administrator for assistance.",
          isLocked: true,
          lockedAt: lockoutStatus.lockedAt,
        },
        { status: 423 }
      );
    }

    // =========================================================================
    // 3. ATOMIC RATE LIMIT ATTEMPT REGISTRATION
    // Tracks requests atomically across concurrent requests and server instances.
    // =========================================================================
    const rateLimitAttempt = await rateLimiter.recordAttempt({ ip: clientIp, email: normalizedEmail });
    if (rateLimitAttempt.isLimited) {
      return NextResponse.json(
        {
          success: false,
          error: rateLimitAttempt.message || "Too many login attempts. Please try again in 5 minutes.",
          rateLimited: true,
          remainingSeconds: rateLimitAttempt.remainingSeconds,
          retryAfter: rateLimitAttempt.remainingSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimitAttempt.remainingSeconds),
          },
        }
      );
    }

    const requestedScope: PortalScope | undefined = portalScope;
    const initialScope: PortalScope =
      requestedScope ||
      (normalizedEmail === "superadmin@orbinova.com" || normalizedEmail.includes("admin")
        ? "admin"
        : normalizedEmail === "donor@orbinova.com" || normalizedEmail.includes("donor")
        ? "donor"
        : "hospital");

    const scope: PortalScope = initialScope;
    const cookieName = PORTAL_COOKIE_NAMES[scope] || PORTAL_COOKIE_NAMES.hospital;

    const response = NextResponse.json({ success: true });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

    const supabase = createServerClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookieOptions: {
          name: cookieName,
          ...PORTAL_COOKIE_OPTIONS,
        },
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, {
                ...options,
                ...PORTAL_COOKIE_OPTIONS,
              });
            });
          },
        },
      }
    );

    // =========================================================================
    // 4. ATTEMPT PASSWORD AUTHENTICATION
    // =========================================================================
    let authUser: { id: string; email: string; user_metadata?: any } | null = null;
    let authRole: UserRole = "hospital";
    let authFullName: string | null = null;
    let isStaffSession = false;

    let authData: any = null;
    let authError: any = null;
    try {
      const res = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      authData = res.data;
      authError = res.error;
    } catch (err: any) {
      authError = err;
    }

    if (!authError && authData?.user) {
      authUser = {
        id: authData.user.id,
        email: authData.user.email || normalizedEmail,
        user_metadata: authData.user.user_metadata,
      };
    } else {
      // Authoritative Hospital/Blood-Bank Staff Credential Verification
      // Handles PBKDF2 permanent passwords, initial temporary passwords, and default first-login credentials
      const staffVerify = staffStore.verifyCredentials(normalizedEmail, password);

      if (staffVerify.valid && staffVerify.staff && staffVerify.staff.isActive !== false) {
        isStaffSession = true;
        authUser = {
          id: staffVerify.staff.userId,
          email: staffVerify.staff.email || normalizedEmail,
          user_metadata: {
            full_name: staffVerify.staff.fullName,
            role: "hospital",
            must_change_password: staffVerify.mustChangePassword,
            organization_id: staffVerify.staff.organizationId,
          },
        };
        authFullName = staffVerify.staff.fullName;
        authRole = "hospital";
      }
    }

    if (!authUser) {
      // Record failed password attempt
      const attemptResult = await accountSecurity.recordFailedAttempt(normalizedEmail, {
        ip: clientIp,
        userAgent: request.headers.get("user-agent") || undefined,
      });

      if (attemptResult.isLocked) {
        await centralizedAuditService.record({
          action: "ACCOUNT_LOCKED",
          category: "authentication",
          entityType: "profiles",
          status: "failure",
          ipAddress: clientIp,
          userAgent: request.headers.get("user-agent") || undefined,
          description: `Account locked after consecutive failed login attempts: ${normalizedEmail}`,
          metadata: { email: normalizedEmail, attempts: attemptResult.failedCount },
        });

        return NextResponse.json(
          {
            success: false,
            error:
              "Your account has been locked due to multiple unsuccessful login attempts. Please contact your institution administrator for assistance.",
            isLocked: true,
          },
          { status: 423 }
        );
      }

      await centralizedAuditService.record({
        action: "USER_LOGIN_FAILED",
        category: "authentication",
        entityType: "profiles",
        status: "failure",
        ipAddress: clientIp,
        userAgent: request.headers.get("user-agent") || undefined,
        description: `Failed login attempt for ${normalizedEmail}`,
        metadata: { email: normalizedEmail, remainingAttempts: attemptResult.remainingAttempts },
      });

      // Generic authentication error: avoids revealing whether an email address exists
      return NextResponse.json(
        {
          success: false,
          error: "Invalid email or password.",
          isLocked: false,
        },
        { status: 401 }
      );
    }

    // =========================================================================
    // 5. SUCCESSFUL AUTHENTICATION
    // Reset rate limiter and failed password attempts upon successful verification.
    // =========================================================================
    await rateLimiter.clearLimit({ ip: clientIp, email: normalizedEmail });
    accountSecurity.recordSuccessfulLogin(normalizedEmail);

    // Role and active status verification
    let role: UserRole = authRole;
    let isActive = true;
    let profileFullName = authFullName;
    let profileMustChange = false;

    if (!isStaffSession) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("role, is_active, full_name, must_change_password")
        .eq("id", authUser.id)
        .single();

      const profile = profileData as { role?: UserRole; is_active?: boolean; full_name?: string; must_change_password?: boolean } | null;
      role = (profile?.role || authUser.user_metadata?.role || "donor") as UserRole;
      isActive = profile?.is_active ?? true;
      profileFullName = profile?.full_name || authUser.user_metadata?.full_name || null;
      profileMustChange = profile?.must_change_password === true;
    }

    if (!isActive) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { success: false, error: "Your account has been deactivated. Please contact support." },
        { status: 403 }
      );
    }

    // Strict portal authorization check with shared identity & multi-profile support
    const hasDonor = !!(donorStore.get(authUser.id) || donorStore.get(normalizedEmail));
    const hasStaff = isStaffSession || !!(staffStore.get(authUser.id) || staffStore.get(normalizedEmail));

    const isAuthorized = isUserAuthorizedForPortal(authUser.id, normalizedEmail, role, scope, {
      hasDonorProfile: hasDonor,
      hasStaffMembership: hasStaff,
    });

    if (!isAuthorized) {
      await supabase.auth.signOut();
      return NextResponse.json(
        {
          success: false,
          error: `This account is not authorized to access the ${scope} portal.`,
        },
        { status: 403 }
      );
    }

    const staffRecord = staffStore.get(normalizedEmail) || staffStore.get(authUser.id);
    const mustChangePassword =
      staffRecord?.mustChangePassword !== undefined
        ? staffRecord.mustChangePassword
        : (profileMustChange || authUser.user_metadata?.must_change_password === true);

    // For admin users, guarantee that the session and cookies are strictly admin-scoped
    const effectiveScope: PortalScope = role === "admin" ? "admin" : scope;

    // Requirement 8: Require them to change their temporary password after their first successful login.
    // Requirement 9: Redirect them to the dashboard appropriate for their assigned role (after password change).
    const defaultRedirect = mustChangePassword
      ? "/reset-password?first_login=true"
      : effectiveScope === "admin" || role === "admin"
      ? "/admin/dashboard"
      : effectiveScope === "donor" || (role === "donor" && !hasStaff)
      ? "/donor/dashboard"
      : effectiveScope === "imaging" || (role as string) === "radiologist" || staffRecord?.memberRole === "radiologist"
      ? "/imaging"
      : ROLE_PORTAL_MAP[role] || "/hospital/dashboard";

    // Set cookie headers on response and return payload
    const finalResponse = NextResponse.json({
      success: true,
      role,
      user: {
        id: authUser.id,
        email: authUser.email,
        fullName: profileFullName || authUser.user_metadata?.full_name || null,
      },
      mustChangePassword,
      redirectTo: defaultRedirect,
    });
    finalResponse.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");

    // Copy cookies set during signInWithPassword to final response
    response.cookies.getAll().forEach((c) => {
      finalResponse.cookies.set(c.name, c.value, {
        ...PORTAL_COOKIE_OPTIONS,
      });

      // If authenticating as admin, ensure sb_admin_session is populated
      if (effectiveScope === "admin" && c.name.startsWith(PORTAL_COOKIE_NAMES.hospital)) {
        const adminCookieName = c.name.replace(PORTAL_COOKIE_NAMES.hospital, PORTAL_COOKIE_NAMES.admin);
        finalResponse.cookies.set(adminCookieName, c.value, {
          ...PORTAL_COOKIE_OPTIONS,
        });
        finalResponse.cookies.delete(c.name);
      }
    });

    // =========================================================================
    // 6. SINGLE ACTIVE SESSION PER ACCOUNT ENFORCEMENT
    // Atomically generate new cryptographically secure session ID.
    // Immediately revokes any prior active session on other devices/browsers.
    // Latest successful login wins.
    // =========================================================================
    const activeSessionId = await sessionManager.createSession(authUser.id, {
      portalScope: effectiveScope,
      ip: clientIp,
      userAgent: request.headers.get("user-agent") || undefined,
    });

    const sidCookieName = getSessionCookieName(effectiveScope);
    finalResponse.cookies.set(sidCookieName, activeSessionId, {
      ...PORTAL_COOKIE_OPTIONS,
      name: sidCookieName,
    });

    // If switching to admin, clear any lingering hospital session cookies
    if (effectiveScope === "admin") {
      finalResponse.cookies.delete(getSessionCookieName("hospital"));
    }

    // Set orbinova_staff_${scope} cookie for staff sessions
    if (isStaffSession || staffRecord) {
      const staffSessionToken = Buffer.from(
        JSON.stringify({
          userId: authUser.id,
          email: authUser.email,
          role,
          scope,
          sessionId: activeSessionId,
          iat: Date.now(),
        })
      ).toString("base64");

      finalResponse.cookies.set(`orbinova_staff_${scope}`, staffSessionToken, {
        ...PORTAL_COOKIE_OPTIONS,
      });
    }

    // 7. Authoritatively Record Audit Log for Successful Authentication
    try {
      await centralizedAuditService.record({
        userId: authUser.id,
        actorName: profileFullName || authFullName || authUser.user_metadata?.full_name || "User",
        actorRole: role,
        organizationId: staffRecord?.organizationId || null,
        action: "USER_LOGIN_SUCCESS",
        category: "authentication",
        entityType: "profiles",
        entityId: authUser.id,
        status: "success",
        ipAddress: clientIp,
        userAgent: request.headers.get("user-agent") || undefined,
        description: `Successful sign-in to ${effectiveScope} portal (${role})`,
        metadata: {
          email: normalizedEmail,
          portalScope: effectiveScope,
          mustChangePassword,
        },
      });
    } catch (auditErr) {
      console.warn("Login audit recording notice:", auditErr);
    }

    return finalResponse;
  } catch (err: any) {
    console.error("API login error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "An unexpected error occurred during authentication." },
      { status: 500 }
    );
  }
}
