import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { Database, UserRole, Profile } from "@/types/database";
import { staffStore } from "@/services/staffStore";
import { donorStore } from "@/services/donorStore";
import { sessionManager, getSessionCookieName } from "@/lib/auth/sessionManager";
import { accountSecurity } from "@/lib/auth/accountSecurity";
import {
  PortalScope,
  PORTAL_COOKIE_NAMES,
  getPortalFromPathname,
  isRoleAuthorizedForPortal,
  isUserAuthorizedForPortal,
  PORTAL_COOKIE_OPTIONS,
} from "@/lib/auth/portalAuth";

if (typeof (globalThis as any).WebSocket === "undefined") {
  (globalThis as any).WebSocket = class WebSocket {};
}

/**
 * Resolves the appropriate portal scope based on explicit parameter, request headers, or active cookies.
 */
export function resolvePortalScope(explicitScope?: PortalScope, cookieStore?: any): PortalScope {
  if (explicitScope) return explicitScope;

  try {
    const reqHeaders = headers();
    const referer = reqHeaders.get("referer") || "";
    if (referer) {
      try {
        const url = new URL(referer);
        const portal = getPortalFromPathname(url.pathname);
        if (portal) return portal;
      } catch {}
    }
    const pathCandidate =
      reqHeaders.get("x-pathname") ||
      reqHeaders.get("x-matched-path") ||
      reqHeaders.get("x-invoke-path") ||
      reqHeaders.get("next-url") ||
      "";
    if (pathCandidate) {
      const portal = getPortalFromPathname(pathCandidate);
      if (portal) return portal;
    }
  } catch {}

  // Check active cookies
  if (cookieStore) {
    try {
      if (cookieStore.get(PORTAL_COOKIE_NAMES.hospital)) return "hospital";
      if (cookieStore.get(PORTAL_COOKIE_NAMES.donor)) return "donor";
      if (cookieStore.get(PORTAL_COOKIE_NAMES.admin)) return "admin";
      if (cookieStore.get(PORTAL_COOKIE_NAMES.imaging)) return "imaging";
    } catch {}
  }

  return "hospital";
}

/**
 * Creates a server-side Supabase client for Server Components, Server Actions, and Route Handlers.
 * Synchronizes sessions via Next.js HTTP-only, portal-scoped cookies securely.
 */
export async function createClient(portalScope?: PortalScope) {
  let cookieStore: any = null;
  try {
    cookieStore = cookies();
  } catch {}

  const resolvedPortal = resolvePortalScope(portalScope, cookieStore);
  let cookieName = PORTAL_COOKIE_NAMES[resolvedPortal];

  // Seamless fallback for existing active sessions using default/legacy Supabase cookie name
  if (cookieStore && !cookieStore.get(cookieName) && !cookieStore.get(`${cookieName}.0`)) {
    try {
      const all = cookieStore.getAll?.() || [];
      const legacyCookie = all.find((c: any) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
      if (legacyCookie) {
        cookieName = legacyCookie.name.split(".")[0];
      }
    } catch {}
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookieOptions: {
        name: cookieName,
        ...PORTAL_COOKIE_OPTIONS,
      },
      cookies: {
        getAll() {
          return cookieStore ? cookieStore.getAll() : [];
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          if (!cookieStore) return;
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                ...PORTAL_COOKIE_OPTIONS,
              })
            );
          } catch {
            // The `setAll` method was called from a Server Component.
          }
        },
      },
    }
  );
}

/**
 * Retrieves the currently authenticated user along with their database profile and role.
 * Validates portal authorization when portalScope is specified.
 */
