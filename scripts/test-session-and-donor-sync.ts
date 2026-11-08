/**
 * ORBINOVA SESSION LIFECYCLE & DONOR SYNC VERIFICATION SUITE
 */

import { SESSION_CONFIG } from "../src/lib/auth/sessionConfig";
import { sessionManager } from "../src/lib/auth/sessionManager";
import { donorStore } from "../src/services/donorStore";

async function runVerification() {
  console.log("================================================================================");
  console.log("ORBINOVA VERIFICATION SUITE: SESSION POLICIES & DONOR INTEGRITY");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(desc: string, condition: boolean) {
    if (condition) {
      console.log(`  [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      failed++;
    }
  }

  // 1. Session Configuration Audit
  console.log("--- 1. Session Configuration Audit ---");
  assert("Access token lifetime is 15 minutes (900s)", SESSION_CONFIG.ACCESS_TOKEN_LIFETIME_SECONDS === 900);
  assert("Refresh token lifetime is 7 days (604800s)", SESSION_CONFIG.REFRESH_TOKEN_LIFETIME_SECONDS === 604800);
  assert("Max session lifetime is 7 days (604800s)", SESSION_CONFIG.MAX_SESSION_LIFETIME_SECONDS === 604800);
  assert("Inactivity timeout is 30 minutes (1800s)", SESSION_CONFIG.INACTIVITY_TIMEOUT_SECONDS === 1800);
  assert("Inactivity warning threshold is 2 minutes (120s)", SESSION_CONFIG.INACTIVITY_WARNING_SECONDS === 120);

  // 2. Session Manager Checks
  console.log("\n--- 2. Session Manager State & Inactivity Engine ---");
  const testUserId = "test-user-session-audit";
  const sessionId1 = await sessionManager.createSession(testUserId, { portalScope: "hospital" });
  assert("Session 1 created with cryptographically secure ID", !!sessionId1 && typeof sessionId1 === "string");

  const check1 = sessionManager.checkSessionStatus(testUserId, sessionId1);
  assert("Initial session check is active and valid", check1.isValid);

  // Record meaningful activity
  sessionManager.recordMeaningfulActivity(testUserId);
  const activeRecord = sessionManager.getActiveSession(testUserId);
  assert("recordMeaningfulActivity updates lastActiveAt timestamp", !!activeRecord?.lastActiveAt);

  // Touch refresh keeps session valid without changing session ID
  const refreshed = sessionManager.touchRefresh(testUserId, sessionId1);
  assert("touchRefresh renews session without invalidating ID", refreshed === true);
  const checkAfterRefresh = sessionManager.checkSessionStatus(testUserId, sessionId1);
  assert("Session remains valid after touchRefresh", checkAfterRefresh.isValid);

  // Single-active session: new login invalidates old session
  const sessionId2 = await sessionManager.createSession(testUserId, { portalScope: "hospital" });
  const checkOldSession = sessionManager.checkSessionStatus(testUserId, sessionId1);
  assert("Previous session immediately invalidated when new login occurs", !checkOldSession.isValid && checkOldSession.reason === "revoked");

  const checkNewSession = sessionManager.checkSessionStatus(testUserId, sessionId2);
  assert("New login session is active and valid", checkNewSession.isValid);

  // 3. Donor Store & Email Preservation
  console.log("\n--- 3. Donor Store & Profile Edit Integrity ---");
  const allDonors = donorStore.getAllList();
  console.log(`Total donors in store: ${allDonors.length}`);
  assert("Store has voluntary donors", allDonors.length >= 4);

  const amina = donorStore.get("d1000005-0000-0000-0000-000000000005") || donorStore.get("amina.yusuf@gmail.com");
  assert("Amina Yusuf donor record exists in store", !!amina);
  assert("Amina Yusuf has valid email", amina?.email === "amina.yusuf@gmail.com");
  assert("Amina Yusuf has valid phone", amina?.phone === "09028836536");

  const chinedu = donorStore.get("d1000006-0000-0000-0000-000000000006") || donorStore.get("chinedu.eze@gmail.com");
  assert("Chinedu Eze donor record exists in store", !!chinedu);
  assert("Chinedu Eze has valid email", chinedu?.email === "chinedu.eze@gmail.com");
  assert("Chinedu Eze has valid phone", chinedu?.phone === "08034567890");

  const francis = donorStore.get("ac1a3dbe-b201-4ae4-b4c7-b0b70373017e") || donorStore.get("bams@gmail.com");
  assert("Francis Bamirin donor record exists in store", !!francis);
  assert("Francis Bamirin has valid email", francis?.email === "bams@gmail.com");
  assert("Francis Bamirin has valid phone", francis?.phone === "09028836536");

  // 4. Test Name-Only Update Preserving Email and Phone
  console.log("\n--- 4. Edit Donor: Name-Only Update Test ---");
  donorStore.save({
    userId: "d0000005-0000-0000-0000-000000000005",
    donorProfileId: "d1000005-0000-0000-0000-000000000005",
    organizationId: "a1111111-1111-1111-1111-111111111111",
    fullName: "Amina Yusuf Verified",
    bloodGroup: "AB-",
    city: "Lagos",
    eligibilityStatus: "eligible",
    isActive: true,
    updatedAt: new Date().toISOString(),
  });

  const updatedAmina = donorStore.get("d1000005-0000-0000-0000-000000000005");
  assert("Updated name applied successfully", updatedAmina?.fullName === "Amina Yusuf Verified");
  assert("Email preserved after name-only update", updatedAmina?.email === "amina.yusuf@gmail.com");
  assert("Phone preserved after name-only update", updatedAmina?.phone === "09028836536");

  // Restore name back to Amina Yusuf
  donorStore.save({
    userId: "d0000005-0000-0000-0000-000000000005",
    donorProfileId: "d1000005-0000-0000-0000-000000000005",
    organizationId: "a1111111-1111-1111-1111-111111111111",
    fullName: "Amina Yusuf",
    email: "amina.yusuf@gmail.com",
    phone: "09028836536",
    bloodGroup: "AB-",
    city: "Lagos",
    eligibilityStatus: "eligible",
    isActive: true,
    updatedAt: new Date().toISOString(),
  });

  console.log("\n================================================================================");
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runVerification().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
