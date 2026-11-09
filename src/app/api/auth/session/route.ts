import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { Database, UserRole } from "@/types/database";
import {
  PortalScope,
  PORTAL_COOKIE_NAMES,
  PORTAL_COOKIE_OPTIONS,
  isRoleAuthorizedForPortal,
} from "@/lib/auth/portalAuth";
import { staffStore } from "@/services/staffStore";
import { donorStore } from "@/services/donorStore";
import { sessionManager, getSessionCookieName } from "@/lib/auth/sessionManager";
import { centralizedAuditService } from "@/services/centralizedAuditService";

export async function GET(request: NextRequest) {
  return handleSessionCheck(request, false);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const isActivity = body?.activity === true;
  return handleSessionCheck(request, isActivity);
}

async function handleSessionCheck(request: NextRequest, isExplicitActivity: boolean) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const portalScope: PortalScope = (searchParams.get("portal") as PortalScope) || "hospital";
    const cookieName = PORTAL_COOKIE_NAMES[portalScope];
    const isActivity = isExplicitActivity || searchParams.get("activity") === "true";

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
          setAll() {},
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.getUser();

    let authenticatedUserId: string | null = null;
    let baseUser: any = null;
    let isStaffSession = false;
    let isDonorSession = false;

    const sidCookieName = getSessionCookieName(portalScope);
    let sessionId = request.cookies.get(sidCookieName)?.value;

    if (!error && user) {
      authenticatedUserId = user.id;
      baseUser = user;
    } else {
      // Check for portal staff session cookie
      const staffCookie = request.cookies.get(`orbinova_staff_${portalScope}`)?.value;
      if (staffCookie) {
        try {
          const payload = JSON.parse(Buffer.from(staffCookie, "base64").toString("utf-8"));
          if (payload?.userId) {
            const staff = staffStore.get(payload.userId) || (payload.email ? staffStore.get(payload.email) : undefined);
            if (staff && staff.isActive !== false) {
              authenticatedUserId = staff.userId;
              isStaffSession = true;
              if (!sessionId && payload.sessionId) {
                sessionId = payload.sessionId;
              }
              baseUser = {
                id: staff.userId,
                email: staff.email || payload.email,
                role: payload.role || "hospital",
                fullName: staff.fullName,
              };
            }
          }
        } catch {}
      }

      // Check for voluntary donor session cookie
      const donorCookie =
        request.cookies.get("orbinova_donor")?.value ||
        request.cookies.get(`orbinova_donor_${portalScope}`)?.value;
      if (!authenticatedUserId && donorCookie) {
        try {
          const payload = JSON.parse(Buffer.from(donorCookie, "base64").toString("utf-8"));
          if (payload?.userId) {
            const donor =
              donorStore.get(payload.userId) ||
              (payload.email ? donorStore.get(payload.email) : undefined);
            if (donor && donor.isActive !== false) {
              authenticatedUserId = donor.userId;
              isDonorSession = true;
              if (!sessionId && payload.sessionId) {
                sessionId = payload.sessionId;
              }
              baseUser = {
                id: donor.userId,
                email: donor.email || payload.email,
                role: "donor",
                fullName: donor.fullName,
              };
            }
          }
        } catch {}
      }
    }

    if (!authenticatedUserId || !baseUser) {
      return NextResponse.json(
        { authenticated: false, portal: portalScope, user: null },
        { status: 401 }
      );
    }

    // Comprehensive session validation (Single active session, inactivity, max lifetime)
    // If sessionId was missing, check if staff payload has it or generate one for authenticated user
    if (!sessionId) {
      sessionId = await sessionManager.createSession(authenticatedUserId, {
        portalScope,
        ip: request.headers.get("x-forwarded-for") || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
      });
    }

    const sessionStatus = sessionManager.checkSessionStatus(authenticatedUserId, sessionId, {
      isMeaningfulActivity: isActivity,
    });

    if (!sessionStatus.isValid) {
      if (sessionStatus.reason === "revoked") {
        try {
          await centralizedAuditService.record({
            userId: authenticatedUserId,
            actorName: baseUser.fullName || baseUser.email || "User",
            actorRole: baseUser.role || "user",
            action: "SESSION_REVOKED_ELSEWHERE",
            category: "authentication",
            entityType: "profiles",
            entityId: authenticatedUserId,
            status: "failure",
            ipAddress: request.headers.get("x-forwarded-for") || undefined,
            userAgent: request.headers.get("user-agent") || undefined,
            description: "Session invalidated because account was signed in on another device or session was revoked",
            metadata: {
              portalScope,
              revokedSessionId: sessionId || null,
            },
          });
        } catch {}

        return NextResponse.json(
          {
            authenticated: false,
            portal: portalScope,
            user: null,
            sessionRevoked: true,
            reason: "signed_in_elsewhere",
            error: "Please sign in again.",
          },
          {
            status: 401,
            headers: {
              "x-session-revoked": "true",
            },
          }
        );
      }

      if (sessionStatus.reason === "inactivity_timeout" || sessionStatus.reason === "max_lifetime_exceeded") {
        return NextResponse.json(
          {
            authenticated: false,
            portal: portalScope,
            user: null,
            sessionRevoked: true,
            reason: sessionStatus.reason,
            error: "Please sign in again.",
          },
          {
            status: 401,
            headers: {
              "x-session-revoked": "true",
            },
          }
        );
      }

      return NextResponse.json(
        {
          authenticated: false,
          portal: portalScope,
          user: null,
          sessionRevoked: false,
          error: "Please sign in again.",
        },
        { status: 401 }
      );
    }

    if (isStaffSession || isDonorSession) {
      const role = (baseUser.role || (isDonorSession ? "donor" : "hospital")) as UserRole;
      const isAuthorized = isRoleAuthorizedForPortal(role, portalScope);
      return NextResponse.json({
        authenticated: true,
        portal: portalScope,
        isAuthorized,
        remainingInactivitySeconds: sessionStatus.remainingInactivitySeconds ?? 1800,
        remainingLifetimeSeconds: sessionStatus.remainingLifetimeSeconds ?? 604800,
        user: {
          id: baseUser.id,
          email: baseUser.email,
          role,
          fullName: baseUser.fullName,
          isActive: true,
        },
      });
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("role, is_active, full_name")
      .eq("id", baseUser.id)
      .single();

    const profile = profileData as { role?: UserRole; is_active?: boolean; full_name?: string } | null;

    const role = (profile?.role || baseUser.user_metadata?.role || "donor") as UserRole;
    const isAuthorized = isRoleAuthorizedForPortal(role, portalScope);

    return NextResponse.json({
      authenticated: true,
      portal: portalScope,
      isAuthorized,
      remainingInactivitySeconds: sessionStatus.remainingInactivitySeconds ?? 1800,
      remainingLifetimeSeconds: sessionStatus.remainingLifetimeSeconds ?? 604800,
      user: {
        id: baseUser.id,
        email: baseUser.email,
        role,
        fullName: profile?.full_name || null,
        isActive: profile?.is_active ?? true,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { authenticated: false, error: err?.message || "Session check failed." },
      { status: 500 }
    );
  }
}
