/**
 * ORBINOVA ENTERPRISE RBAC & MULTI-INSTITUTION AUTHORIZATION ENGINE
 * Strict Deny-by-Default Policy & Institutional Isolation
 * 
 * Five Core Hospital Roles:
 * 1. Hospital Owner ('owner')
 * 2. Hospital Administrator ('administrator' / 'manager')
 * 3. Donor Coordinator ('donor_coordinator')
 * 4. Clinical Staff ('clinical_staff')
 * 5. Radiologist ('radiologist')
 */

import {
  UserRole,
  AdminRole,
  GranularMemberRole,
  VerificationStatus,
} from "@/types/database";

// 1. Structured Namespaced Permissions
export type SystemPermission =
  // Platform Administration
  | "platform.manage"
  | "institutions.approve"
  | "institutions.suspend"
  | "institutions.view_all"
  | "audit_logs.view"
  | "settings.manage"

  // Dashboard
  | "dashboard.view"

  // Blood Requests
  | "blood_requests.view"
  | "blood_requests.create"
  | "blood_requests.update"
  | "blood_requests.cancel"
  | "blood_requests.confirm_receipt"
  | "blood_requests.view_donor_matching"
  | "blood_requests.manage" // General management alias

  // Blood Inventory
  | "inventory.view"
  | "inventory.add"
  | "inventory.update"
  | "inventory.reserve"
  | "inventory.issue"
  | "inventory.receive"
  | "inventory.transfer"
  | "inventory.view_reports"
  | "blood_inventory.view" // Compatibility alias
  | "blood_inventory.manage" // Compatibility alias

  // Donor Management
  | "donors.view"
  | "donors.register"
  | "donors.update"
  | "donors.verify"
  | "donors.match"
  | "donors.view_responses"
  | "donors.schedule"
  | "donors.record_screening"
  | "donors.record_donation"
  | "donors.view_records" // Compatibility alias

  // Facility Profile
  | "facility.view"
  | "facility.update"

  // Staff & Members
  | "staff.view"
  | "staff.invite"
  | "staff.update"
  | "staff.suspend"
  | "staff.assign_roles"
  | "staff.assign_permissions"
  | "staff.manage" // General management alias

  // Notifications
  | "notifications.view"
  | "notifications.manage_preferences"

  // Settings
  | "facility_settings.view"
  | "facility_settings.update"

  // Imaging Module Access
  | "imaging.access"
  | "imaging.staff.manage"
  | "imaging.view"
  | "imaging.upload"
  | "imaging.annotate"

  // Donor Self-Service
  | "donor_profile.view_own"
  | "donor_profile.edit_own";

// Legacy key aliases for backward compatibility with existing Admin portals
export type LegacyPermission =
  | "manage_admins"
  | "manage_roles"
  | "manage_organizations"
  | "manage_donors"
  | "manage_users"
  | "manage_matching"
  | "manage_requests"
  | "manage_inventory"
  | "view_audit_logs"
  | "manage_settings";

export type AnyPermission = SystemPermission | LegacyPermission;

// Legacy mapping dictionary
const LEGACY_MAP: Record<LegacyPermission, SystemPermission> = {
  manage_admins: "platform.manage",
  manage_roles: "platform.manage",
  manage_organizations: "institutions.approve",
  manage_donors: "donors.view",
  manage_users: "platform.manage",
  manage_matching: "blood_requests.manage",
  manage_requests: "blood_requests.manage",
  manage_inventory: "inventory.update",
  view_audit_logs: "audit_logs.view",
  manage_settings: "settings.manage",
};

// 2. Base Institutional Permission Sets

const PLATFORM_SUPER_ADMIN_PERMISSIONS: SystemPermission[] = [
  "platform.manage",
  "institutions.approve",
  "institutions.suspend",
  "institutions.view_all",
  "audit_logs.view",
  "settings.manage",
  "dashboard.view",
  "staff.invite",
  "staff.manage",
  "staff.view",
  "staff.update",
  "staff.suspend",
  "staff.assign_roles",
  "staff.assign_permissions",
  "donors.view",
  "donors.register",
  "donors.update",
  "donors.verify",
  "donors.match",
  "donors.view_responses",
  "donors.schedule",
  "donors.record_screening",
  "donors.record_donation",
  "donors.view_records",
  "blood_requests.view",
  "blood_requests.create",
  "blood_requests.update",
  "blood_requests.cancel",
  "blood_requests.confirm_receipt",
  "blood_requests.view_donor_matching",
  "blood_requests.manage",
  "inventory.view",
  "inventory.add",
  "inventory.update",
  "inventory.reserve",
  "inventory.issue",
  "inventory.receive",
  "inventory.transfer",
  "inventory.view_reports",
  "blood_inventory.view",
  "blood_inventory.manage",
  "facility.view",
  "facility.update",
  "facility_settings.view",
  "facility_settings.update",
  "notifications.view",
  "notifications.manage_preferences",
  "imaging.access",
  "imaging.staff.manage",
  "imaging.view",
  "imaging.upload",
  "imaging.annotate",
];

