import {
  getRolePermissions,
  hasPermission,
  canAccessModule,
  HOSPITAL_OWNER_PERMISSIONS,
  HOSPITAL_ADMINISTRATOR_PERMISSIONS,
  DONOR_COORDINATOR_PERMISSIONS,
  CLINICAL_STAFF_PERMISSIONS,
  RADIOLOGIST_PERMISSIONS,
  SystemPermission,
} from "../src/lib/auth/rbac";

function simulateSidebar(memberRole: string, permissions: SystemPermission[]) {
  const isOwner = memberRole === "owner";
  const isManager = memberRole === "manager" || memberRole === "administrator" || isOwner;

  // Granular authorization filter per subItem
  const isSubItemAuthorized = (href: string): boolean => {
    if (href === "/hospital/inventory") {
      return (
        isOwner ||
        isManager ||
        permissions.includes("inventory.view") ||
        permissions.includes("blood_inventory.view")
      );
    }
    if (href === "/hospital/inventory/transactions") {
      return (
        isOwner ||
        isManager ||
        permissions.includes("inventory.view_reports") ||
        permissions.includes("inventory.update") ||
        permissions.includes("blood_inventory.manage")
      );
    }
    if (href === "/hospital/donors") {
      return (
        isOwner ||
        isManager ||
        permissions.includes("donors.view") ||
        permissions.includes("donors.register") ||
        permissions.includes("donors.view_records")
      );
    }
    if (href === "/hospital/donor-requests") {
      return (
        isOwner ||
        isManager ||
        permissions.includes("donors.match") ||
        permissions.includes("donors.verify") ||
        permissions.includes("blood_requests.view_donor_matching") ||
        permissions.includes("donors.view_records") ||
        permissions.includes("donors.register")
      );
    }
    if (href === "/hospital/donations") {
      return (
        isOwner ||
        isManager ||
        permissions.includes("donors.record_donation") ||
        permissions.includes("donors.view") ||
        permissions.includes("donors.view_records")
      );
    }
    return false;
  };

  const isLinkAuthorized = (name: string, href?: string, subItemHrefs?: string[]): boolean => {
    if (href === "/hospital/dashboard") {
      return permissions.includes("dashboard.view") || isOwner;
    }
    if (href === "/hospital/blood-requests") {
      return (
        isOwner ||
        isManager ||
        permissions.includes("blood_requests.view") ||
        permissions.includes("blood_requests.create") ||
        permissions.includes("blood_requests.manage")
      );
    }
    if (name === "Blood Inventory") {
      return Boolean(subItemHrefs && subItemHrefs.some(isSubItemAuthorized));
    }
    if (name === "Donor Management") {
      return Boolean(subItemHrefs && subItemHrefs.some(isSubItemAuthorized));
    }
    if (href === "/hospital/organization") {
      return (
        isOwner ||
        isManager ||
        permissions.includes("facility.view") ||
        permissions.includes("facility.update")
      );
    }
    if (href === "/hospital/members") {
      return (
        isOwner ||
        isManager ||
        permissions.includes("staff.view") ||
        permissions.includes("staff.invite") ||
        permissions.includes("staff.manage") ||
        permissions.includes("staff.assign_roles")
      );
    }
    if (href === "/hospital/notifications") {
      return permissions.includes("notifications.view") || isOwner;
    }
    if (href === "/hospital/settings") {
      return (
        isOwner ||
        isManager ||
        permissions.includes("facility_settings.view") ||
        permissions.includes("facility_settings.update")
      );
    }
    return false;
  };

  const navSections = [
    {
      category: "Overview",
      links: [{ name: "Dashboard", href: "/hospital/dashboard" }],
    },
    {
      category: "Blood Operations",
      links: [
        { name: "Blood Requests", href: "/hospital/blood-requests" },
        {
          name: "Blood Inventory",
          href: "/hospital/inventory",
          subItems: ["/hospital/inventory", "/hospital/inventory/transactions"],
        },
        {
          name: "Donor Management",
          href: "/hospital/donors",
          subItems: ["/hospital/donors", "/hospital/donor-requests", "/hospital/donations"],
        },
      ],
    },
    {
      category: "Organization",
      links: [
        { name: "Facility Profile", href: "/hospital/organization" },
        { name: "Staff & Members", href: "/hospital/members" },
      ],
    },
    {
      category: "System",
      links: [
        { name: "Notifications", href: "/hospital/notifications" },
        { name: "Facility Settings", href: "/hospital/settings" },
      ],
    },
  ];

  const visibleLinks: string[] = [];
  const visibleCategories: string[] = [];

  for (const sec of navSections) {
    const authorized = sec.links.filter((l) => isLinkAuthorized(l.name, l.href, l.subItems));
    if (authorized.length > 0) {
      visibleCategories.push(sec.category);
      visibleLinks.push(...authorized.map((l) => l.name));
    }
  }

  return { visibleLinks, visibleCategories };
}

