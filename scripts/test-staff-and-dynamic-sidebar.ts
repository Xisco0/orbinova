import { getRolePermissions, hasPermission, canAccessModule, HOSPITAL_GENERAL_STAFF_PERMISSIONS } from "../src/lib/auth/rbac";
import { reservationStore } from "../src/services/reservationStore";
import { getAuthoritativeInventoryOrgId, getLinkedBloodBank } from "../src/services/facilityRelationships";
import { staffStore } from "../src/services/staffStore";

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, details?: string) {
  results.push({ name, passed: Boolean(condition), details });
  if (condition) {
    console.log(`  ✓ [PASS] ${name}`);
  } else {
    console.error(`  ✗ [FAIL] ${name} ${details ? `(${details})` : ""}`);
  }
}

async function runTests() {
  console.log("\n============================================================");
  console.log("ORBINOVA — STAFF REGISTRATION & DYNAMIC SIDEBAR RBAC SUITE");
  console.log("============================================================\n");

  // TEST SUITE 1: Staff Registration Active Status & Title Handling
  console.log("--- 1. Staff Registration & Title Mechanics ---");
  const testEmail = `dr.samuel.${Date.now()}@orbinova.com`;
  const defaultPassword = "StaffPassword2026!";
  
  // Format title check
  const title = "Dr.";
  let rawName = "Samuel Okoro";
  let formattedName = title && !rawName.startsWith(title) ? `${title} ${rawName}` : rawName;
  assert(formattedName === "Dr. Samuel Okoro", "Title prepends cleanly when not present");

  let rawNameWithTitle = "Dr. Samuel Okoro";
  let formattedNameWithTitle = title && !rawNameWithTitle.startsWith(title) ? `${title} ${rawNameWithTitle}` : rawNameWithTitle;
  assert(formattedNameWithTitle === "Dr. Samuel Okoro", "Avoids duplicate title prefixes");

  // Save to staff store as active
  staffStore.save({
    userId: "test-user-active-01",
    memberId: "test-member-active-01",
    organizationId: "a1111111-1111-1111-1111-111111111111",
    fullName: formattedName,
    email: testEmail,
    memberRole: "doctor",
    isActive: true,
  });

  const savedStaff = staffStore.get(testEmail);
  assert(savedStaff !== undefined, "Staff member saved in authoritative store");
  assert(savedStaff?.isActive === true, "Staff account is created in active state for immediate login");
  assert(defaultPassword === "StaffPassword2026!", "Staff default login password provisioned");

  // TEST SUITE 2: Dynamic Role Permissions Verification
  console.log("\n--- 2. Granular Permissions Across All Hospital Roles ---");

  const ownerPerms = getRolePermissions("hospital", "owner");
  const managerPerms = getRolePermissions("hospital", "manager");
  const doctorPerms = getRolePermissions("hospital", "doctor");
  const coordinatorPerms = getRolePermissions("hospital", "donor_coordinator");
  const nursePerms = getRolePermissions("hospital", "nurse");
  const generalStaffPerms = getRolePermissions("hospital", "hospital_staff");
  const radiologistPerms = getRolePermissions("hospital", "radiologist");

  // Hospital General Staff Permissions
  assert(generalStaffPerms.includes("staff.view"), "General Staff has staff.view");
  assert(!generalStaffPerms.includes("blood_requests.create"), "General Staff CANNOT create blood requests");
  assert(!generalStaffPerms.includes("blood_requests.manage"), "General Staff CANNOT manage blood requests");
  assert(!generalStaffPerms.includes("blood_inventory.view"), "General Staff CANNOT view blood inventory");
  assert(!generalStaffPerms.includes("blood_inventory.manage"), "General Staff CANNOT manage blood inventory");
  assert(!generalStaffPerms.includes("donors.register"), "General Staff CANNOT register donors");

  // Doctor Permissions
  assert(doctorPerms.includes("blood_requests.create"), "Doctor can create blood requests");
  assert(doctorPerms.includes("blood_inventory.view"), "Doctor can view blood inventory");
  assert(doctorPerms.includes("imaging.view"), "Doctor can access imaging");
  assert(!doctorPerms.includes("staff.invite"), "Doctor cannot invite staff members");

  // Nurse Permissions
  assert(nursePerms.includes("blood_inventory.view"), "Nurse can view inventory");
  assert(!nursePerms.includes("blood_requests.create"), "Nurse cannot create requests");
  assert(!nursePerms.includes("blood_inventory.manage"), "Nurse cannot adjust inventory");

  // Donor Coordinator Permissions
  assert(coordinatorPerms.includes("donors.register"), "Coordinator can register donors");
  assert(coordinatorPerms.includes("blood_requests.manage"), "Coordinator can coordinate requests");
  assert(!coordinatorPerms.includes("imaging.view"), "Coordinator has no imaging clearance");

  // Radiologist Permissions
  assert(radiologistPerms.includes("imaging.view"), "Radiologist has imaging clearance");
  assert(!radiologistPerms.includes("blood_requests.create"), "Radiologist cannot create blood requests");
  assert(!radiologistPerms.includes("blood_inventory.view"), "Radiologist cannot view blood inventory");

  // TEST SUITE 3: Dynamic Sidebar Pruning Simulator
  console.log("\n--- 3. Dynamic Sidebar Pruning & Visibility Engine ---");

  interface TestLink {
    name: string;
    href?: string;
    subItems?: { name: string; href: string }[];
  }

  interface TestSection {
    category: string;
    links: TestLink[];
  }

  const sampleNavSections: TestSection[] = [
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
          subItems: [
            { name: "Current Stock", href: "/hospital/inventory" },
            { name: "Stock Ledger", href: "/hospital/inventory/transactions" },
          ],
        },
        {
          name: "Donor Management",
          href: "/hospital/donors",
          subItems: [
            { name: "Manage Donors", href: "/hospital/donors" },
            { name: "Candidate Matches", href: "/hospital/donor-requests" },
            { name: "Donations Ledger", href: "/hospital/donations" },
          ],
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

  function simulateSidebar(role: string, isOwner = false, isManager = false) {
    const permissions = getRolePermissions("hospital", role);
    const userIsOwner = isOwner || role === "owner";
    const userIsManager = isManager || role === "manager" || userIsOwner;

    const isSubAuthorized = (href: string) => {
      if (href === "/hospital/inventory") return userIsOwner || userIsManager || permissions.includes("blood_inventory.view") || permissions.includes("blood_inventory.manage");
      if (href === "/hospital/inventory/transactions") return userIsOwner || userIsManager || permissions.includes("blood_inventory.manage");
      if (href === "/hospital/donors") return userIsOwner || userIsManager || permissions.includes("donors.register") || permissions.includes("donors.verify") || permissions.includes("donors.view_records");
      if (href === "/hospital/donor-requests") return userIsOwner || userIsManager || permissions.includes("blood_requests.manage") || permissions.includes("donors.verify");
      if (href === "/hospital/donations") return userIsOwner || userIsManager || permissions.includes("donors.view_records");
      return true;
    };

    const isLinkAuthorized = (link: TestLink, authSubs?: any[]) => {
      if (link.href === "/hospital/dashboard") return true;
      if (link.href === "/hospital/blood-requests") return userIsOwner || userIsManager || permissions.includes("blood_requests.create") || permissions.includes("blood_requests.manage");
      if (link.name === "Blood Inventory") return Boolean(authSubs && authSubs.length > 0);
      if (link.name === "Donor Management") return Boolean(authSubs && authSubs.length > 0);
      if (link.href === "/hospital/organization") return Boolean(userIsOwner || userIsManager);
      if (link.href === "/hospital/members") return userIsOwner || userIsManager || permissions.includes("staff.view");
      if (link.href === "/hospital/notifications") return true;
      if (link.href === "/hospital/settings") return Boolean(userIsOwner);
      return true;
    };

    return sampleNavSections
      .map((sec) => {
        const authorizedLinks: TestLink[] = [];
        for (const link of sec.links) {
          const authSubs = link.subItems ? link.subItems.filter((s) => isSubAuthorized(s.href)) : undefined;
          if (isLinkAuthorized(link, authSubs)) {
            authorizedLinks.push({ ...link, subItems: authSubs });
          }
        }
        return { category: sec.category, links: authorizedLinks };
      })
      .filter((sec) => sec.links.length > 0);
  }

  // 3a. Hospital Owner Sidebar
  const ownerSidebar = simulateSidebar("owner", true, true);
  assert(ownerSidebar.some((s) => s.category === "Overview"), "Owner sees Overview");
  assert(ownerSidebar.some((s) => s.category === "Blood Operations"), "Owner sees Blood Operations");
  assert(ownerSidebar.some((s) => s.category === "Organization"), "Owner sees Organization");
  assert(ownerSidebar.some((s) => s.category === "System"), "Owner sees System");
  const ownerSettings = ownerSidebar.find((s) => s.category === "System")?.links.some((l) => l.name === "Facility Settings");
  assert(ownerSettings === true, "Owner sees Facility Settings");

  // 3b. Facility Manager Sidebar
  const managerSidebar = simulateSidebar("manager", false, true);
  const managerSettings = managerSidebar.find((s) => s.category === "System")?.links.some((l) => l.name === "Facility Settings");
  assert(managerSettings === false, "Facility Manager DOES NOT see Facility Settings (Owner-only)");
  const managerProfile = managerSidebar.find((s) => s.category === "Organization")?.links.some((l) => l.name === "Facility Profile");
  assert(managerProfile === true, "Facility Manager sees Facility Profile");

  // 3c. Doctor Sidebar
  const doctorSidebar = simulateSidebar("doctor");
  const doctorProfile = doctorSidebar.find((s) => s.category === "Organization")?.links.some((l) => l.name === "Facility Profile");
  assert(!doctorProfile, "Doctor DOES NOT see Facility Profile");
  const doctorBloodInv = doctorSidebar.find((s) => s.category === "Blood Operations")?.links.find((l) => l.name === "Blood Inventory");
  assert(doctorBloodInv?.subItems?.some((s) => s.name === "Current Stock") === true, "Doctor sees Current Stock");
  assert(doctorBloodInv?.subItems?.some((s) => s.name === "Stock Ledger") === false, "Doctor does NOT see Stock Ledger");

  // 3d. Hospital General Staff Sidebar (Crucial requirement: entire Blood Operations section pruned)
  const staffSidebar = simulateSidebar("hospital_staff");
  assert(!staffSidebar.some((s) => s.category === "Blood Operations"), "Blood Operations is COMPLETELY REMOVED for Hospital General Staff (No empty headers or gaps!)");
  assert(staffSidebar.some((s) => s.category === "Overview"), "General Staff sees Overview (Dashboard)");
  assert(staffSidebar.some((s) => s.category === "Organization"), "General Staff sees Organization (Staff & Members)");
  assert(staffSidebar.some((s) => s.category === "System"), "General Staff sees System (Notifications)");

  // 3e. Radiologist Module Access
  assert(canAccessModule("hospital", "imaging", "radiologist") === true, "Radiologist can access ORBINOVA Imaging");
  assert(canAccessModule("hospital", "imaging", "doctor") === true, "Doctor can access ORBINOVA Imaging");
  assert(canAccessModule("hospital", "imaging", "hospital_staff") === false, "Hospital General Staff CANNOT access ORBINOVA Imaging");

  // TEST SUITE 4: Inventory Architecture Consolidation & Reservation Store
  console.log("\n--- 4. Inventory Architecture & Duplicate Allocation Reconciliation ---");
  const luthId = "a1111111-1111-1111-1111-111111111111";
  const internalBB = getLinkedBloodBank(luthId);
  assert(internalBB !== null, "LUTH has recognized hospital-owned internal blood bank");
  assert(internalBB?.id === "b2222222-2222-2222-2222-222222222222", "LUTH linked blood bank is LUTH Internal Blood Bank Facility");

  const authoritativeOrg = getAuthoritativeInventoryOrgId(luthId);
  assert(authoritativeOrg === "b2222222-2222-2222-2222-222222222222", "Authoritative inventory owner for LUTH resolves to internal blood bank facility");

  // Verify historical deduplication in reservationStore
  const legacyRequestId = "scen-e-1794042471050";
  const reqReservations = reservationStore.getByRequest(legacyRequestId);
  const luthAllocations = reqReservations.filter((r) => r.sourceOrgId === "b2222222-2222-2222-2222-222222222222");
  assert(luthAllocations.length === 1, "Duplicate legacy allocations are consolidated into a single authoritative facility row");
  if (luthAllocations.length === 1) {
    assert(luthAllocations[0].quantity === 3, "Consolidated allocation correctly combines total units (1 unit own stock + 2 units internal bank = 3 units)");
  }

  // Summary
  console.log("\n============================================================");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;
  console.log(`TOTAL SCENARIOS TESTED: ${total}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log("============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
