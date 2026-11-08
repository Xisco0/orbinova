const ADMIN_PERMISSIONS = [
  { id: "manage_admins", name: "Manage Administrators", category: "Administration" },
  { id: "manage_roles", name: "Manage Roles & Permissions", category: "Administration" },
  { id: "manage_organizations", name: "Manage Facilities & Orgs", category: "Healthcare Registry" },
  { id: "manage_donors", name: "Manage Voluntary Donors", category: "Healthcare Registry" },
  { id: "manage_users", name: "Manage User Accounts", category: "Healthcare Registry" },
  { id: "manage_matching", name: "Emergency Matching Engine", category: "Operations & Matching" },
  { id: "manage_requests", name: "Manage Blood Requests", category: "Operations & Matching" },
  { id: "manage_inventory", name: "Blood Inventory & Adjustments", category: "Operations & Matching" },
  { id: "view_audit_logs", name: "Security & Audit Logs", category: "Security & System" },
  { id: "manage_settings", name: "Global Configurations & Policies", category: "Security & System" },
];

const ROLE_CONFIGS = {
  superadmin: {
    id: "superadmin",
    name: "Super Administrator",
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
    permissions: [
      "manage_organizations",
      "manage_donors",
      "manage_matching",
      "manage_requests",
      "manage_inventory",
    ],
  },
};

function normalizeAdminRole(role) {
  if (!role || role === "superadmin" || role === "super_admin") return "superadmin";
  if (role === "admin") return "admin";
  return "staff";
}

function hasPermission(adminRole, permission) {
  if (!permission) return true;
  const normalized = normalizeAdminRole(adminRole);
  const config = ROLE_CONFIGS[normalized];
  if (!config) return false;
  return config.permissions.includes(permission);
}

console.log("==================================================================");
console.log(" ROLES & PERMISSIONS ARCHITECTURE TEST SUITE");
console.log("==================================================================\n");

let allPassed = true;

// Test 1: Verify Superadmin Permissions
console.log("TEST 1: Testing Superadmin Permissions (Full Root Access)...");
const superadminPerms = ROLE_CONFIGS.superadmin.permissions;
console.log(`Superadmin granted ${superadminPerms.length} total permissions.`);
if (superadminPerms.length !== ADMIN_PERMISSIONS.length) {
  console.error("❌ Superadmin does not have full root permissions!");
  allPassed = false;
} else if (!hasPermission("superadmin", "manage_admins") || !hasPermission("superadmin", "manage_roles")) {
  console.error("❌ Superadmin missing manage_admins or manage_roles!");
  allPassed = false;
} else {
  console.log("✅ Superadmin has full unrestricted root access over all platform modules.\n");
}

// Test 2: Verify Admin Permissions (Operational Clearance)
console.log("TEST 2: Testing Administrator Permissions (Operations Clearance)...");
if (hasPermission("admin", "manage_admins")) {
  console.error("❌ CRITICAL: Admin should NOT have permission to manage other administrators!");
  allPassed = false;
} else if (hasPermission("admin", "manage_roles")) {
  console.error("❌ CRITICAL: Admin should NOT have permission to manage roles!");
  allPassed = false;
} else if (
  !hasPermission("admin", "manage_organizations") ||
  !hasPermission("admin", "manage_donors") ||
  !hasPermission("admin", "manage_matching")
) {
  console.error("❌ Admin missing expected operational permissions!");
  allPassed = false;
} else {
  console.log("✅ Administrator has correct operational clearance and cannot modify administrator rosters or role matrices.\n");
}

// Test 3: Verify Staff Permissions (Coordination Support)
console.log("TEST 3: Testing Staff Permissions (Restricted Coordination)...");
if (
  hasPermission("staff", "manage_admins") ||
  hasPermission("staff", "manage_roles") ||
  hasPermission("staff", "view_audit_logs") ||
  hasPermission("staff", "manage_settings")
) {
  console.error("❌ CRITICAL: Staff should NOT have access to admins, roles, audit logs, or settings!");
  allPassed = false;
} else if (!hasPermission("staff", "manage_requests") || !hasPermission("staff", "manage_inventory")) {
  console.error("❌ Staff missing basic operational permissions!");
  allPassed = false;
} else {
  console.log("✅ Staff has correct restricted day-to-day operational clearance.\n");
}

// Test 4: Role Normalization
console.log("TEST 4: Testing Role Normalization...");
if (
  normalizeAdminRole("super_admin") !== "superadmin" ||
  normalizeAdminRole("operations") !== "staff" ||
  normalizeAdminRole("moderator") !== "staff"
) {
  console.error("❌ Role normalization failed!");
  allPassed = false;
} else {
  console.log("✅ Role normalization verified for backwards compatibility.\n");
}

if (allPassed) {
  console.log("🎉 ALL ROLE & PERMISSION TESTS PASSED! Access control matrix fully verified.");
} else {
  console.error("⚠️ SOME TESTS FAILED.");
}