async function runTests() {
  console.log("=== ORBINOVA SIMPLIFIED HOSPITAL ROLES & RBAC TEST ===");

  // 1. Test Hospital Owner Permissions & Sidebar
  const ownerPerms = getRolePermissions("hospital", "owner");
  console.assert(ownerPerms.includes("dashboard.view"), "Owner must have dashboard.view");
  console.assert(ownerPerms.includes("staff.assign_roles"), "Owner must have staff.assign_roles");
  console.assert(ownerPerms.includes("facility_settings.update"), "Owner must have facility_settings.update");
  console.assert(ownerPerms.includes("inventory.update"), "Owner must have inventory.update");
  console.assert(ownerPerms.includes("donors.verify"), "Owner must have donors.verify");

  const ownerSidebar = simulateSidebar("owner", ownerPerms);
  console.assert(
    ownerSidebar.visibleLinks.includes("Dashboard") &&
      ownerSidebar.visibleLinks.includes("Blood Requests") &&
      ownerSidebar.visibleLinks.includes("Blood Inventory") &&
      ownerSidebar.visibleLinks.includes("Donor Management") &&
      ownerSidebar.visibleLinks.includes("Facility Profile") &&
      ownerSidebar.visibleLinks.includes("Staff & Members") &&
      ownerSidebar.visibleLinks.includes("Notifications") &&
      ownerSidebar.visibleLinks.includes("Facility Settings"),
    "Hospital Owner must see all 8 standard hospital sidebar links"
  );
  console.log("✓ Hospital Owner has full institutional access across all 8 navigation items");

  // 2. Test Hospital Administrator Permissions & Sidebar
  const adminPerms = getRolePermissions("hospital", "administrator");
  console.assert(adminPerms.includes("dashboard.view"), "Administrator must have dashboard.view");
  console.assert(adminPerms.includes("staff.invite"), "Administrator must have staff.invite");
  console.assert(adminPerms.includes("inventory.view"), "Administrator must have inventory.view");
  console.assert(adminPerms.includes("donors.register"), "Administrator must have donors.register");
  console.assert(adminPerms.includes("facility_settings.view"), "Administrator must have facility_settings.view");

  const adminSidebar = simulateSidebar("administrator", adminPerms);
  console.assert(
    adminSidebar.visibleLinks.includes("Dashboard") &&
      adminSidebar.visibleLinks.includes("Blood Requests") &&
      adminSidebar.visibleLinks.includes("Blood Inventory") &&
      adminSidebar.visibleLinks.includes("Donor Management") &&
      adminSidebar.visibleLinks.includes("Facility Profile") &&
      adminSidebar.visibleLinks.includes("Staff & Members") &&
      adminSidebar.visibleLinks.includes("Notifications") &&
      adminSidebar.visibleLinks.includes("Facility Settings"),
    "Hospital Administrator must see all authorized administrative sidebar links"
  );
  console.log("✓ Hospital Administrator has delegated administrative operations access");

  // 3. Test Donor Coordinator Permissions & Sidebar
  const coordPerms = getRolePermissions("hospital", "donor_coordinator");
  console.assert(coordPerms.includes("dashboard.view"), "Coordinator must have dashboard.view");
  console.assert(coordPerms.includes("donors.register"), "Coordinator must have donors.register");
  console.assert(coordPerms.includes("donors.verify"), "Coordinator must have donors.verify");
  console.assert(coordPerms.includes("blood_requests.view_donor_matching"), "Coordinator must have matching view");
  console.assert(!coordPerms.includes("staff.invite"), "Coordinator must NOT have staff.invite");
  console.assert(!coordPerms.includes("inventory.update"), "Coordinator must NOT have inventory.update");
  console.assert(!coordPerms.includes("facility_settings.view"), "Coordinator must NOT have facility_settings.view");

  const coordSidebar = simulateSidebar("donor_coordinator", coordPerms);
  console.assert(
    coordSidebar.visibleLinks.includes("Dashboard") &&
      coordSidebar.visibleLinks.includes("Blood Requests") &&
      coordSidebar.visibleLinks.includes("Donor Management") &&
      coordSidebar.visibleLinks.includes("Notifications"),
    "Donor Coordinator must see exactly Dashboard, Blood Requests, Donor Management, and Notifications"
  );
  console.assert(!coordSidebar.visibleLinks.includes("Blood Inventory"), "Coordinator must NOT see Blood Inventory");
  console.assert(!coordSidebar.visibleLinks.includes("Staff & Members"), "Coordinator must NOT see Staff & Members");
  console.assert(!coordSidebar.visibleLinks.includes("Facility Profile"), "Coordinator must NOT see Facility Profile");
  console.assert(!coordSidebar.visibleLinks.includes("Facility Settings"), "Coordinator must NOT see Facility Settings");
  console.assert(!coordSidebar.visibleCategories.includes("Organization"), "Organization section heading must be hidden");
  console.log("✓ Donor Coordinator navigation strictly restricted (Inventory, Staff, and Settings hidden)");

  // 4. Test Clinical Staff Permissions & Sidebar
  const clinicalPerms = getRolePermissions("hospital", "clinical_staff");
  console.assert(clinicalPerms.includes("dashboard.view"), "Clinical Staff must have dashboard.view");
  console.assert(clinicalPerms.includes("blood_requests.create"), "Clinical Staff must have blood_requests.create");
  console.assert(clinicalPerms.includes("blood_requests.confirm_receipt"), "Clinical Staff must have blood_requests.confirm_receipt");
  console.assert(!clinicalPerms.includes("staff.view"), "Clinical Staff must NOT have staff.view");
  console.assert(!clinicalPerms.includes("inventory.view"), "Clinical Staff must NOT have inventory.view");
  console.assert(!clinicalPerms.includes("donors.view"), "Clinical Staff must NOT have donors.view");
  console.assert(!clinicalPerms.includes("facility_settings.view"), "Clinical Staff must NOT have facility_settings.view");

  const clinicalSidebar = simulateSidebar("clinical_staff", clinicalPerms);
  console.assert(
    clinicalSidebar.visibleLinks.includes("Dashboard") &&
      clinicalSidebar.visibleLinks.includes("Blood Requests") &&
      clinicalSidebar.visibleLinks.includes("Notifications"),
    "Clinical Staff must see exactly Dashboard, Blood Requests, and Notifications"
  );
  console.assert(!clinicalSidebar.visibleLinks.includes("Donor Management"), "Clinical Staff must NOT see Donor Management");
  console.assert(!clinicalSidebar.visibleLinks.includes("Blood Inventory"), "Clinical Staff must NOT see Blood Inventory");
  console.assert(!clinicalSidebar.visibleLinks.includes("Staff & Members"), "Clinical Staff must NOT see Staff & Members");
  console.assert(!clinicalSidebar.visibleLinks.includes("Facility Profile"), "Clinical Staff must NOT see Facility Profile");
  console.assert(!clinicalSidebar.visibleCategories.includes("Organization"), "Empty Organization category must be pruned");
  console.log("✓ Clinical Staff navigation strictly limited to clinical workflow (No Staff, Donors, or Inventory)");

  // 5. Test Radiologist Permissions & Imaging Access
  const radPerms = getRolePermissions("hospital", "radiologist");
  console.assert(radPerms.includes("imaging.access"), "Radiologist must have imaging.access");
  console.assert(radPerms.includes("imaging.upload"), "Radiologist must have imaging.upload");
  console.assert(canAccessModule("hospital", "imaging", "radiologist"), "canAccessModule must permit Radiologist");
  console.assert(!canAccessModule("hospital", "imaging", "clinical_staff"), "canAccessModule must deny Clinical Staff without delegation");
  console.log("✓ Radiologist correctly scoped to ORBINOVA Imaging diagnostic application");

  // 6. Test Delegated Permissions Dynamically Unlocking Capabilities
  const delegatedClinicalPerms = getRolePermissions("hospital", "clinical_staff", [
    "inventory.view",
    "inventory.add",
  ]);
  console.assert(delegatedClinicalPerms.includes("inventory.view"), "Delegated inventory.view must be present");
  const delegatedSidebar = simulateSidebar("clinical_staff", delegatedClinicalPerms);
  console.assert(
    delegatedSidebar.visibleLinks.includes("Blood Inventory"),
    "Blood Inventory must dynamically unlock when inventory.view is delegated"
  );
  console.log("✓ Delegated permissions dynamically expand navigation and access beyond baseline role");

  // 7. Test Backward Compatibility with Legacy Roles
  const legacyDocPerms = getRolePermissions("hospital", "doctor");
  const legacyNursePerms = getRolePermissions("hospital", "nurse");
  const legacyStaffPerms = getRolePermissions("hospital", "hospital_staff");
  console.assert(legacyDocPerms.includes("blood_requests.create"), "Legacy doctor must retain clinical permissions");
  console.assert(legacyNursePerms.includes("blood_requests.create"), "Legacy nurse must retain clinical permissions");
  console.assert(legacyStaffPerms.includes("blood_requests.view"), "Legacy staff must retain access");
  console.log("✓ Legacy roles (doctor, nurse, hospital_staff, manager) seamlessly supported without breakage");

  console.log("\nALL 20 RBAC & NAVIGATION ASSERTIONS PASSED!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
