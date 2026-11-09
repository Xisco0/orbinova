/**
 * ORBINOVA Multi-Tab Authentication & Portal Session Scoping
 *
 * Defines explicit cookie namespaces, path mappings, and security parameters
 * to guarantee that Hospital, Donor, Imaging, and Admin portals can run
 * concurrently in multiple browser tabs without cross-session overwriting or eviction.
 */

export type PortalScope = "hospital" | "donor" | "admin" | "imaging";

export const PORTAL_COOKIE_NAMES: Record<PortalScope, string> = {
  hospital: "sb_hospital_session",
  donor: "sb_donor_session",
  admin: "sb_admin_session",
  imaging: "sb_imaging_session",
};

export const ALL_PORTAL_COOKIE_NAMES = Object.values(PORTAL_COOKIE_NAMES);

/**
 * Validates whether a given user role is authorized for a specific portal scope.
 */
export function isRoleAuthorizedForPortal(role: string | undefined | null, portal: PortalScope): boolean {
  if (!role) return false;
  const normalized = role.toLowerCase();

  switch (portal) {
    case "hospital":
      return (
        normalized === "hospital" ||
        normalized === "blood_bank" ||
        normalized === "doctor" ||
        normalized === "nurse" ||
        normalized === "radiologist" ||
        normalized === "staff" ||
        normalized === "hospital_admin" ||
        normalized === "inventory_officer" ||
        normalized === "donor_coordinator" ||
        normalized === "technician" ||
        normalized === "admin"
      );
    case "donor":
      return normalized === "donor";
    case "admin":
      return normalized === "admin" || normalized === "superadmin" || normalized === "super_admin";
    case "imaging":
      return normalized === "radiologist" || normalized === "doctor" || normalized === "hospital" || normalized === "admin";
    default:
      return false;
  }
}

/**
 * Validates whether a user with a shared central identity is authorized for a specific portal scope.
 * Supports cross-profile accounts where a hospital staff member is also registered as a voluntary donor.
 */
export function isUserAuthorizedForPortal(
  userId: string,
  email: string | undefined | null,
  primaryRole: string | undefined | null,
  portal: PortalScope,
  profileContext?: {
    hasDonorProfile?: boolean;
    hasStaffMembership?: boolean;
  }
): boolean {
  // 1. Direct primary role check
  if (isRoleAuthorizedForPortal(primaryRole, portal)) {
    return true;
  }

  // 2. Cross-profile authorization for Donor Portal
  if (portal === "donor" && profileContext?.hasDonorProfile) {
    return true;
  }

  // 3. Cross-profile authorization for Hospital Portal
  if (portal === "hospital" && profileContext?.hasStaffMembership) {
    return true;
  }

  return false;
}

/**
 * Resolves the portal scope from a URL pathname.
 */
export function getPortalFromPathname(pathname: string): PortalScope | null {
  if (!pathname) return null;
  if (pathname.startsWith("/hospital")) return "hospital";
  if (pathname.startsWith("/donor") && !pathname.startsWith("/donor/login") && !pathname.startsWith("/donor/register") && !pathname.startsWith("/donor/forgot-password") && !pathname.startsWith("/donor/reset-password")) {
    return "donor";
  }
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/imaging")) return "imaging";
  return null;
}

/**
 * Standard cookie configuration for HttpOnly, Secure session tokens.
 */
export const PORTAL_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 days
};
