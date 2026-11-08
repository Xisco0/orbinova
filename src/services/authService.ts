import { createClient } from "@/lib/supabase/client";
import { UserRole } from "@/types/database";
import { ROLE_PORTAL_MAP } from "@/constants/theme";
import { PortalScope, getPortalFromPathname } from "@/lib/auth/portalAuth";

/**
 * Authentication service for ORBINOVA with portal-scoped session isolation.
 * Uses HttpOnly, Secure cookies via dedicated server route handlers
 * to guarantee that multiple tabs (Hospital, Donor, Admin, Imaging)
 * do not overwrite each other's authentication sessions.
 */
export const authService = {
  /**
   * Organization / Admin Login (Hospital, Blood Bank, Admin)
   */
  async loginOrganization(email: string, password: string, portalScope?: PortalScope) {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const scope: PortalScope =
        portalScope ||
        (normalizedEmail === "superadmin@orbinova.com" || normalizedEmail.includes("admin")
          ? "admin"
          : normalizedEmail === "donor@orbinova.com" || normalizedEmail.includes("donor")
          ? "donor"
          : "hospital");

      // Try HttpOnly server-side authentication first
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          portalScope: scope,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        const errorMsg =
          typeof data.error === "string" && data.error.trim().length > 0
            ? data.error
            : "Invalid email or password.";
        return {
          success: false,
          error: errorMsg,
          rateLimited: Boolean(data.rateLimited),
          isLocked: Boolean(data.isLocked),
          remainingSeconds: data.remainingSeconds,
        };
      }

      return {
        success: true,
        role: data.role as UserRole,
        mustChangePassword: Boolean(data.mustChangePassword),
        redirectTo: data.redirectTo || (data.role === "admin" ? "/admin/dashboard" : ROLE_PORTAL_MAP[data.role as UserRole] || "/hospital/dashboard"),
      };
    } catch {
      const normalizedEmail = email.trim().toLowerCase();
      const fallbackScope: PortalScope =
        portalScope ||
        (normalizedEmail.includes("admin") ? "admin" : "hospital");
      // Client-side fallback if fetch fails
      const supabase = createClient(fallbackScope);
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError || !authData.user) {
        return {
          success: false,
          error: authError?.message || "Invalid credentials.",
        };
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("role, is_active")
        .eq("id", authData.user.id)
        .single();

      const profile = profileData as { role?: UserRole; is_active?: boolean } | null;

      const role = (profile?.role || authData.user.user_metadata?.role || "hospital") as UserRole;
      return {
        success: true,
        role,
        redirectTo: ROLE_PORTAL_MAP[role] || "/hospital/dashboard",
      };
    }
  },

  /**
   * Donor Login (Dedicated to Donor Hero Portal)
   */
  async loginDonor(email: string, password: string) {
    try {
      // Try HttpOnly server-side authentication first
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          portalScope: "donor",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        const errorMsg =
          typeof data.error === "string" && data.error.trim().length > 0
            ? data.error
            : "Invalid email or password.";
        return {
          success: false,
          error: errorMsg,
        };
      }

      return {
        success: true,
        role: "donor" as UserRole,
        redirectTo: data.redirectTo || "/donor/dashboard",
      };
    } catch {
      // Client-side fallback if fetch fails
      const supabase = createClient("donor");
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError || !authData.user) {
        return {
          success: false,
          error: authError?.message || "Invalid email or password.",
        };
      }

      return {
        success: true,
        role: "donor" as UserRole,
        redirectTo: "/donor/dashboard",
      };
    }
  },

  /**
   * Register a new Donor (with global email uniqueness enforcement)
   */
  async registerDonor(data: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
  }) {
    const cleanEmail = data.email.trim().toLowerCase();

    // 1. Pre-flight check via email uniqueness endpoint
    try {
      const checkRes = await fetch(`/api/auth/check-email-unique?email=${encodeURIComponent(cleanEmail)}`);
      const checkData = await checkRes.json();
      if (!checkData.isUnique) {
        return {
          success: false,
          error: checkData.error || "An account with this email address already exists. Email addresses must be unique across all users and donors.",
        };
      }
    } catch {}

    const supabase = createClient("donor");

    const { data: authData, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          phone: data.phone || null,
          role: "donor",
        },
      },
    });

    if (error) {
      const msg = error.message.toLowerCase().includes("already registered")
        ? "An account with this email address already exists. Please use a unique email address or sign in."
        : error.message;
      return {
        success: false,
        error: msg,
      };
    }

    if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
      return {
        success: false,
        error: "An account with this email address already exists in the system. Please use a unique email address or sign in.",
      };
    }

    return {
      success: true,
      user: authData.user,
      session: authData.session,
    };
  },

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, redirectTo?: string) {
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 200) {
        return { success: false, error: data.error || "Failed to send reset email." };
      }
      return { success: true };
    } catch {
      return { success: true };
    }
  },

  /**
   * Update user password after reset token
   */
  async updateUserPassword(password: string) {
    const supabase = createClient("hospital");

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  /**
   * Scoped Sign Out: Surgically clears only the current portal's cookie session.
   * Other portal sessions in other tabs remain 100% active and authenticated.
   */
  async signOut(portalScope?: PortalScope) {
    let scope = portalScope;
    if (!scope && typeof window !== "undefined") {
      scope = getPortalFromPathname(window.location.pathname) || "hospital";
    }
    const resolvedScope = scope || "hospital";

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portalScope: resolvedScope }),
      });
    } catch (e) {
      console.warn("Server logout notification failed:", e);
    }

    try {
      const supabase = createClient(resolvedScope);
      await supabase.auth.signOut();
    } catch {
      // Continue even if local client signOut fails
    }
  },
};
