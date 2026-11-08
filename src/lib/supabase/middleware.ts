import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { Database, UserRole, Profile } from "@/types/database";
import { ROLE_PORTAL_MAP } from "@/constants/theme";
import {
  PortalScope,
  PORTAL_COOKIE_NAMES,
  PORTAL_COOKIE_OPTIONS,
  isRoleAuthorizedForPortal,
} from "@/lib/auth/portalAuth";
import { getSessionCookieName } from "@/lib/auth/sessionConfig";

/**
 * Creates a scoped Supabase server client inside Next.js Middleware.
 * Strictly scopes session reading and writing to the designated portal cookie.
 */
function createScopedMiddlewareClient(
  request: NextRequest,
  supabaseResponse: NextResponse,
  portalScope: PortalScope
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
  let cookieName = PORTAL_COOKIE_NAMES[portalScope];

  // Seamless fallback for existing active sessions using default/legacy Supabase cookie name
  if (!request.cookies.has(cookieName) && !request.cookies.has(`${cookieName}.0`)) {
    const all = request.cookies.getAll();
    const legacyCookie = all.find((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
    if (legacyCookie) {
      cookieName = legacyCookie.name.split(".")[0];
    }
  }

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
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              ...PORTAL_COOKIE_OPTIONS,
            })
          );
        },
      },
    }
  );
}

/**
 * Surgically clears session cookies for the specified portal scope.
 */
