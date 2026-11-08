import { AdminRole } from "@/types/database";

export type PermissionKey =
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

export interface PermissionDefinition {
  id: PermissionKey;
  name: string;
  category: "Administration" | "Healthcare Registry" | "Operations & Matching" | "Security & System";
  description: string;
}

export const ADMIN_PERMISSIONS: PermissionDefinition[] = [
  {
    id: "manage_admins",
    name: "Manage Administrators",
    category: "Administration",
    description: "Provision, update roles, and manage permissions for system administrators.",
  },
  {
    id: "manage_roles",
    name: "Manage Roles & Permissions",
    category: "Administration",
    description: "Configure granular access controls, permissions, and role hierarchies.",
  },
  {
    id: "manage_organizations",
    name: "Manage Facilities & Orgs",
    category: "Healthcare Registry",
    description: "Onboard, verify, suspend, and unboard hospitals and blood banks.",
  },
  {
    id: "manage_donors",
    name: "Manage Voluntary Donors",
    category: "Healthcare Registry",
    description: "Onboard, verify, manage eligibility, and unboard voluntary blood donors.",
  },
  {
    id: "manage_users",
    name: "Manage User Accounts",
    category: "Healthcare Registry",
    description: "Inspect platform user clearances, activate or deactivate accounts.",
  },
  {
    id: "manage_matching",
    name: "Emergency Matching Engine",
    category: "Operations & Matching",
    description: "Execute algorithmic emergency matching and dispatch donor requests.",
  },
  {
    id: "manage_requests",
    name: "Manage Blood Requests",
    category: "Operations & Matching",
    description: "Review, approve, and track hospital emergency blood requests.",
  },
  {
    id: "manage_inventory",
    name: "Blood Inventory & Adjustments",
    category: "Operations & Matching",
    description: "Monitor stock levels across facilities and perform manual ledger adjustments.",
  },
  {
    id: "view_audit_logs",
    name: "Security & Audit Logs",
    category: "Security & System",
    description: "Inspect immutable audit ledgers and system security records.",
  },
  {
    id: "manage_settings",
    name: "Global Configurations & Policies",
    category: "Security & System",
    description: "Configure platform settings, operational thresholds, and dispatch policies.",
  },
];

export interface RoleConfig {
  id: AdminRole;
  name: string;
  badgeVariant: "primary" | "secondary" | "accent" | "default" | "blood" | "warning";
  description: string;
  permissions: PermissionKey[];
}

export const ROLE_CONFIGS: Record<string, RoleConfig> = {
  superadmin: {
    id: "superadmin",
    name: "Super Administrator",
    badgeVariant: "primary",
    description: "Full master control with unrestricted clearance over all platform infrastructure, administrator rosters, and global configurations.",
    permissions: [
      "manage_admins",
      "manage_roles",
      "manage_organizations",
      "manage_donors",
      "manage_users",
      "manage_matching",
      "manage_requests",
      "manage_inventory",
      "view_audit_logs",
      "manage_settings",
    ],
  },
  super_admin: {
    id: "superadmin",
    name: "Super Administrator",
    badgeVariant: "primary",
    description: "Full master control with unrestricted clearance over all platform infrastructure, administrator rosters, and global configurations.",
    permissions: [
      "manage_admins",
      "manage_roles",
      "manage_organizations",
      "manage_donors",
      "manage_users",
      "manage_matching",
      "manage_requests",
      "manage_inventory",
      "view_audit_logs",
      "manage_settings",
    ],
  },
  admin: {
    id: "admin",
    name: "Administrator",
    badgeVariant: "secondary",
    description: "Operational management clearance over hospitals, voluntary donors, matching runs, blood inventory, and audit records.",
    permissions: [
      "manage_organizations",
      "manage_donors",
      "manage_users",
      "manage_matching",
      "manage_requests",
      "manage_inventory",
      "view_audit_logs",
      "manage_settings",
    ],
  },
  staff: {
    id: "staff",
    name: "Operations Staff",
    badgeVariant: "default",
    description: "Day-to-day coordination clearance to monitor registries, process emergency blood requests, and oversee facility stock levels.",
    permissions: [
      "manage_organizations",
      "manage_donors",
      "manage_matching",
      "manage_requests",
      "manage_inventory",
    ],
  },
  operations: {
    id: "staff",
    name: "Operations Staff",
    badgeVariant: "default",
    description: "Day-to-day coordination clearance to monitor registries, process emergency blood requests, and oversee facility stock levels.",
    permissions: [
      "manage_organizations",
      "manage_donors",
      "manage_matching",
      "manage_requests",
      "manage_inventory",
    ],
  },
  moderator: {
    id: "staff",
    name: "Operations Staff",
    badgeVariant: "default",
    description: "Day-to-day coordination clearance to monitor registries, process emergency blood requests, and oversee facility stock levels.",
    permissions: [
      "manage_organizations",
      "manage_donors",
      "manage_matching",
      "manage_requests",
      "manage_inventory",
    ],
  },
};

export function normalizeAdminRole(role?: AdminRole | string | null): "superadmin" | "admin" | "staff" {
  if (!role || role === "superadmin" || role === "super_admin") return "superadmin";
  if (role === "admin") return "admin";
  return "staff";
}

export function getRolePermissions(roleKey?: AdminRole | string | null): PermissionKey[] {
  const normalized = normalizeAdminRole(roleKey);
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(`smartdonor_perms_${normalized}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as PermissionKey[];
        }
      }
    } catch {}
  }
  const config = ROLE_CONFIGS[normalized] || ROLE_CONFIGS.staff;
  return config.permissions;
}

export function saveCustomRolePermissions(roleKey: string, permissions: PermissionKey[]) {
  const normalized = normalizeAdminRole(roleKey);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`smartdonor_perms_${normalized}`, JSON.stringify(permissions));
      window.dispatchEvent(new CustomEvent("smartdonor:permissions_updated", { detail: { role: normalized, permissions } }));
    } catch {}
  }
}

export function hasPermission(adminRole?: AdminRole | string | null, permission?: PermissionKey): boolean {
  if (!permission) return true;
  const permissions = getRolePermissions(adminRole);
  return permissions.includes(permission);
}