const PLATFORM_ADMIN_PERMISSIONS: SystemPermission[] = [
  "institutions.approve",
  "institutions.suspend",
  "institutions.view_all",
  "audit_logs.view",
  "dashboard.view",
  "staff.view",
  "donors.view",
  "donors.view_records",
  "blood_requests.view",
  "blood_requests.manage",
  "inventory.view",
  "inventory.view_reports",
  "blood_inventory.view",
  "notifications.view",
];

// ============================================================================
// FIVE CORE HOSPITAL ROLES
// ============================================================================

// 1. Hospital Owner: Primary institutional administrator
export const HOSPITAL_OWNER_PERMISSIONS: SystemPermission[] = [
  "dashboard.view",
  "audit_logs.view",
  // Blood Requests
  "blood_requests.view",
  "blood_requests.create",
  "blood_requests.update",
  "blood_requests.cancel",
  "blood_requests.confirm_receipt",
  "blood_requests.view_donor_matching",
  "blood_requests.manage",
  // Blood Inventory
  "inventory.view",
  "inventory.add",
  "inventory.update",
  "inventory.reserve",
  "inventory.issue",
  "inventory.receive",
  "inventory.transfer",
  "inventory.view_reports",
  "blood_inventory.view",
  "blood_inventory.manage",
  // Donor Management
  "donors.view",
  "donors.register",
  "donors.update",
  "donors.verify",
  "donors.match",
  "donors.view_responses",
  "donors.schedule",
  "donors.record_screening",
  "donors.record_donation",
  "donors.view_records",
  // Facility Profile
  "facility.view",
  "facility.update",
  // Staff & Members (Full Authority)
  "staff.view",
  "staff.invite",
  "staff.update",
  "staff.suspend",
  "staff.assign_roles",
  "staff.assign_permissions",
  "staff.manage",
  // Notifications
  "notifications.view",
  "notifications.manage_preferences",
  // Facility Settings
  "facility_settings.view",
  "facility_settings.update",
  // Imaging Module Access
  "imaging.access",
  "imaging.staff.manage",
  "imaging.view",
  "imaging.upload",
  "imaging.annotate",
];

// 2. Hospital Administrator: Manages delegated institutional operations
export const HOSPITAL_ADMINISTRATOR_PERMISSIONS: SystemPermission[] = [
  "dashboard.view",
  // Blood Requests
  "blood_requests.view",
  "blood_requests.create",
  "blood_requests.update",
  "blood_requests.cancel",
  "blood_requests.confirm_receipt",
  "blood_requests.view_donor_matching",
  "blood_requests.manage",
  // Blood Inventory
  "inventory.view",
  "inventory.add",
  "inventory.update",
  "inventory.reserve",
  "inventory.issue",
  "inventory.receive",
  "inventory.transfer",
  "inventory.view_reports",
  "blood_inventory.view",
  "blood_inventory.manage",
  // Donor Management
  "donors.view",
  "donors.register",
  "donors.update",
  "donors.verify",
  "donors.match",
  "donors.view_responses",
  "donors.schedule",
  "donors.record_screening",
  "donors.record_donation",
  "donors.view_records",
  // Facility Profile
  "facility.view",
  "facility.update",
  // Staff & Members (Delegated authority: cannot modify owner or grant self-privileges)
  "staff.view",
  "staff.invite",
  "staff.update",
  "staff.suspend",
  "staff.assign_roles",
  "staff.manage",
  // Notifications
  "notifications.view",
  "notifications.manage_preferences",
  // Delegated Facility Settings
  "facility_settings.view",
  "facility_settings.update",
];

// 3. Donor Coordinator: Responsible for donor registration and coordination
export const DONOR_COORDINATOR_PERMISSIONS: SystemPermission[] = [
  "dashboard.view",
  // Blood Requests: Relevant to donor coordination & matching only
  "blood_requests.view",
  "blood_requests.view_donor_matching",
  // Donor Management: Full operational workflow
  "donors.view",
  "donors.register",
  "donors.update",
  "donors.verify",
  "donors.match",
  "donors.view_responses",
  "donors.schedule",
  "donors.record_screening",
  "donors.record_donation",
  "donors.view_records",
  // Notifications
  "notifications.view",
];

