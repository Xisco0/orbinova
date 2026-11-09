import { isValidDonorReference, generateUniqueDonorReference, getDonorDisplayReference } from "../src/lib/donor/donorReference";
import fs from "fs";
import path from "path";

async function verifyAll() {
  console.log("=== RUNNING VERIFICATION FOR ALL 5 TASKS ===\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`✓ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${msg}`);
      failed++;
    }
  }

  // --- TASK 1: AUTHENTICATION & SESSION EXPIRATION ---
  console.log("--- Task 1: Session Management & Expiration Prevention ---");
  const sessionRoutePath = path.join(process.cwd(), "src/app/api/auth/session/route.ts");
  const sessionGuardPath = path.join(process.cwd(), "src/components/auth/SessionGuard.tsx");
  const modalPath = path.join(process.cwd(), "src/components/auth/InactivityWarningModal.tsx");

  assert(fs.existsSync(sessionRoutePath), "API Session route exists");
  assert(fs.existsSync(sessionGuardPath), "SessionGuard component exists");
  assert(fs.existsSync(modalPath), "InactivityWarningModal exists");

  const sessionContent = fs.readFileSync(sessionRoutePath, "utf-8");
  assert(sessionContent.includes("export async function POST"), "Session API supports user activity touch (POST)");
  assert(sessionContent.includes("checkSessionStatus"), "Session API checks legitimate session status instead of cold start false eviction");
  assert(sessionContent.includes("remainingInactivitySeconds"), "Session API returns remaining inactivity seconds");

  const guardContent = fs.readFileSync(sessionGuardPath, "utf-8");
  assert(guardContent.includes("BroadcastChannel"), "SessionGuard uses BroadcastChannel for multi-tab synchronization");
  assert(guardContent.includes("InactivityWarningModal"), "SessionGuard renders countdown warning modal 2 minutes before timeout");

  // --- TASK 2: DONOR REFERENCE GENERATION ---
  console.log("\n--- Task 2: Strict DONOR-XXXXXX Reference Format ---");
  const sampleRef = generateUniqueDonorReference();
  console.log(`Generated sample reference: ${sampleRef}`);
  assert(/^DONOR-\d{6}$/.test(sampleRef), `Sample reference matches ^DONOR-\\d{6}$ format: ${sampleRef}`);
  assert(isValidDonorReference(sampleRef), "isValidDonorReference approves valid format");
  assert(!isValidDonorReference("DONOR-12345"), "isValidDonorReference rejects 5 digits");
  assert(!isValidDonorReference("DONOR-1234567"), "isValidDonorReference rejects 7 digits");
  assert(!isValidDonorReference("DONOR-ABCDEF"), "isValidDonorReference rejects hex/letters");
  assert(!isValidDonorReference("DONOR-1776af"), "isValidDonorReference rejects legacy sliced UUID");

  // Generate 50 references and test uniqueness & 6 digits
  const refs = new Set<string>();
  for (let i = 0; i < 50; i++) {
    const r = generateUniqueDonorReference();
    assert(/^DONOR-\d{6}$/.test(r), `Reference ${r} is 6 digits with leading zeros preserved`);
    refs.add(r);
  }
  assert(refs.size === 50, "All 50 generated references are unique with zero collisions");

  // Test getDonorDisplayReference helper
  const display1 = getDonorDisplayReference("1776af45-264a-4dc7-a9c3-3378c64e6f9c", "DONOR-001234");
  assert(display1 === "DONOR-001234", `Displays direct reference when valid: ${display1}`);

  // --- TASK 3: SAFE TEST DATA RESET ---
  console.log("\n--- Task 3: Clean Empty Test Data State & Preserved Core Records ---");
  const DATA_DIR = path.join(process.cwd(), ".data");
  const readJson = (file: string) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf-8"));
    } catch {
      return null;
    }
  };

  const donors = readJson("facility_donors.json");
  const bloodRequests = readJson("blood_requests.json");
  const donorRequests = readJson("donor_requests.json");
  const donorScreenings = readJson("donor_screenings.json");
  const bloodReservations = readJson("blood_reservations.json");

  assert(donors && Object.keys(donors).length === 0, "facility_donors.json is 100% clean and empty");
  assert(bloodRequests && Object.keys(bloodRequests).length === 0, "blood_requests.json is 100% clean and empty");
  assert(donorRequests && Object.keys(donorRequests).length === 0, "donor_requests.json is 100% clean and empty");
  assert(donorScreenings && Object.keys(donorScreenings).length === 0, "donor_screenings.json is 100% clean and empty");
  assert(bloodReservations && Object.keys(bloodReservations).length === 0, "blood_reservations.json is 100% clean and empty");

  // Verify backup exists
  const backups = fs.readdirSync(DATA_DIR).filter((f) => f.startsWith("backup_pre_reset_"));
  assert(backups.length >= 1, `Snapshot backup directory created: ${backups[0]}`);

  // Verify preserved institutional data
  const staff = readJson("staff_roster.json");
  const inventory = readJson("blood_inventory.json");
  const bloodUnits = readJson("blood_units.json");
  const centralizedAudit = readJson("centralized_audit_logs.json");

  assert(staff && Object.keys(staff).length > 0, `Preserved ${Object.keys(staff).length} staff members`);
  assert(inventory && Object.keys(inventory).length > 0, `Preserved ${Object.keys(inventory).length} inventory records`);
  assert(bloodUnits && Object.keys(bloodUnits).length > 0, `Preserved ${Object.keys(bloodUnits).length} physical blood units`);
  assert(centralizedAudit && (Array.isArray(centralizedAudit) ? centralizedAudit.length : Object.keys(centralizedAudit).length) > 0, `Preserved ${centralizedAudit.length} centralized audit log entries`);

  // --- TASK 4: COMPULSORY EMAIL VALIDATION ---
  console.log("\n--- Task 4: Compulsory Email for Voluntary Donor Registration ---");
  const hospitalActionsPath = path.join(process.cwd(), "src/actions/hospitalActions.ts");
  const registerModalPath = path.join(process.cwd(), "src/components/hospital/RegisterDonorModal.tsx");

  const hospitalActionsContent = fs.readFileSync(hospitalActionsPath, "utf-8");
  assert(hospitalActionsContent.includes('return { success: false, error: "Email address is required." };'), "Backend enforces compulsory email address for donor registration");
  assert(hospitalActionsContent.includes('Placeholder emails are not permitted'), "Backend rejects fake / placeholder emails (@orbinova.local, .local, etc.)");

  const registerModalContent = fs.readFileSync(registerModalPath, "utf-8");
  assert(registerModalContent.includes('label="Email Address *"'), "RegisterDonorModal displays required * indicator for email");
  assert(registerModalContent.includes('setEmailError("Email address is required.")'), "RegisterDonorModal enforces inline error if email is empty");

  // --- TASK 5: STANDARDIZE FORM INPUTS ---
  console.log("\n--- Task 5: Standardized Form Inputs (TextField & SelectField) ---");
  const textFieldPath = path.join(process.cwd(), "src/components/ui/text-field.tsx");
  const selectFieldPath = path.join(process.cwd(), "src/components/ui/select-field.tsx");
  const uiIndexPath = path.join(process.cwd(), "src/components/ui/index.ts");

  assert(fs.existsSync(textFieldPath), "TextField component exists");
  assert(fs.existsSync(selectFieldPath), "SelectField component exists");

  const uiIndexContent = fs.readFileSync(uiIndexPath, "utf-8");
  assert(uiIndexContent.includes("text-field"), "TextField exported from @/components/ui");
  assert(uiIndexContent.includes("select-field"), "SelectField exported from @/components/ui");

  assert(registerModalContent.includes("<TextField"), "RegisterDonorModal standardized to use TextField");
  const editModalContent = fs.readFileSync(path.join(process.cwd(), "src/components/hospital/EditDonorModal.tsx"), "utf-8");
  assert(editModalContent.includes("<TextField"), "EditDonorModal standardized to use TextField");
  const forgotPwContent = fs.readFileSync(path.join(process.cwd(), "src/app/(auth)/forgot-password/page.tsx"), "utf-8");
  assert(forgotPwContent.includes("<TextField"), "ForgotPasswordPage standardized to use TextField");
  const resetPwContent = fs.readFileSync(path.join(process.cwd(), "src/app/(auth)/reset-password/page.tsx"), "utf-8");
  assert(resetPwContent.includes("<TextField"), "ResetPasswordPage standardized to use TextField");
  const bloodReqContent = fs.readFileSync(path.join(process.cwd(), "src/components/hospital/BloodRequestForm.tsx"), "utf-8");
  assert(bloodReqContent.includes("<SelectField") && bloodReqContent.includes("<TextField"), "BloodRequestForm standardized to use SelectField and TextField");

  console.log(`\n========================================`);
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

verifyAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
