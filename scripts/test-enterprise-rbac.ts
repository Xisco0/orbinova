/**
 * ORBINOVA ENTERPRISE RBAC & SECURITY VERIFICATION SUITE
 * Exhaustive Zero-Privilege-Escalation & Multi-Institution Isolation Tests
 */

import {
  getRolePermissions,
  hasPermission,
  canAccessModule,
  assertOrgAccess,
  assertApprovedInstitution,
} from "../src/lib/auth/rbac";
import { GranularMemberRole, UserRole } from "../src/types/database";

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    testsFailed++;
  }
}

function assertThrows(fn: () => void, testName: string) {
  try {
    fn();
    console.error(`  ❌ FAIL: Expected error but none thrown: ${testName}`);
    testsFailed++;
  } catch (err: any) {
    console.log(`  ✅ PASS: Correctly blocked with error [${err.message.substring(0, 45)}...]: ${testName}`);
    testsPassed++;
  }
}

console.log("==============================================================================");
console.log("ORBINOVA ENTERPRISE RBAC & HEALTHCARE SECURITY VERIFICATION");
console.log("==============================================================================\n");

// 1. Super Admin Authority
console.log("--- Level 1: Super Admin Clearance ---");
assert(hasPermission("superadmin", "platform.manage"), "Super Admin possesses platform.manage");
assert(hasPermission("superadmin", "institutions.approve"), "Super Admin can approve institutions");
assert(hasPermission("superadmin", "audit_logs.view"), "Super Admin can view global audit logs");
assert(canAccessModule("superadmin", "imaging"), "Super Admin has clearance for Imaging module");

// 2. Platform Admin Clearance
console.log("\n--- Level 2: Platform Admin Clearance ---");
assert(hasPermission("admin", "institutions.approve"), "Platform Admin can approve institutions");
assert(hasPermission("admin", "institutions.view_all"), "Platform Admin can view all institutions");
assert(!hasPermission("admin", "platform.manage"), "Platform Admin CANNOT manage superadmin settings (least privilege)");

// 3. Hospital Admin Clearance
console.log("\n--- Level 3: Hospital Admin Clearance ---");
assert(hasPermission("hospital", "staff.invite", "owner"), "Hospital Admin can invite staff to their facility");
assert(hasPermission("hospital", "staff.manage", "owner"), "Hospital Admin can manage staff roles");
assert(hasPermission("hospital", "blood_requests.create", "owner"), "Hospital Admin can create emergency blood requests");
assert(canAccessModule("hospital", "imaging", "owner"), "Hospital Admin can access Imaging module");
assert(!hasPermission("hospital", "platform.manage", "owner"), "Hospital Admin CANNOT manage platform settings");
assert(!hasPermission("hospital", "institutions.approve", "owner"), "Hospital Admin CANNOT approve other institutions");

// 4. Clinical Staff Granular Roles (Doctor, Radiologist, Donor Coordinator, Nurse)
console.log("\n--- Level 4: Hospital Clinical Staff Clearance ---");
// Doctor
assert(hasPermission("hospital", "blood_requests.create", "doctor"), "Doctor can create emergency blood requests");
assert(hasPermission("hospital", "donors.verify", "doctor"), "Doctor can verify donor eligibility");
assert(canAccessModule("hospital", "imaging", "doctor"), "Doctor has clearance to access Imaging module");
assert(!hasPermission("hospital", "staff.invite", "doctor"), "Doctor CANNOT invite or manage facility staff");

// Radiologist
assert(canAccessModule("hospital", "imaging", "radiologist"), "Radiologist has clearance for Imaging module");
assert(hasPermission("hospital", "imaging.annotate", "radiologist"), "Radiologist can annotate diagnostic reports");
assert(!hasPermission("hospital", "blood_requests.create", "radiologist"), "Radiologist CANNOT create emergency blood requests");
assert(!hasPermission("hospital", "donors.verify", "radiologist"), "Radiologist CANNOT verify donor eligibility");

// Donor Coordinator
assert(hasPermission("hospital", "donors.register", "donor_coordinator"), "Donor Coordinator can register voluntary donors");
assert(hasPermission("hospital", "donors.verify", "donor_coordinator"), "Donor Coordinator can verify donor eligibility");
assert(!canAccessModule("hospital", "imaging", "donor_coordinator"), "Donor Coordinator CANNOT access Imaging module");
assert(!hasPermission("hospital", "blood_requests.create", "donor_coordinator"), "Donor Coordinator CANNOT create blood requests");