// 4. Clinical Staff: Authorized healthcare specialists for clinical and blood request workflows
export const CLINICAL_STAFF_PERMISSIONS: SystemPermission[] = [
  "dashboard.view",
  // Clinical Blood Requests
  "blood_requests.view",
  "blood_requests.create",
  "blood_requests.update",
  "blood_requests.cancel",
  "blood_requests.confirm_receipt",
  "blood_requests.manage",
  // Notifications
  "notifications.view",
];

// Legacy alias for backward compatibility
export const HOSPITAL_GENERAL_STAFF_PERMISSIONS = CLINICAL_STAFF_PERMISSIONS;

// 5. Radiologist: Separately provisioned imaging specialists
export const RADIOLOGIST_PERMISSIONS: SystemPermission[] = [
  "dashboard.view",
  "imaging.access",
  "imaging.view",
  "imaging.upload",
  "imaging.annotate",
  "notifications.view",
];

// Blood Bank Permission Sets (for standalone blood banks)
const BLOOD_BANK_OWNER_PERMISSIONS: SystemPermission[] = [
  "dashboard.view",
  "audit_logs.view",
  "staff.invite",
  "staff.manage",
  "staff.view",
  "inventory.view",
  "inventory.add",
  "inventory.update",
  "inventory.reserve",
  "inventory.issue",
  "inventory.receive",
  "inventory.transfer",
  "inventory.view_reports",
  "blood_inventory.view",
  "blood_inventory.manage",
  "blood_requests.view",
  "blood_requests.manage",
  "notifications.view",
];

const BLOOD_BANK_ADMIN_PERMISSIONS: SystemPermission[] = [
  "dashboard.view",
  "staff.invite",
  "staff.manage",
  "staff.view",
  "inventory.view",
  "inventory.add",
  "inventory.update",
  "inventory.reserve",
  "inventory.issue",
  "inventory.receive",
  "inventory.transfer",
  "inventory.view_reports",
  "blood_inventory.view",
  "blood_inventory.manage",
  "blood_requests.view",
  "blood_requests.manage",
  "notifications.view",
];

const BLOOD_BANK_OPERATIONAL_PERMISSIONS: SystemPermission[] = [
  "dashboard.view",
  "inventory.view",
  "inventory.add",
  "inventory.update",
  "inventory.reserve",
  "inventory.issue",
  "inventory.receive",
  "inventory.transfer",
  "blood_inventory.view",
  "blood_inventory.manage",
  "blood_requests.view",
  "notifications.view",
];

const DONOR_SELF_PERMISSIONS: SystemPermission[] = [
  "donor_profile.view_own",
  "donor_profile.edit_own",
];

/**
 * Resolves permissions for a user given their primary role, institutional member role,
 * and any explicitly delegated custom permissions.
 */
export function getRolePermissions(
  role?: UserRole | AdminRole | string | null,
  memberRole?: GranularMemberRole | string | null,
  delegatedPermissions?: (SystemPermission | string)[] | null
): SystemPermission[] {
  if (!role) return [];

  // Super Admin check
  if (role === "superadmin" || role === "super_admin") {
    return PLATFORM_SUPER_ADMIN_PERMISSIONS;
  }

  // Platform Admin
  if (role === "admin" && !memberRole) {
    return PLATFORM_ADMIN_PERMISSIONS;
  }

  let basePermissions: SystemPermission[] = [];

  // Five Core Hospital Roles (+ backwards-compatible mapping for legacy records)
  if (
    role === "hospital" ||
    role === "hospital_admin" ||
    role === "staff" ||
    role === "doctor" ||
    role === "nurse" ||
    role === "radiologist" ||
    memberRole === "owner" ||
    memberRole === "administrator" ||
    memberRole === "manager" ||
    memberRole === "hospital_admin" ||
    memberRole === "donor_coordinator" ||
    memberRole === "clinical_staff" ||
    memberRole === "doctor" ||
    memberRole === "nurse" ||
    memberRole === "hospital_staff" ||
    memberRole === "staff" ||
    memberRole === "radiologist"
  ) {
    switch (memberRole) {
      case "owner":
        basePermissions = HOSPITAL_OWNER_PERMISSIONS;
        break;

      case "administrator":
      case "manager":
      case "hospital_admin":
        basePermissions = HOSPITAL_ADMINISTRATOR_PERMISSIONS;
        break;

      case "donor_coordinator":
        basePermissions = DONOR_COORDINATOR_PERMISSIONS;
        break;

      case "clinical_staff":
      case "doctor":
      case "nurse":
      case "hospital_staff":
      case "staff":
        basePermissions = CLINICAL_STAFF_PERMISSIONS;
        break;

      case "radiologist":
        basePermissions = RADIOLOGIST_PERMISSIONS;
        break;

      default:
        // Default hospital fallback: Clinical Staff (least privilege)
        basePermissions = CLINICAL_STAFF_PERMISSIONS;
        break;
    }
  } else if (role === "blood_bank") {
    switch (memberRole) {
      case "owner":
        basePermissions = BLOOD_BANK_OWNER_PERMISSIONS;
        break;
      case "manager":
      case "administrator":
        basePermissions = BLOOD_BANK_ADMIN_PERMISSIONS;
        break;
      default:
        basePermissions = BLOOD_BANK_OPERATIONAL_PERMISSIONS;
        break;
    }
  } else if (role === "donor") {
    basePermissions = DONOR_SELF_PERMISSIONS;
  }

  // Incorporate any additional permissions explicitly delegated beyond baseline
  if (delegatedPermissions && Array.isArray(delegatedPermissions) && delegatedPermissions.length > 0) {
    const merged = new Set<SystemPermission>(basePermissions);
    for (const p of delegatedPermissions) {
      if (p) merged.add(p as SystemPermission);
    }
    return Array.from(merged);
  }

  return basePermissions;
}

