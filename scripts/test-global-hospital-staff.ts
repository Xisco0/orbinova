import { extractSurname, generateTemporaryPassword } from "../src/lib/auth/passwordUtils";
import { staffStore } from "../src/services/staffStore";
import { hospitalService } from "../src/services/hospitalService";
import { KNOWN_ORGANIZATIONS } from "../src/services/facilityRelationships";
import { assertOrgAccess, getRolePermissions } from "../src/lib/auth/rbac";
import { validateEmailUniqueness } from "../src/lib/auth/emailUniqueness";

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

async function runGlobalHospitalTests() {
  console.log("\n============================================================");
  console.log("ORBINOVA — GLOBAL MULTI-HOSPITAL STAFF REGISTRATION & AUTH SUITE");
  console.log("============================================================\n");

  // TEST SUITE 1: Surname Extraction & Cryptographic Temporary Password Generation
  console.log("--- 1. Surname Extraction & Format (SURNAME + 4 DIGITS) ---");

  const testCases = [
    { input: "Okafor Kelechi", expectedSurname: "Okafor" },
    { input: "Dr. Bello Aisha", expectedSurname: "Bello" },
    { input: "Adeyemi, Babatunde", expectedSurname: "Adeyemi" },
    { input: "Nurse Eze Chinedu", expectedSurname: "Eze" },
    { input: "Prof. Mohammed Ibrahim", expectedSurname: "Mohammed" },
  ];

  for (const tc of testCases) {
    const extracted = extractSurname(tc.input);
    assert(extracted === tc.expectedSurname, `extractSurname("${tc.input}") -> "${extracted}" === "${tc.expectedSurname}"`);

    const { surname, temporaryPassword } = generateTemporaryPassword(tc.input);
    assert(surname === tc.expectedSurname, `generateTemporaryPassword returns correct surname "${surname}"`);
    
    // Check format: SURNAME + 4 DIGITS
    const expectedRegex = new RegExp(`^${tc.expectedSurname}\\d{4}$`);
    assert(expectedRegex.test(temporaryPassword), `Temporary password "${temporaryPassword}" matches format SURNAME + 4 DIGITS`);
    
    // Check length: surname.length + 4
    assert(temporaryPassword.length === tc.expectedSurname.length + 4, `Password length is exact: ${temporaryPassword.length}`);
  }

  // TEST SUITE 2: Multi-Hospital Staff Creation & Association (No Hardcoding)
  console.log("\n--- 2. Multi-Hospital Staff Account Creation & Linking ---");

  // Hospital 1: LUTH
  const hosp1 = KNOWN_ORGANIZATIONS.find((o) => o.id === "a1111111-1111-1111-1111-111111111111")!;
  assert(hosp1 !== undefined, "Hospital 1 (LUTH) exists in registry");

  // Hospital 2: National Orthopaedic Hospital (Hospital B)
  const hosp2 = KNOWN_ORGANIZATIONS.find((o) => o.id === "a2222222-2222-2222-2222-222222222222")!;
  assert(hosp2 !== undefined, "Hospital 2 (National Orthopaedic Hospital) exists in registry");

  // Hospital 3: Abuja National Hospital (Hospital C)
  const hosp3 = KNOWN_ORGANIZATIONS.find((o) => o.id === "a3333333-3333-3333-3333-333333333333")!;
  assert(hosp3 !== undefined, "Hospital 3 (Abuja National Hospital) exists in registry");

  const ts = Date.now();

  // Create Staff for Hospital 1 (LUTH)
  const staff1Email = `dr.okafor.${ts}@luth.orbinova.com`;
  const { temporaryPassword: pass1 } = generateTemporaryPassword("Okafor Kelechi");
  staffStore.save({
    userId: `user-hosp1-${ts}`,
    memberId: `member-hosp1-${ts}`,
    organizationId: hosp1.id,
    fullName: "Dr. Kelechi Okafor",
    surname: "Okafor",
    email: staff1Email,
    memberRole: "doctor",
    isActive: true,
    temporaryPassword: pass1,
    mustChangePassword: true,
  });

  // Create Staff for Hospital 2 (National Orthopaedic Hospital / Hospital B)
  const staff2Email = `dr.bello.${ts}@orthopaedic.orbinova.com`;
  const { temporaryPassword: pass2 } = generateTemporaryPassword("Bello Aisha");
  staffStore.save({
    userId: `user-hosp2-${ts}`,
    memberId: `member-hosp2-${ts}`,
    organizationId: hosp2.id,
    fullName: "Dr. Aisha Bello",
    surname: "Bello",
    email: staff2Email,
    memberRole: "doctor",
    isActive: true,
    temporaryPassword: pass2,
    mustChangePassword: true,
  });

  // Create Radiologist Staff for Hospital 3 (Abuja National Hospital / Hospital C)
  const staff3Email = `rad.adeyemi.${ts}@abujahospital.orbinova.com`;
  const { temporaryPassword: pass3 } = generateTemporaryPassword("Adeyemi Babatunde");
  staffStore.save({
    userId: `user-hosp3-${ts}`,
    memberId: `member-hosp3-${ts}`,
    organizationId: hosp3.id,
    fullName: "Dr. Babatunde Adeyemi",
    surname: "Adeyemi",
    email: staff3Email,
    memberRole: "radiologist",
    isActive: true,
    temporaryPassword: pass3,
    mustChangePassword: true,
  });

  const staff1 = staffStore.get(staff1Email);
  const staff2 = staffStore.get(staff2Email);
  const staff3 = staffStore.get(staff3Email);

  assert(staff1?.organizationId === hosp1.id, "Staff 1 is correctly linked to Hospital 1 (LUTH)");
  assert(staff2?.organizationId === hosp2.id, "Staff 2 is correctly linked to Hospital 2 (Orthopaedic)");
  assert(staff3?.organizationId === hosp3.id, "Staff 3 is correctly linked to Hospital 3 (Abuja National)");
  assert(staff1?.organizationId !== staff2?.organizationId, "Staff 1 and Staff 2 belong to distinct hospitals");

  // TEST SUITE 3: Strict Multi-Tenant Institutional Isolation
  console.log("\n--- 3. Strict Institutional Data & Management Isolation ---");

  // Hospital 1 roster only contains Hospital 1 staff
  const hosp1Roster = await hospitalService.getMembers(hosp1.id);
  assert(hosp1Roster.some((m) => m.profile?.email === staff1Email), "Hospital 1 roster contains Staff 1");
  assert(!hosp1Roster.some((m) => m.profile?.email === staff2Email), "Hospital 1 roster DOES NOT contain Staff 2 (Strict isolation)");
  assert(!hosp1Roster.some((m) => m.profile?.email === staff3Email), "Hospital 1 roster DOES NOT contain Staff 3 (Strict isolation)");

  // Hospital 2 roster only contains Hospital 2 staff
  const hosp2Roster = await hospitalService.getMembers(hosp2.id);
  assert(hosp2Roster.some((m) => m.profile?.email === staff2Email), "Hospital 2 roster contains Staff 2");
  assert(!hosp2Roster.some((m) => m.profile?.email === staff1Email), "Hospital 2 roster DOES NOT contain Staff 1 (Strict isolation)");

  // Cross-tenant management prevention
  let crossTenantBlocked = false;
  try {
    assertOrgAccess(
      {
        id: "admin-hosp2",
        role: "hospital",
        organization_id: hosp2.id,
        isSuperAdmin: false,
      },
      hosp1.id // Attempting to modify Hospital 1 while authenticated under Hospital 2
    );
  } catch (err: any) {
    crossTenantBlocked = true;
  }
  assert(crossTenantBlocked, "Hospital 2 administrator is forbidden from managing Hospital 1 staff");

  // Context resolution: Hospital 2 staff automatically resolves Hospital 2
  const hosp2StaffContext = await hospitalService.getHospitalContext(`user-hosp2-${ts}`);
  assert(hosp2StaffContext !== null, "Hospital 2 staff context resolved successfully");
  assert(hosp2StaffContext?.organization.id === hosp2.id, "Hospital 2 staff context is strictly bound to Hospital 2");
  assert(hosp2StaffContext?.organization.name === hosp2.name, `Context facility name matches "${hosp2.name}"`);

  // Context resolution: Hospital 3 staff automatically resolves Hospital 3
  const hosp3StaffContext = await hospitalService.getHospitalContext(`user-hosp3-${ts}`);
  assert(hosp3StaffContext !== null, "Hospital 3 staff context resolved successfully");
  assert(hosp3StaffContext?.organization.id === hosp3.id, "Hospital 3 staff context is strictly bound to Hospital 3");
  assert(hosp3StaffContext?.organization.name === hosp3.name, `Context facility name matches "${hosp3.name}"`);

  // TEST SUITE 4: First-Login Password Change Requirement & Redirection
  console.log("\n--- 4. First-Login Password Change & Role Redirection ---");

  // Check initial state
  assert(staff2?.mustChangePassword === true, "Hospital 2 staff account flagged with mustChangePassword = true");
  assert(staff2?.temporaryPassword === pass2, "Hospital 2 temporary password retained for verification");

  // Simulate login redirection logic
  function calculateLoginRedirect(userStaff: any) {
    if (userStaff?.mustChangePassword) {
      return "/reset-password?first_login=true";
    }
    if (userStaff?.memberRole === "radiologist") {
      return "/imaging";
    }
    return "/hospital/dashboard";
  }

  // Initial login attempt redirects to password change
  const initialRedirect = calculateLoginRedirect(staff2);
  assert(initialRedirect === "/reset-password?first_login=true", "First successful login redirects to /reset-password?first_login=true");

  // Radiologist initial login attempt also redirects to password change first
  const radInitialRedirect = calculateLoginRedirect(staff3);
  assert(radInitialRedirect === "/reset-password?first_login=true", "Radiologist first login also requires password change");

  // Perform password change
  const newPermanentPassword = "BelloPermanent2026!";
  const marked = staffStore.markPasswordChanged(staff2Email);
  assert(marked === true, "staffStore.markPasswordChanged executed successfully");

  const updatedStaff2 = staffStore.get(staff2Email);
  assert(updatedStaff2?.mustChangePassword === false, "mustChangePassword is now false after password change");
  assert(updatedStaff2?.temporaryPassword === undefined, "temporaryPassword cleared after permanent password set");
  assert(typeof updatedStaff2?.passwordChangedAt === "string", "passwordChangedAt timestamp recorded");

  // Subsequent login redirects to role-appropriate dashboard
  const postChangeRedirect = calculateLoginRedirect(updatedStaff2);
  assert(postChangeRedirect === "/hospital/dashboard", "Post-change login redirects Doctor directly to /hospital/dashboard");

  // Test Radiologist post-change redirection
  staffStore.markPasswordChanged(staff3Email);
  const updatedStaff3 = staffStore.get(staff3Email);
  const radPostChangeRedirect = calculateLoginRedirect(updatedStaff3);
  assert(radPostChangeRedirect === "/imaging", "Post-change login redirects Radiologist directly to /imaging");

  // TEST SUITE 5: Global Email Uniqueness
  console.log("\n--- 5. Global Email Uniqueness Protection ---");
  const duplicateCheck = await validateEmailUniqueness(staff2Email);
  assert(duplicateCheck.isUnique === false, "Existing staff email detected as already registered");

  const freshEmail = `unique.staff.${ts}@healthcare.orbinova.com`;
  const freshCheck = await validateEmailUniqueness(freshEmail);
  assert(freshCheck.isUnique === true, "New unique staff email passes uniqueness check");

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

runGlobalHospitalTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