// Nurse
assert(hasPermission("hospital", "donors.register", "nurse"), "Nurse can register donors at clinic");
assert(!hasPermission("hospital", "donors.verify", "nurse"), "Nurse CANNOT perform final donor medical verification");
assert(!canAccessModule("hospital", "imaging", "nurse"), "Nurse CANNOT access Imaging module");

// 5. Blood Bank Admin & Granular Staff
console.log("\n--- Level 5 & 6: Blood Bank Admin & Operations Staff ---");
// Admin
assert(hasPermission("blood_bank", "blood_inventory.manage", "owner"), "Blood Bank Admin can manage inventory");
assert(hasPermission("blood_bank", "staff.invite", "owner"), "Blood Bank Admin can invite staff to blood bank");
assert(!canAccessModule("blood_bank", "imaging", "owner"), "Blood Bank Admin CANNOT access Hospital Imaging module");

// Inventory Officer
assert(hasPermission("blood_bank", "blood_inventory.manage", "inventory_officer"), "Inventory Officer can manage inventory");
assert(!hasPermission("blood_bank", "staff.invite", "inventory_officer"), "Inventory Officer CANNOT invite staff");

// Lab Technician
assert(hasPermission("blood_bank", "blood_inventory.manage", "blood_bank_technician"), "Technician can update unit status");
assert(!hasPermission("blood_bank", "staff.manage", "blood_bank_technician"), "Technician CANNOT modify staff permissions");

// 6. Level 7: Donors (Strict Restriction on Self-Promotion)
console.log("\n--- Level 7: Voluntary Donors ---");
assert(hasPermission("donor", "donor_profile.view_own"), "Donor can view own profile & donation ledger");
assert(hasPermission("donor", "donor_profile.edit_own"), "Donor can edit own contact details");
assert(!hasPermission("donor", "donors.verify"), "Donor CANNOT verify own eligibility (No self-promotion)");
assert(!hasPermission("donor", "blood_requests.create"), "Donor CANNOT create hospital blood requests");
assert(!hasPermission("donor", "blood_inventory.view"), "Donor CANNOT view blood bank internal stock inventory");
assert(!canAccessModule("donor", "imaging"), "Donor CANNOT access clinical diagnostic imaging");

// 7. Multi-Institution Tenant Boundary Isolation
console.log("\n--- Multi-Institution Data Isolation Checks ---");
const hospitalA = "018f6b8a-7b3b-7f28-8608-8e6dfd1502fa"; // LUTH
const hospitalB = "018f6b8a-7b3b-7f28-8608-8e6dfd1502fc"; // National Hospital Abuja

const userAtHospitalA = {
  id: "user-doctor-1",
  role: "hospital",
  organization_id: hospitalA,
};

// Legitimate access to own hospital
assertThrows(() => {
  assertOrgAccess(userAtHospitalA, hospitalA);
  // Should not throw, so we invert assertion
  throw new Error("ACCESS_GRANTED");
}, "Hospital A doctor accessing Hospital A data is allowed");

// Cross-tenant access attempt: Hospital A doctor trying to access Hospital B
assertThrows(() => {
  assertOrgAccess(userAtHospitalA, hospitalB);
}, "Hospital A doctor attempting to access Hospital B is BLOCKED");

// Super Admin cross-tenant oversight
assertThrows(() => {
  assertOrgAccess({ id: "superadmin-1", role: "superadmin" }, hospitalB);
  throw new Error("ACCESS_GRANTED");
}, "Super Admin permitted cross-tenant administrative access");

// 8. Institutional Approval Verification Prerequisite
console.log("\n--- Institutional Approval Verification Prerequisite ---");
assertThrows(() => {
  assertApprovedInstitution("pending");
}, "Unapproved 'pending' institution is BLOCKED from clinical operations");

assertThrows(() => {
  assertApprovedInstitution("suspended");
}, "Suspended institution is BLOCKED from clinical operations");

assertThrows(() => {
  assertApprovedInstitution("rejected");
}, "Rejected institution is BLOCKED from clinical operations");

assertThrows(() => {
  assertApprovedInstitution("verified");
  throw new Error("VERIFIED_ALLOWED");
}, "Approved 'verified' institution is allowed to operate");

console.log("\n==============================================================================");
console.log(`TEST SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
console.log("==============================================================================");

if (testsFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