/**
 * Core Deny-by-Default Permission Checker
 * Supports aliases (e.g. inventory.view vs blood_inventory.view, donors.view vs donors.view_records).
 */
export function hasPermission(
  role?: UserRole | AdminRole | string | null,
  permission?: AnyPermission | string | null,
  memberRole?: GranularMemberRole | string | null,
  delegatedPermissions?: (SystemPermission | string)[] | null
): boolean {
  if (!permission) return true;
  if (!role) return false;

  const normalizedKey: string =
    permission in LEGACY_MAP
      ? LEGACY_MAP[permission as LegacyPermission]
      : permission;

  const permissions = getRolePermissions(role, memberRole, delegatedPermissions);

  if (permissions.includes(normalizedKey as SystemPermission)) {
    return true;
  }

  // Alias bidirectional matching
  if (normalizedKey === "blood_inventory.view" && permissions.includes("inventory.view")) return true;
  if (normalizedKey === "inventory.view" && permissions.includes("blood_inventory.view")) return true;
  if (normalizedKey === "blood_inventory.manage" && (permissions.includes("inventory.update") || permissions.includes("inventory.view_reports"))) return true;
  if (normalizedKey === "inventory.update" && permissions.includes("blood_inventory.manage")) return true;
  if (normalizedKey === "donors.view_records" && permissions.includes("donors.view")) return true;
  if (normalizedKey === "donors.view" && permissions.includes("donors.view_records")) return true;
  if (normalizedKey === "staff.manage" && (permissions.includes("staff.assign_roles") || permissions.includes("staff.update"))) return true;
  if (normalizedKey === "imaging.access" && permissions.includes("imaging.view")) return true;
  if (normalizedKey === "imaging.view" && permissions.includes("imaging.access")) return true;

  return false;
}

/**
 * Module-Specific Access Control
 * Enforces boundary rules for ORBINOVA Donor and ORBINOVA Imaging modules
 */
export function canAccessModule(
  role?: UserRole | AdminRole | string | null,
  module?: "donor" | "imaging",
  memberRole?: GranularMemberRole | string | null,
  delegatedPermissions?: (SystemPermission | string)[] | null
): boolean {
  if (!module) return true;

  if (module === "imaging") {
    // Super Admin & Platform Admin
    if (role === "superadmin" || role === "super_admin") return true;

    // Hospital Owner & Radiologists
    if (memberRole === "owner" || memberRole === "radiologist") return true;

    // Explicit delegated imaging clearance
    const permissions = getRolePermissions(role, memberRole, delegatedPermissions);
    return permissions.includes("imaging.access") || permissions.includes("imaging.view");
  }

  if (module === "donor") {
    return true;
  }

  return false;
}

/**
 * Multi-Institution Tenant Boundary Enforcement
 * Verifies that the acting user has legitimate access to the requested organization's data.
 */
export function assertOrgAccess(
  user: {
    id: string;
    role?: string;
    organization_id?: string;
    isSuperAdmin?: boolean;
  },
  targetOrgId: string
): void {
  // Super Admin & Platform Admin have overarching oversight
  if (user.role === "superadmin" || user.role === "super_admin" || user.isSuperAdmin) {
    return;
  }

  // Normal institutional members must strictly match their own facility ID
  if (!user.organization_id || user.organization_id !== targetOrgId) {
    throw new Error(
      "SECURITY_VIOLATION: Cross-institution data access denied. You are only authorized to operate within your registered facility."
    );
  }
}

/**
 * Institutional Approval Guard
 */
export function assertApprovedInstitution(status?: VerificationStatus | string | null): void {
  if (status !== "verified") {
    throw new Error(
      `INSTITUTION_NOT_APPROVED: This institution is currently '${status || "pending"}'. Only verified facilities may onboard staff or create clinical requests.`
    );
  }
}