export async function getCurrentUser(portalScope?: PortalScope) {
  let cookieStore: any = null;
  try {
    cookieStore = cookies();
  } catch {}

  const resolvedPortal = resolvePortalScope(portalScope, cookieStore);
  const sidCookieName = getSessionCookieName(resolvedPortal);
  let sessionId = cookieStore?.get(sidCookieName)?.value;

  const supabase = await createClient(portalScope);
  
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    let authenticatedUserId: string | null = null;
    let baseUser: any = null;
    let isStaffSession = false;
    let isDonorSession = false;

    if (!authError && user) {
      authenticatedUserId = user.id;
      baseUser = user;
    } else {
      // Authoritative Staff Session Fallback (when user authenticates with hospital staff credentials)
      const staffCookie = cookieStore?.get(`orbinova_staff_${resolvedPortal}`)?.value;
      if (staffCookie) {
        try {
          const payload = JSON.parse(Buffer.from(staffCookie, "base64").toString("utf-8"));
          if (payload?.userId) {
            const staff = staffStore.get(payload.userId) || (payload.email ? staffStore.get(payload.email) : undefined);
            if (staff && staff.isActive !== false) {
              authenticatedUserId = staff.userId;
              if (!sessionId && payload.sessionId) {
                sessionId = payload.sessionId;
              }
              isStaffSession = true;
              baseUser = {
                id: staff.userId,
                email: staff.email || payload.email,
                user_metadata: {
                  full_name: staff.fullName,
                  role: payload.role || "hospital",
                  must_change_password: staff.mustChangePassword ?? false,
                },
                profile: {
                  id: staff.userId,
                  full_name: staff.fullName,
                  email: staff.email || payload.email,
                  phone: staff.phone || null,
                  role: payload.role || "hospital",
                  avatar_url: null,
                  is_active: true,
                  created_at: staff.updatedAt || new Date().toISOString(),
                  updated_at: staff.updatedAt || new Date().toISOString(),
                } as Profile,
              };
            }
          }
        } catch {}
      }

      // Authoritative Voluntary Donor Session Fallback
      const donorCookie =
        cookieStore?.get("orbinova_donor")?.value ||
        cookieStore?.get(`orbinova_donor_${resolvedPortal}`)?.value;
      if (!authenticatedUserId && donorCookie) {
        try {
          const payload = JSON.parse(Buffer.from(donorCookie, "base64").toString("utf-8"));
          if (payload?.userId) {
            const donor =
              donorStore.get(payload.userId) ||
              (payload.email ? donorStore.get(payload.email) : undefined);
            if (donor && donor.isActive !== false) {
              authenticatedUserId = donor.userId;
              if (!sessionId && payload.sessionId) {
                sessionId = payload.sessionId;
              }
              isDonorSession = true;
              baseUser = {
                id: donor.userId,
                email: donor.email || payload.email,
                user_metadata: {
                  full_name: donor.fullName,
                  role: "donor",
                  must_change_password: donor.mustChangePassword ?? false,
                  organization_id: donor.organizationId,
                },
                profile: {
                  id: donor.userId,
                  full_name: donor.fullName,
                  email: donor.email || payload.email,
                  phone: donor.phone || null,
                  role: "donor",
                  avatar_url: null,
                  is_active: true,
                  created_at: donor.updatedAt || new Date().toISOString(),
                  updated_at: donor.updatedAt || new Date().toISOString(),
                } as Profile,
              };
            }
          }
        } catch {}
      }
    }

    if (!authenticatedUserId || !baseUser) {
      return null;
    }

    // ADMINISTRATIVE SUSPENSION & SECURITY LOCKOUT BARRIER
    // Neither administratively suspended accounts nor security-locked accounts can access protected resources
    const suspension = await accountSecurity.isAccountSuspended(authenticatedUserId);
    if (suspension.isSuspended) {
      return null;
    }

    if (baseUser.email) {
      const emailSuspension = await accountSecurity.isAccountSuspended(baseUser.email);
      if (emailSuspension.isSuspended) {
        return null;
      }
      const lockout = accountSecurity.isAccountLocked(baseUser.email);
      if (lockout.isLocked) {
        return null;
      }
    }

    // SINGLE ACTIVE SESSION PER ACCOUNT ENFORCEMENT
    // Validate that the request's session matches the authoritative active session for this user.
    // If the account logged in on another browser/device, activeRecord will not match and access is immediately revoked.
    const activeRecord = sessionManager.getActiveSession(authenticatedUserId);
    if (activeRecord) {
      if (!sessionId || !sessionManager.validateSession(authenticatedUserId, sessionId)) {
        return null;
      }
    }

    if (isStaffSession || isDonorSession) {
      const role = (baseUser.user_metadata?.role || (isDonorSession ? "donor" : "hospital")) as UserRole;
      if (portalScope && !isRoleAuthorizedForPortal(role, portalScope)) {
        return null;
      }
      return baseUser;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", baseUser.id)
      .single();

    const profile = profileData as (Profile & { is_suspended?: boolean }) | null;

    if (profile && (profile.is_active === false || profile.is_suspended === true)) {
      return null;
    }

    if (profileError || !profile) {
      // Fallback role resolution
      const fallbackRole = (baseUser.user_metadata?.role as UserRole) || "donor";
      
      // If portalScope specified, enforce authorization
      if (portalScope && !isRoleAuthorizedForPortal(fallbackRole, portalScope)) {
        return null;
      }

      return {
        ...baseUser,
        profile: {
          id: baseUser.id,
          full_name: baseUser.user_metadata?.full_name || null,
          email: baseUser.email || "",
          phone: baseUser.user_metadata?.phone || null,
          role: fallbackRole,
          avatar_url: null,
          is_active: true,
          created_at: baseUser.created_at || new Date().toISOString(),
          updated_at: baseUser.created_at || new Date().toISOString(),
        } as Profile,
      };
    }

    // Verify role authorization against portal scope with shared user identity support
    const hasDonor = portalScope === "donor" ? !!(donorStore.get(baseUser.id) || donorStore.get(baseUser.email)) : false;
    const hasStaff = portalScope === "hospital" ? (isStaffSession || !!(staffStore.get(baseUser.id) || staffStore.get(baseUser.email))) : false;

    if (portalScope && !isUserAuthorizedForPortal(baseUser.id, baseUser.email, profile.role, portalScope, { hasDonorProfile: hasDonor, hasStaffMembership: hasStaff })) {
      return null;
    }

    const adaptedProfile: Profile = {
      ...(profile as Profile),
      // If a staff member accesses the donor portal, adapt profile context role to donor
      role: portalScope === "donor" && hasDonor ? ("donor" as UserRole) : profile.role,
    };

    return {
      ...baseUser,
      profile: adaptedProfile,
    };
  } catch (err) {
    console.error("Error fetching current user:", err);
    return null;
  }
}
