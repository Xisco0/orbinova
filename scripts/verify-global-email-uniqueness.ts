if (typeof (globalThis as any).WebSocket === "undefined") {
  (globalThis as any).WebSocket = class WebSocket {};
}

import { validateEmailUniqueness } from "../src/lib/auth/emailUniqueness";
import { addStaffMemberAction } from "../src/actions/staffActions";
import { registerHospitalDonorAction } from "../src/actions/hospitalActions";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName} - ${detail || "Condition not met"}`);
    failedCount++;
  }
}

async function runEmailUniquenessTests() {
  console.log("==============================================================================");
  console.log("ORBINOVA GLOBAL EMAIL UNIQUENESS VERIFICATION SUITE");
  console.log("==============================================================================\n");

  // --------------------------------------------------------------------------
  console.log("--- 1. Clean Unique Email Validation ---");
  // --------------------------------------------------------------------------
  const freshEmail = `test-specialist-${Date.now()}@orbinova-health.org`;
  const freshCheck = await validateEmailUniqueness(freshEmail);
  assert(freshCheck.isUnique === true, "Unused fresh email is accepted as unique");
  assert(!freshCheck.error, "No error returned for fresh unique email");

  // --------------------------------------------------------------------------
  console.log("\n--- 2. Staff Registration Email Collision with Existing Staff ---");
  // --------------------------------------------------------------------------
  const staffCheck = await validateEmailUniqueness("doctor@orbinova.com");
  assert(staffCheck.isUnique === false, "Existing staff email (doctor@orbinova.com) is REJECTED");
  assert(
    staffCheck.error?.toLowerCase().includes("already registered") === true,
    `Clear conflict error returned: "${staffCheck.error}"`
  );

  const cmoCheck = await validateEmailUniqueness("hospital@orbinova.com");
  assert(cmoCheck.isUnique === false, "Facility owner/CMO email (hospital@orbinova.com) is REJECTED");

  // --------------------------------------------------------------------------
  console.log("\n--- 3. Cross-Domain: Staff Registration Collision with Donor Email ---");
  // --------------------------------------------------------------------------
  const staffTriesDonorEmail = await validateEmailUniqueness("donor@orbinova.com");
  assert(
    staffTriesDonorEmail.isUnique === false,
    "Attempting to use Donor email (donor@orbinova.com) for a staff member is REJECTED"
  );
  assert(
    staffTriesDonorEmail.conflictType === "donor" || staffTriesDonorEmail.conflictType === "profile",
    `Identified as cross-domain donor conflict (type: ${staffTriesDonorEmail.conflictType})`
  );

  // --------------------------------------------------------------------------
  console.log("\n--- 4. Cross-Domain: Donor Registration Collision with Staff Email ---");
  // --------------------------------------------------------------------------
  const donorTriesStaffEmail = await validateEmailUniqueness("radiologist@orbinova.com");
  assert(
    donorTriesStaffEmail.isUnique === false,
    "Attempting to use Staff email (radiologist@orbinova.com) for a donor is REJECTED"
  );

  // --------------------------------------------------------------------------
  console.log("\n--- 5. Server Action Enforcement: addStaffMemberAction ---");
  // --------------------------------------------------------------------------
  // Attempting to add staff using donor email
  const addStaffCollisionRes = await addStaffMemberAction({
    organizationId: "a1111111-1111-1111-1111-111111111111",
    fullName: "Duplicate User Attempt",
    email: "donor@orbinova.com",
    phone: "08012345678",
    memberRole: "doctor",
  });
  assert(addStaffCollisionRes.success === false, "addStaffMemberAction BLOCKED duplicate email (donor@orbinova.com)");
  assert(
    addStaffCollisionRes.error?.toLowerCase().includes("already registered") === true ||
    addStaffCollisionRes.error?.toLowerCase().includes("already in use") === true ||
    addStaffCollisionRes.error?.toLowerCase().includes("already exists") === true,
    `Error returned to caller: "${addStaffCollisionRes.error}"`
  );

  // --------------------------------------------------------------------------
  console.log("\n--- 6. Server Action Enforcement: registerHospitalDonorAction ---");
  // --------------------------------------------------------------------------
  // Attempting to register donor using staff email
  const registerDonorCollisionRes = await registerHospitalDonorAction({
    fullName: "Duplicate Donor Attempt",
    email: "doctor@orbinova.com",
    phone: "08098765432",
    bloodGroup: "O+",
    city: "Lagos",
  });
  assert(
    registerDonorCollisionRes.success === false,
    "registerHospitalDonorAction BLOCKED duplicate email (doctor@orbinova.com)"
  );
  assert(
    registerDonorCollisionRes.error?.toLowerCase().includes("already registered") === true ||
    registerDonorCollisionRes.error?.toLowerCase().includes("already exists") === true,
    `Error returned to caller: "${registerDonorCollisionRes.error}"`
  );

  // --------------------------------------------------------------------------
  console.log("\n--- 7. Self-Exclusion Validation ---");
  // --------------------------------------------------------------------------
  const selfCheck = await validateEmailUniqueness(
    "hospital@orbinova.com",
    "d0000001-0000-0000-0000-000000000001"
  );
  assert(selfCheck.isUnique === true, "User's own email is permitted when excluding their own userId");

  console.log("\n==============================================================================");
  console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("==============================================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runEmailUniquenessTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
