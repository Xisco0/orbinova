import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/types/database";
import {
  PortalScope,
  PORTAL_COOKIE_NAMES,
  PORTAL_COOKIE_OPTIONS,
  getPortalFromPathname,
} from "@/lib/auth/portalAuth";

/**
 * Creates a browser-side Supabase client for client components.
 * Scoped to specific portal sessions (hospital, donor, admin, imaging)
 * to prevent multi-tab cross-contamination.
 */
export function createClient(portalScope?: PortalScope) {
  let scope = portalScope;
  if (!scope && typeof window !== "undefined") {
    scope = getPortalFromPathname(window.location.pathname) || "hospital";
  }
  const resolvedScope = scope || "hospital";
  const cookieName = PORTAL_COOKIE_NAMES[resolvedScope];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    isSingleton: false,
    cookieOptions: {
      name: cookieName,
      ...PORTAL_COOKIE_OPTIONS,
    },
    auth: {
      storageKey: cookieName,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}