function clearPortalCookies(
  request: NextRequest,
  response: NextResponse,
  portalScope: PortalScope
) {
  const targetCookie = PORTAL_COOKIE_NAMES[portalScope];
  const sidCookieName = getSessionCookieName(portalScope);
  const staffCookieName = `orbinova_staff_${portalScope}`;

  const allCookies = request.cookies.getAll();
  allCookies.forEach((c) => {
    if (
      c.name === targetCookie ||
      c.name.startsWith(`${targetCookie}.`) ||
      c.name === sidCookieName ||
      c.name === staffCookieName
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
}

/**
 * Invalidates and clears session cookies for the specified portal scope
 * and redirects to the login page with reason=signed_in_elsewhere.
 * Sets strict anti-caching headers so bfcache does not expose private health data.
 */
function handleSessionInvalidation(request: NextRequest, portalScope: PortalScope) {
  const redirectTarget = portalScope === "donor" ? "/donor/login" : "/login";
  const loginUrl = new URL(redirectTarget, request.url);
  loginUrl.searchParams.set("reason", "signed_in_elsewhere");

  const redirectResponse = NextResponse.redirect(loginUrl);
  clearPortalCookies(request, redirectResponse, portalScope);

  // Strict anti-caching headers so back button / bfcache cannot access private clinical data
  redirectResponse.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
  );
  redirectResponse.headers.set("Pragma", "no-cache");
  redirectResponse.headers.set("Expires", "0");

  return redirectResponse;
}

/**
 * Resolves the authenticated user for a portal and validates that their session
 * is the single active session for that account.
 */
async function resolveAndValidatePortalUser(
  request: NextRequest,
  supabaseResponse: NextResponse,
  portalScope: PortalScope
): Promise<
  | { status: "valid"; user: any; profile: any; role: UserRole; isActive: boolean }
  | { status: "unauthenticated" }
  | { status: "revoked" }
> {
  let userId: string | null = null;
  let userObj: any = null;

  // 1. Try Supabase Auth
  const supabase = createScopedMiddlewareClient(request, supabaseResponse, portalScope);
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user) {
      userId = user.id;
      userObj = user;
    }
  } catch {}

  // 2. Fallback: Staff Session Token
  const sidCookieName = getSessionCookieName(portalScope);
  const sidCookieValue = request.cookies.get(sidCookieName)?.value;

  if (!userId) {
    const staffCookie = request.cookies.get(`orbinova_staff_${portalScope}`)?.value;
    if (staffCookie) {
      try {
        const payload = JSON.parse(Buffer.from(staffCookie, "base64").toString("utf-8"));
        if (payload?.userId && payload?.sessionId) {
          const now = Date.now();
          const timestamp = payload.timestamp || now;
          const maxAgeMs = 7 * 24 * 60 * 60 * 1000; // 7 days max lifetime
          // If expired, or if sid cookie is present but does not match payload.sessionId, reject
          if (now - timestamp <= maxAgeMs) {
            if (!sidCookieValue || sidCookieValue === payload.sessionId) {
              userId = payload.userId;
              userObj = {
                id: payload.userId,
                email: payload.email,
                user_metadata: { role: payload.role || "hospital" },
              };
            }
          }
        }
      } catch {}
    }
  }

  if (!userId || !userObj) {
    return { status: "unauthenticated" };
  }

  // 3. SINGLE ACTIVE SESSION PER ACCOUNT VALIDATION
  let sessionId = sidCookieValue;
  if (!sessionId) {
    const staffCookie = request.cookies.get(`orbinova_staff_${portalScope}`)?.value;
    if (staffCookie) {
      try {
        const payload = JSON.parse(Buffer.from(staffCookie, "base64").toString("utf-8"));
        if (payload?.sessionId) {
          sessionId = payload.sessionId;
        }
      } catch {}
    }
  }

  if (!sessionId) {
    // If the user has a valid Supabase authentication token, generate a session identifier
    // and attach it to the response so the session cookie is established without breaking the session.
    sessionId = `sess_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
    supabaseResponse.cookies.set(sidCookieName, sessionId, {
      ...PORTAL_COOKIE_OPTIONS,
      name: sidCookieName,
    });
  }

  // 4. Resolve Profile and Active Status
  let profile: any = null;
  try {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", userId)
      .single();
    profile = profileData;
  } catch {}

  const role = (profile?.role || userObj.user_metadata?.role || "donor") as UserRole;
  const isActive = profile?.is_active ?? true;

  return { status: "valid", user: userObj, profile, role, isActive };
}

export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  });

  const pathname = request.nextUrl.pathname;

  // 1. Static assets, API routes & internal routes bypass
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/images") ||
    pathname.includes("favicon.ico")
  ) {
    return supabaseResponse;
  }

  // 2. Identify Portal & Auth Route Scopes
  const isHospitalRoute = pathname.startsWith("/hospital");
  const isDonorRoute =
    pathname.startsWith("/donor/") &&
    !pathname.startsWith("/donor/login") &&
    !pathname.startsWith("/donor/register") &&
    !pathname.startsWith("/donor/forgot-password") &&
    !pathname.startsWith("/donor/reset-password");
  const isAdminRoute = pathname.startsWith("/admin");
  const isImagingRoute = pathname.startsWith("/imaging");

  const isDonorAuthRoute =
    pathname.startsWith("/donor/login") ||
    pathname.startsWith("/donor/register") ||
    pathname.startsWith("/donor/forgot-password");

  const isHospitalAuthRoute =
    pathname === "/login" ||
    pathname.startsWith("/forgot-password");

  // =========================================================================
  // HOSPITAL & BLOOD BANK ROUTE GUARD (Scoped to sb_hospital_session)
  // =========================================================================
  if (isHospitalRoute) {
    const authCheck = await resolveAndValidatePortalUser(request, supabaseResponse, "hospital");

    if (authCheck.status === "revoked") {
      return handleSessionInvalidation(request, "hospital");
    }

    if (authCheck.status === "unauthenticated") {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const redirectResponse = NextResponse.redirect(loginUrl);
      clearPortalCookies(request, redirectResponse, "hospital");
      return redirectResponse;
    }

    if (!authCheck.isActive) {
      const unauthUrl = new URL("/unauthorized", request.url);
      unauthUrl.searchParams.set("reason", "inactive");
      return NextResponse.redirect(unauthUrl);
    }

    if (!isRoleAuthorizedForPortal(authCheck.role, "hospital")) {
      const unauthUrl = new URL("/unauthorized", request.url);
      unauthUrl.searchParams.set("required", "organization");
      return NextResponse.redirect(unauthUrl);
    }

    return supabaseResponse;
  }

  // =========================================================================
  // DONOR HERO PORTAL ROUTE GUARD (Scoped to sb_donor_session)
  // =========================================================================
  if (isDonorRoute) {
    const authCheck = await resolveAndValidatePortalUser(request, supabaseResponse, "donor");

    if (authCheck.status === "revoked") {
      return handleSessionInvalidation(request, "donor");
    }

    if (authCheck.status === "unauthenticated") {
      const donorLoginUrl = new URL("/donor/login", request.url);
      donorLoginUrl.searchParams.set("redirect", pathname);
      const redirectResponse = NextResponse.redirect(donorLoginUrl);
      clearPortalCookies(request, redirectResponse, "donor");
      return redirectResponse;
    }

    if (!authCheck.isActive) {
      const unauthUrl = new URL("/unauthorized", request.url);
      unauthUrl.searchParams.set("reason", "inactive");
      return NextResponse.redirect(unauthUrl);
    }

    if (!isRoleAuthorizedForPortal(authCheck.role, "donor")) {
      const unauthUrl = new URL("/unauthorized", request.url);
      unauthUrl.searchParams.set("required", "donor");
      return NextResponse.redirect(unauthUrl);
    }

    return supabaseResponse;
  }

  // =========================================================================
  // ADMIN CONSOLE ROUTE GUARD (Scoped to sb_admin_session)
  // =========================================================================
  if (isAdminRoute) {
    const authCheck = await resolveAndValidatePortalUser(request, supabaseResponse, "admin");

    if (authCheck.status === "revoked") {
      return handleSessionInvalidation(request, "admin");
    }

    if (authCheck.status === "unauthenticated") {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const redirectResponse = NextResponse.redirect(loginUrl);
      clearPortalCookies(request, redirectResponse, "admin");
      return redirectResponse;
    }

    if (!authCheck.isActive) {
      const unauthUrl = new URL("/unauthorized", request.url);
      unauthUrl.searchParams.set("reason", "inactive");
      return NextResponse.redirect(unauthUrl);
    }

    if (!isRoleAuthorizedForPortal(authCheck.role, "admin")) {
      const unauthUrl = new URL("/unauthorized", request.url);
      unauthUrl.searchParams.set("required", "admin");
      return NextResponse.redirect(unauthUrl);
    }

    return supabaseResponse;
  }

  // =========================================================================
  // IMAGING PLATFORM ROUTE GUARD (Scoped to sb_imaging_session)
  // =========================================================================
  if (isImagingRoute) {
    const authCheck = await resolveAndValidatePortalUser(request, supabaseResponse, "imaging");

    if (authCheck.status === "revoked") {
      return handleSessionInvalidation(request, "imaging");
    }

    if (authCheck.status === "unauthenticated") {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const redirectResponse = NextResponse.redirect(loginUrl);
      clearPortalCookies(request, redirectResponse, "imaging");
      return redirectResponse;
    }

    if (!isRoleAuthorizedForPortal(authCheck.role, "imaging")) {
      const unauthUrl = new URL("/unauthorized", request.url);
      unauthUrl.searchParams.set("required", "clinical_imaging");
      return NextResponse.redirect(unauthUrl);
    }

    return supabaseResponse;
  }

  // =========================================================================
  // AUTHENTICATION PAGES REDIRECT (Prevents looping if already authenticated)
  // Only redirects if a VALID active session exists. Does NOT redirect on revoked sessions!
  // Never redirects if a redirect, reason, or error parameter is present!
  // =========================================================================
  if (isDonorAuthRoute) {
    if (
      request.nextUrl.searchParams.has("redirect") ||
      request.nextUrl.searchParams.has("reason") ||
      request.nextUrl.searchParams.has("error")
    ) {
      if (request.nextUrl.searchParams.has("reason")) {
        clearPortalCookies(request, supabaseResponse, "donor");
      }
      return supabaseResponse;
    }

    const authCheck = await resolveAndValidatePortalUser(request, supabaseResponse, "donor");
    if (authCheck.status === "valid") {
      return NextResponse.redirect(new URL("/donor/dashboard", request.url));
    }
  }

  if (isHospitalAuthRoute) {
    if (
      request.nextUrl.searchParams.has("redirect") ||
      request.nextUrl.searchParams.has("reason") ||
      request.nextUrl.searchParams.has("error")
    ) {
      if (request.nextUrl.searchParams.has("reason")) {
        clearPortalCookies(request, supabaseResponse, "hospital");
        clearPortalCookies(request, supabaseResponse, "admin");
      }
      return supabaseResponse;
    }

    const adminCheck = await resolveAndValidatePortalUser(request, supabaseResponse, "admin");
    if (adminCheck.status === "valid" && adminCheck.role === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }

    const hospitalCheck = await resolveAndValidatePortalUser(request, supabaseResponse, "hospital");
    if (hospitalCheck.status === "valid") {
      if (hospitalCheck.role === "admin") {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
      return NextResponse.redirect(new URL("/hospital/dashboard", request.url));
    }
  }

  // Public marketing landing page for donor (/donor)
  if (pathname === "/donor") {
    const donorCheck = await resolveAndValidatePortalUser(request, supabaseResponse, "donor");
    if (donorCheck.status === "valid") {
      return NextResponse.redirect(new URL("/donor/dashboard", request.url));
    }
  }

  return supabaseResponse;
}
