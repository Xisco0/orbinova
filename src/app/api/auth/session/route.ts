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
import { sessionManager, getSessionCookieName } from "@/lib/auth/sessionManager";
import { centralizedAuditService } from "@/services/centralizedAuditService";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const portalScope: PortalScope = (searchParams.get("portal") as PortalScope) || "hospital";
    const cookieName = PORTAL_COOKIE_NAMES[portalScope];

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
    }

    if (!authenticatedUserId || !baseUser) {
      return NextResponse.json(
        { authenticated: false, portal: portalScope, user: null },
        { status: 401 }
      );
    }

    // SINGLE ACTIVE SESSION CHECK
    const activeRecord = sessionManager.getActiveSession(authenticatedUserId);
    if (activeRecord) {
      if (!sessionId || !sessionManager.validateSession(authenticatedUserId, sessionId)) {
        // Record audit event for session revocation
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
    } else {
      // Session record absent (revoked, logged out, or invalidated)
      return NextResponse.json(
        {
          authenticated: false,
          portal: portalScope,
          user: null,
          sessionRevoked: true,
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

    if (isStaffSession) {
      const role = (baseUser.role || "hospital") as UserRole;
      const isAuthorized = isRoleAuthorizedForPortal(role, portalScope);
      return NextResponse.json({
        authenticated: true,
        portal: portalScope,
        isAuthorized,
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
