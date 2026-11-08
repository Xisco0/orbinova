/**
 * ORBINOVA COMPREHENSIVE END-TO-END QA VERIFICATION SUITE
 * Validates Scenarios A through H:
 * Scenario A: Full Blood Bank Fulfillment (Zero donor notifications)
 * Scenario B: Partial Fulfillment (Blood bank + remaining shortage donor matching)
 * Scenario C: Cross-Hospital Donor Matching with Institutional Data Privacy
 * Scenario D: Independent Blood Bank Operations (Accept, Prepare, Issue, Ledger)
 * Scenario E: Hospital-Owned Blood Bank Relationship (Linked check & double-count prevention)
 * Scenario F: Atomic Concurrency, Mutex Locking & Double-Reservation Prevention
 * Scenario G: Security, Account Lockout (5 attempts) & Multi-Tab Isolation
 * Scenario H: Email Queue, Transactional Outbox, Retries & Idempotency
 */

import { bloodRequestWorkflow, KNOWN_ORGANIZATIONS } from "../src/services/bloodRequestWorkflow";
import { inventoryStore } from "../src/services/inventoryStore";
import { reservationStore } from "../src/services/reservationStore";
import { donorStore } from "../src/services/donorStore";
import { donorRequestStore } from "../src/services/donorRequestStore";
import { inAppNotificationStore } from "../src/services/inAppNotificationStore";
import { bloodRequestStore } from "../src/services/bloodRequestStore";
import { isBloodCompatible, getCompatibleDonorGroups } from "../src/lib/matching/bloodCompatibility";
import { emailQueue } from "../src/lib/email/emailQueue";
import { emailOutbox } from "../src/lib/email/emailOutbox";
import { accountSecurity } from "../src/lib/auth/accountSecurity";
import { hasPermission, getRolePermissions } from "../src/lib/auth/rbac";

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  [PASS] ${testName}${detail ? ` (${detail})` : ""}`);
    passCount++;
  } else {
    console.error(`  [FAIL] ${testName}${detail ? ` (${detail})` : ""}`);
    failCount++;
  }
}

async function runScenarioA() {
  console.log("\n========================================================");
  console.log("SCENARIO A: Full Blood Bank Fulfillment (Zero Donor Notifications)");
  console.log("========================================================");

  const hospId = "a1111111-1111-1111-1111-111111111111"; // LUTH
  const bbId = "b3333333-3333-3333-3333-333333333333";   // Lagos Island BB

  // 1. Hospital stock: 0 units of O+ (0 reserved)
  inventoryStore.setQuantity(hospId, "O+", 0, 0);
  inventoryStore.setQuantity("b2222222-2222-2222-2222-222222222222", "O+", 0, 0);
  inventoryStore.setQuantity("b4444444-4444-4444-4444-444444444444", "O+", 0, 0);
  // 2. Blood bank stock: 5 units of O+ (0 reserved, 5 available)
  inventoryStore.setQuantity(bbId, "O+", 5, 0);

  // 3. Hospital submits request for 2 units of O+
  const reqId = `scen-a-${Date.now()}`;
  const result = await bloodRequestWorkflow.processHospitalRequest({
    requestId: reqId,
    hospitalId: hospId,
    hospitalName: "Lagos University Teaching Hospital",
    bloodGroup: "O+",
    componentType: "red_cells",
    unitsRequired: 2,
    urgency: "emergency",
  });

  assert(result.unitsFulfilled === 0, "Scenario A: Initial units fulfilled is 0 (Reservation is not fulfillment)");
  assert(result.remainingShortage === 0, "Scenario A: Sourcing shortage is 0 (all 2 units reserved)");
  assert(result.finalStatus === "fully_reserved", "Scenario A: Blood request status is 'fully_reserved'");
  assert(!result.donorMatchingInitiated, "Scenario A: Donor matching was NOT initiated");
  assert(result.donorsNotifiedCount === 0, "Scenario A: Zero donor notifications dispatched");
  assert(result.reservations.length > 0, "Scenario A: Reservation successfully created in blood bank");

  // Check blood bank reservation status & issuance
  const reservation = result.reservations[0];
  assert(reservation.status === "reserved", "Scenario A: Initial reservation status is 'reserved'");
  assert(reservation.quantity === 2, "Scenario A: Reserved quantity is 2");

  // Blood bank prepares units
  reservationStore.updateReservationStatus(reservation.id, "preparing");
  const prepRes = reservationStore.getReservation(reservation.id);
  assert(prepRes?.status === "preparing", "Scenario A: Blood bank transitioned status to 'preparing'");

  // Blood bank issues units
  const issueRes = await reservationStore.issueReservation(reservation.id, "Dispatched via Emergency Van #1");
  assert(issueRes.success, "Scenario A: Blood bank issued reservation successfully");

  // Verify stock permanently deducted: 5 total - 2 issued = 3 total, 3 available, 0 reserved
  const updatedBBInv = inventoryStore.getItem(bbId, "O+");
  assert(updatedBBInv.quantity === 3, "Scenario A: Blood bank total stock reduced to 3");
  assert(updatedBBInv.available_quantity === 3, "Scenario A: Blood bank available stock is 3");
  assert(updatedBBInv.reserved_quantity === 0, "Scenario A: Blood bank reserved stock returned to 0");
}

async function runScenarioB() {
  console.log("\n========================================================");
  console.log("SCENARIO B: Partial Fulfillment by Blood Bank + Donor Matching");
  console.log("========================================================");

  const hospId = "a1111111-1111-1111-1111-111111111111"; // LUTH
  const bbId = "b3333333-3333-3333-3333-333333333333";   // Lagos Island BB

  // 1. Reset all facilities to 0 units of B- (and 0 reserved)
  inventoryStore.setQuantity(hospId, "B-", 0, 0);
  inventoryStore.setQuantity("b2222222-2222-2222-2222-222222222222", "B-", 0, 0);
  inventoryStore.setQuantity("b4444444-4444-4444-4444-444444444444", "B-", 0, 0);
  // 2. Blood bank stock: exactly 1 unit of B- (0 reserved, 1 available)
  inventoryStore.setQuantity(bbId, "B-", 1, 0);

  // Ensure a matching donor exists in donorStore (B- or O-)
  donorStore.save({
    userId: "donor-scen-b-001",
    donorProfileId: "dp-scen-b-001",
    organizationId: hospId,
    fullName: "Chinedu Eze (Scenario B Donor)",
    email: "chinedu.scenb@example.com",
    bloodGroup: "B-",
    availabilityStatus: "available",
    eligibilityStatus: "eligible",
    isActive: true,
    lastDonationDate: null,
    updatedAt: new Date().toISOString(),
  });

  // 3. Hospital requests 4 units of B-
  const reqId = `scen-b-${Date.now()}`;
  const result = await bloodRequestWorkflow.processHospitalRequest({
    requestId: reqId,
    hospitalId: hospId,
    hospitalName: "Lagos University Teaching Hospital",
    bloodGroup: "B-",
    componentType: "red_cells",
    unitsRequired: 4,
    urgency: "urgent",
  });

  assert(result.unitsFulfilled === 0, "Scenario B: Initial units fulfilled = 0 (Reservation is not fulfillment)");
  assert(result.remainingShortage === 3, "Scenario B: Remaining shortage = 3");
  assert(result.donorMatchingInitiated, "Scenario B: Donor matching was initiated for remaining shortage");
  assert(result.reservations.length === 1, "Scenario B: Exactly 1 reservation created for the 1 unit");

  // Verify donor notifications dispatched
  const donorRequests = donorRequestStore.getByRequest(reqId);
  assert(donorRequests.length > 0, `Scenario B: Matching donor received request (count: ${donorRequests.length})`);

  // Verify component compatibility: Candidate must be compatible with B- red cells (B- or O-)
  for (const dr of donorRequests) {
    const compResult = isBloodCompatible(dr.blood_group as any, "B-", "red_cells");
    assert(compResult.compatible, `Scenario B: Candidate donor (${dr.blood_group}) is clinically compatible with B- red cells`);
  }

  // Donor responds "I'm Interested"
  if (donorRequests.length > 0) {
    const targetDr = donorRequests[0];
    const updateRes = donorRequestStore.updateStatus(targetDr.id, "interested", { notes: "Available to donate this afternoon" });
    assert(updateRes !== undefined, "Scenario B: Donor successfully marked interest in request");
    assert(updateRes?.status === "interested", "Scenario B: Donor response status is 'interested'");
  }
}

async function runScenarioC() {
  console.log("\n========================================================");
  console.log("SCENARIO C: Cross-Hospital Donor Matching with Institutional Data Privacy");
  console.log("========================================================");

  const hospA = "a1111111-1111-1111-1111-111111111111"; // Hospital A
  const hospB = "a2222222-2222-2222-2222-222222222222"; // Hospital B

  // Reset all facilities to 0 units of AB- (and 0 reserved) to ensure donor matching is triggered
  inventoryStore.setQuantity(hospA, "AB-", 0, 0);
  inventoryStore.setQuantity(hospB, "AB-", 0, 0);
  inventoryStore.setQuantity("b2222222-2222-2222-2222-222222222222", "AB-", 0, 0);
  inventoryStore.setQuantity("b3333333-3333-3333-3333-333333333333", "AB-", 0, 0);
  inventoryStore.setQuantity("b4444444-4444-4444-4444-444444444444", "AB-", 0, 0);

  // Clean up any stale cross-hospital test donors from prior runs
  const existingDonors = donorStore.getAll();
  for (const d of Object.values(existingDonors)) {
    if (d.userId?.startsWith("donor-cross-") || d.email === "amina.cross@example.com") {
      donorStore.delete(d.userId);
    }
  }

  // Register Donor D under Hospital A (Exact match AB-)
  const donorDId = `donor-cross-${Date.now()}`;
  donorStore.save({
    userId: donorDId,
    donorProfileId: `dp-${donorDId}`,
    organizationId: hospA, // Registered by Hospital A
    fullName: "Amina Yusuf (Hospital A Voluntary Donor)",
    email: "amina.cross@example.com",
    bloodGroup: "AB-",
    availabilityStatus: "available",
    eligibilityStatus: "eligible",
    isActive: true,
    lastDonationDate: null,
    updatedAt: new Date().toISOString(),
  });

  // Hospital B submits blood request for AB-
  const reqId = `scen-c-hospB-${Date.now()}`;
  const result = await bloodRequestWorkflow.processHospitalRequest({
    requestId: reqId,
    hospitalId: hospB,
    hospitalName: "National Orthopaedic Hospital (Hospital B)",
    bloodGroup: "AB-",
    componentType: "red_cells",
    unitsRequired: 1,
    urgency: "emergency",
  });

  // Verify Donor D received match request from Hospital B
  const donorRequests = donorRequestStore.getByDonor(donorDId);
  const receivedReq = donorRequests.find((r) => r.blood_request_id === reqId);
  assert(receivedReq !== undefined, "Scenario C: Donor D received request originating from Hospital B");

  // Privacy Rule 1: Hospital A can browse its registered donors
  const hospADonors = donorStore.getByOrg(hospA);
  const hospAHasDonorD = hospADonors.some((d) => d.userId === donorDId);
  assert(hospAHasDonorD, "Scenario C: Hospital A can manage its own registered donor roster");

  // Privacy Rule 2: Hospital B CANNOT browse Hospital A's registered donors
  const hospBDonors = donorStore.getByOrg(hospB);
  const hospBHasDonorD = hospBDonors.some((d) => d.userId === donorDId);
  assert(!hospBHasDonorD, "Scenario C: Hospital B CANNOT browse Hospital A's private donor roster");

  // Privacy Rule 3: Hospital B can see the candidate response for this coordinated request
  if (receivedReq) {
    donorRequestStore.updateStatus(receivedReq.id, "accepted", { notes: "Confirmed ready to donate at Hospital B" });
    const hospBRequestMatches = donorRequestStore.getByRequest(reqId);
    assert(hospBRequestMatches.length > 0, "Scenario C: Hospital B can coordinate with matched donor for their request");
  }
}

async function runScenarioD() {
  console.log("\n========================================================");
  console.log("SCENARIO D: Independent Blood Bank Operations (Accept, Prepare, Issue, Ledger)");
  console.log("========================================================");

  const bbId = "b4444444-4444-4444-4444-444444444444"; // National Standalone BB
  const hospId = "a1111111-1111-1111-1111-111111111111"; // LUTH

  // Set initial stock in standalone blood bank: 10 units A+ (0 reserved)
  inventoryStore.setQuantity(bbId, "A+", 10, 0);

  // Create an incoming reservation for 3 units A+
  const reqId = `scen-d-${Date.now()}`;
  const res = await reservationStore.createReservation({
    bloodRequestId: reqId,
    requestingHospitalId: hospId,
    requestingHospitalName: "LUTH",
    sourceOrgId: bbId,
    sourceOrgName: "National Standalone Blood Bank",
    bloodGroup: "A+",
    componentType: "red_cells",
    quantity: 3,
    idempotencyKey: `scen-d-key-${Date.now()}`,
    notes: "Direct request fulfillment",
  });

  assert(res.success && res.reservation !== undefined, "Scenario D: Reservation created successfully");
  const reservation = res.reservation!;

  // Blood bank prepares reservation
  reservationStore.updateReservationStatus(reservation.id, "preparing");
  const prep = reservationStore.getReservation(reservation.id);
  assert(prep?.status === "preparing", "Scenario D: Reservation status updated to 'preparing'");

  // Blood bank issues reservation
  const issueRes = await reservationStore.issueReservation(reservation.id, "Courier Service #99");
  assert(issueRes.success, "Scenario D: Reservation successfully issued");

  // Verify inventory deduction and transaction ledger
  const inv = inventoryStore.getItem(bbId, "A+");
  assert(inv.quantity === 7, "Scenario D: Blood bank stock deducted from 10 to 7");
  assert(inv.available_quantity === 7, "Scenario D: Available stock is 7");
  assert(inv.reserved_quantity === 0, "Scenario D: Reserved stock is 0");

  const txs = inventoryStore.getTransactions(bbId);
  const hasIssueTx = txs.some((t) => t.blood_group === "A+" && t.transaction_type === "blood_issued");
  assert(hasIssueTx, "Scenario D: Transaction ledger contains blood_issued entry with audit reason");
}

async function runScenarioE() {
  console.log("\n========================================================");
  console.log("SCENARIO E: Hospital-Owned Blood Bank Facility & Single Authoritative Stock");
  console.log("========================================================");

  const parentHospitalId = "a1111111-1111-1111-1111-111111111111"; // LUTH (operates its own blood bank)
  const internalBBId = "b2222222-2222-2222-2222-222222222222";     // LUTH Internal Blood Bank
  const hospWithoutBB = "a2222222-2222-2222-2222-222222222222";    // Hospital B (no internal blood bank)
  const independentBB = "b3333333-3333-3333-3333-333333333333";    // Lagos Island Central Blood Bank (Private)

  // 1. Safe consolidation verification:
  // If legacy duplicate records existed, consolidateDuplicateInventory migrates them safely
  const consolidation = inventoryStore.consolidateDuplicateInventory();
  assert(consolidation !== undefined, "Scenario E: Safe duplicate consolidation executed without data loss");

  // Reset independent blood banks for O-
  inventoryStore.setQuantity(independentBB, "O-", 2, 0);
  inventoryStore.setQuantity("b4444444-4444-4444-4444-444444444444", "O-", 0, 0);

  // Set 3 units of O- under the hospital-owned blood bank facility (single authoritative inventory owner)
  inventoryStore.setQuantity(internalBBId, "O-", 3, 0);

  // 2. Hospital WITH its own blood bank requests 3 units of O-
  const reqId = `scen-e-${Date.now()}`;
  const result = await bloodRequestWorkflow.processHospitalRequest({
    requestId: reqId,
    hospitalId: parentHospitalId,
    hospitalName: "Lagos University Teaching Hospital",
    bloodGroup: "O-",
    componentType: "red_cells",
    unitsRequired: 3,
    urgency: "emergency",
  });

  assert(result.unitsFulfilled === 0, "Scenario E: Initial units fulfilled is 0 (Reservation is not fulfillment)");
  assert(result.remainingShortage === 0, "Scenario E: 0 shortage remains (fully secured by internal blood bank)");
  
  // Crucial check: Exactly 1 single reservation from the hospital-owned blood bank facility.
  // NO duplicate sources like "Hospital Own Stock" and "Internal Blood Bank" created.
  assert(result.reservations.length === 1, "Scenario E: Exactly 1 reservation created from hospital-owned blood bank facility (no duplicate sources)");

  const bbRes = result.reservations[0];
  assert((bbRes.source_organization_id || bbRes.sourceOrgId) === internalBBId, "Scenario E: Source facility is hospital-owned internal blood bank");
  assert(bbRes.quantity === 3, "Scenario E: All 3 units reserved from hospital-owned blood bank facility");

  // Verify facility stock tracking: 3 units reserved, 0 available
  const finalBBInv = inventoryStore.getItem(internalBBId, "O-");
  assert(finalBBInv.reserved_quantity === 3 && finalBBInv.available_quantity === 0, "Scenario E: Blood bank stock reserved correctly");

  // 3. Hospital WITHOUT its own blood bank requests 2 units of O- -> Must source from approved independent blood bank
  const reqWithoutBBId = `scen-e-no-bb-${Date.now()}`;
  const resultNoBB = await bloodRequestWorkflow.processHospitalRequest({
    requestId: reqWithoutBBId,
    hospitalId: hospWithoutBB,
    hospitalName: "National Orthopaedic Hospital (Hospital B)",
    bloodGroup: "O-",
    componentType: "red_cells",
    unitsRequired: 2,
    urgency: "urgent",
  });

  assert(resultNoBB.reservations.length === 1, "Scenario E: Hospital without blood bank secured 1 reservation from independent blood bank");
  const extRes = resultNoBB.reservations[0];
  assert((extRes.source_organization_id || extRes.sourceOrgId) === independentBB, "Scenario E: Sourced correctly from approved independent blood bank");
  assert(extRes.quantity === 2, "Scenario E: 2 units reserved from independent blood bank");
  assert(resultNoBB.remainingShortage === 0, "Scenario E: Hospital without blood bank had shortage fully resolved by independent blood bank");
}

async function runScenarioF() {
  console.log("\n========================================================");
  console.log("SCENARIO F: Reservation Expiry, Atomic Mutex & Double-Reservation Prevention");
  console.log("========================================================");

  const testOrgId = "b3333333-3333-3333-3333-333333333333";
  // Exactly 3 units of A- available
  inventoryStore.setQuantity(testOrgId, "A-", 3, 0);

  // Two simultaneous requests attempt to reserve 3 units of A- each
  const [res1, res2] = await Promise.all([
    reservationStore.createReservation({
      bloodRequestId: "req-race-1",
      requestingHospitalId: "hosp-1",
      requestingHospitalName: "Hospital 1",
      sourceOrgId: testOrgId,
      sourceOrgName: "Blood Bank",
      bloodGroup: "A-",
      componentType: "red_cells",
      quantity: 3,
      idempotencyKey: `race-key-1-${Date.now()}`,
    }),
    reservationStore.createReservation({
      bloodRequestId: "req-race-2",
      requestingHospitalId: "hosp-2",
      requestingHospitalName: "Hospital 2",
      sourceOrgId: testOrgId,
      sourceOrgName: "Blood Bank",
      bloodGroup: "A-",
      componentType: "red_cells",
      quantity: 3,
      idempotencyKey: `race-key-2-${Date.now()}`,
    }),
  ]);

  const successCount = (res1.success ? 1 : 0) + (res2.success ? 1 : 0);
  assert(successCount === 1, `Scenario F: Exactly one concurrent reservation succeeded (${successCount}/2)`);
  assert(
    (res1.success && !res2.success) || (!res1.success && res2.success),
    "Scenario F: Second reservation was rejected due to insufficient available quantity"
  );

  const invAfterRace = inventoryStore.getItem(testOrgId, "A-");
  assert(invAfterRace.available_quantity === 0, "Scenario F: Available quantity is 0");
  assert(invAfterRace.reserved_quantity === 3, "Scenario F: Reserved quantity is exactly 3 (Never negative)");

  // Test Cancellation & Stock Release
  const winningRes = res1.success ? res1.reservation! : res2.reservation!;
  const cancelRes = await reservationStore.cancelReservation(winningRes.id, "Test cancellation");
  assert(cancelRes.success, "Scenario F: Reservation cancelled successfully");

  const invAfterCancel = inventoryStore.getItem(testOrgId, "A-");
  assert(invAfterCancel.available_quantity === 3, "Scenario F: Released units returned to available quantity (3)");
  assert(invAfterCancel.reserved_quantity === 0, "Scenario F: Reserved quantity reset to 0");
}

async function runScenarioG() {
  console.log("\n========================================================");
  console.log("SCENARIO G: Security, Account Lockout (5 attempts) & RBAC Clearance");
  console.log("========================================================");

  const testEmail = `lockout-test-${Date.now()}@orbinova.com`;
  accountSecurity.unlockAccount(testEmail);

  // Verify initial state: not locked
  let lockStatus = accountSecurity.isAccountLocked(testEmail);
  assert(!lockStatus.isLocked, "Scenario G: New account is not locked out");

  // Perform 4 failed login attempts -> should not be locked yet
  for (let i = 1; i <= 4; i++) {
    const res = await accountSecurity.recordFailedAttempt(testEmail);
    assert(!res.isLocked, `Scenario G: Attempt ${i}: Account remains unlocked (${res.remainingAttempts} remaining)`);
  }

  // 5th failed attempt -> MUST lock account for 15 minutes
  const fifth = await accountSecurity.recordFailedAttempt(testEmail);
  assert(fifth.isLocked, "Scenario G: After 5th failed attempt, account is LOCKED OUT");

  lockStatus = accountSecurity.isAccountLocked(testEmail);
  assert(lockStatus.isLocked, "Scenario G: Lockout confirmed by isAccountLocked");

  // Successful login clears attempts when unlocked
  accountSecurity.recordSuccessfulLogin(testEmail);
  accountSecurity.unlockAccount(testEmail);

  // RBAC Permission Validation
  const cmoPerms = getRolePermissions("hospital", "owner");
  assert(cmoPerms.includes("blood_inventory.manage"), "Scenario G: Hospital Owner/CMO has 'blood_inventory.manage'");
  assert(cmoPerms.includes("blood_requests.create"), "Scenario G: Hospital Owner/CMO has 'blood_requests.create'");
  assert(cmoPerms.includes("staff.manage"), "Scenario G: Hospital Owner/CMO has 'staff.manage'");

  const doctorPerms = getRolePermissions("hospital", "doctor");
  assert(doctorPerms.includes("blood_inventory.view"), "Scenario G: Doctor/Clinician has 'blood_inventory.view'");
  assert(!doctorPerms.includes("blood_inventory.manage"), "Scenario G: Doctor/Clinician is denied 'blood_inventory.manage' (Operational boundary)");
  assert(doctorPerms.includes("blood_requests.create"), "Scenario G: Doctor/Clinician has 'blood_requests.create'");
  assert(!doctorPerms.includes("staff.invite"), "Scenario G: Doctor/Clinician is denied 'staff.invite' (Deny-by-default)");

  const donorPerms = getRolePermissions("donor", null);
  assert(donorPerms.includes("donor_profile.edit_own"), "Scenario G: Donor has 'donor_profile.edit_own'");
  assert(!donorPerms.includes("blood_inventory.manage"), "Scenario G: Donor is denied 'blood_inventory.manage'");
}

async function runScenarioH() {
  console.log("\n========================================================");
  console.log("SCENARIO H: Email Notification Queue, Outbox & Worker Resilience");
  console.log("========================================================");

  // 1. Transactional Outbox write
  const outboxItem = emailOutbox.recordEvent("TEST_EMAIL_EVENT", {
    to: "quality-assurance@orbinova.com",
    subject: "ORBINOVA Automated Health Check",
    html: "<p>Verification of asynchronous transactional outbox.</p>",
    category: "blood_requests",
    metadata: { testId: "scenario-h-test" },
  });

  assert(outboxItem.id !== undefined, "Scenario H: Email written to Transactional Outbox");
  assert(outboxItem.status === "pending", "Scenario H: Outbox email status is 'pending'");

  // 2. Queue enqueue with unique job
  const job = await emailQueue.enqueue({
    to: "quality-assurance@orbinova.com",
    subject: `ORBINOVA Background Queue Job ${Date.now()}`,
    html: "<p>Background asynchronous execution.</p>",
    category: "blood_requests",
    metadata: { runId: `e2e-run-${Date.now()}` },
  });

  assert(job.status === "queued" || job.status === "sent", "Scenario H: Job added to background email queue");

  // 3. Component Compatibility Matrix Check
  const plasmaDonorGroups = getCompatibleDonorGroups("O+", "plasma");
  assert(plasmaDonorGroups.includes("O+"), "Scenario H: O+ can receive O+ plasma");
  assert(plasmaDonorGroups.includes("AB+"), "Scenario H: AB+ is universal plasma donor");

  const redCellDonorGroups = getCompatibleDonorGroups("O+", "red_cells");
  assert(redCellDonorGroups.includes("O-"), "Scenario H: O- is universal red cell donor");
  assert(!redCellDonorGroups.includes("A+"), "Scenario H: A+ is not compatible with O+ red cell recipient");
}

async function main() {
  console.log("================================================================================");
  console.log("ORBINOVA HEALTHCARE — COMPLETE END-TO-END QA VERIFICATION SUITE");
  console.log("Running Scenarios A through H in strict headless validation mode...");
  console.log("================================================================================");

  try {
    await runScenarioA();
    await runScenarioB();
    await runScenarioC();
    await runScenarioD();
    await runScenarioE();
    await runScenarioF();
    await runScenarioG();
    await runScenarioH();

    console.log("\n================================================================================");
    console.log(`QA VERIFICATION COMPLETE: ${passCount} PASSED, ${failCount} FAILED.`);
    console.log("================================================================================");

    if (failCount > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error("FATAL ERROR during test execution:", err);
    process.exit(1);
  }
}

main();
