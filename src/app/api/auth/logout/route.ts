import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { Database } from "@/types/database";
import {
  PortalScope,
  PORTAL_COOKIE_NAMES,
  PORTAL_COOKIE_OPTIONS,
} from "@/lib/auth/portalAuth";
import { sessionManager, getSessionCookieName } from "@/lib/auth/sessionManager";
import { centralizedAuditService } from "@/services/centralizedAuditService";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const portalScope: PortalScope = body.portalScope || "hospital";
    const targetCookie = PORTAL_COOKIE_NAMES[portalScope];

    const response = NextResponse.json({ success: true, loggedOutPortal: portalScope });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

    // Initialize client for the specific portal to notify Supabase if needed
    const supabase = createServerClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookieOptions: {
          name: targetCookie,
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

    // Revoke active session on backend
    const sidCookieName = getSessionCookieName(portalScope);
    const sidValue = request.cookies.get(sidCookieName)?.value;

    try {
      if (sidValue) {
        await sessionManager.revokeBySessionId(sidValue);
      }

      let userId: string | null = null;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
      } else {
        const staffCookie = request.cookies.get(`orbinova_staff_${portalScope}`)?.value;
        if (staffCookie) {
          try {
            const payload = JSON.parse(Buffer.from(staffCookie, "base64").toString("utf-8"));
            if (payload?.userId) userId = payload.userId;
            if (payload?.sessionId) {
              await sessionManager.revokeBySessionId(payload.sessionId);
            }
          } catch {}
        }
      }

      if (userId) {
        await sessionManager.revokeSession(userId);

        // Record Audit Log for user logout
        try {
          await centralizedAuditService.record({
            userId,
            action: "USER_LOGOUT",
            category: "authentication",
            entityType: "profiles",
            entityId: userId,
            status: "success",
            description: `User logged out of ${portalScope} portal`,
            metadata: {
              portalScope,
            },
          });
        } catch (auditErr) {
          console.warn("Logout audit recording notice:", auditErr);
        }
      }
    } catch {}

    try {
      await supabase.auth.signOut();
    } catch {
      // Continue even if remote signOut fails
    }

    // Surgically delete ONLY this portal's session cookies
    const allCookies = request.cookies.getAll();
    allCookies.forEach((c) => {
      if (
        c.name === targetCookie ||
        c.name.startsWith(`${targetCookie}.`) ||
        c.name === `orbinova_staff_${portalScope}` ||
        c.name === sidCookieName
      ) {
        response.cookies.delete(c.name);
        response.cookies.set(c.name, "", {
          path: "/",
          maxAge: 0,
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });
      }
    });

    return response;
  } catch (err: any) {
    console.error("API logout error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Logout failed." },
      { status: 500 }
    );
  }
}
