/**
 * ORBINOVA HEALTHCARE — COMPREHENSIVE END-TO-END FULFILLMENT & STATUS LIFECYCLE TEST SUITE
 * Validates Scenarios A through J from Section 12:
 *
 * SCENARIO A: Hospital requests 4 units. Blood bank reserves 1. Verify fulfilled quantity remains 0.
 * SCENARIO B: Blood bank issues the 1 reserved unit. Verify issued quantity becomes 1 but received quantity remains 0.
 * SCENARIO C: Hospital confirms receipt of the 1 unit. Verify fulfilled quantity becomes 1 and remaining need becomes 3.
 * SCENARIO D: Another blood bank reserves 2 units. Verify those 2 units are not counted as fulfilled.
 * SCENARIO E: Those 2 units are issued and received. Verify fulfilled quantity becomes 3.
 * SCENARIO F: The final unit is fulfilled. Verify the request becomes FULFILLED and progress becomes 100%.
 * SCENARIO G: A reservation expires. Verify the suitable units are released and the shortage is recalculated.
 * SCENARIO H: Two hospitals attempt to reserve the same units. Verify only one reservation succeeds (atomic mutex).
 * SCENARIO I: A donor expresses interest. Verify fulfilled quantity does not change.
 * SCENARIO J: A donor completes the approved donation process. Verify donation and inventory updated correctly without duplicate stock creation.
 */

import { bloodRequestStore } from "../src/services/bloodRequestStore";
import { reservationStore } from "../src/services/reservationStore";
import { inventoryStore } from "../src/services/inventoryStore";
import { donorStore } from "../src/services/donorStore";
import { donorRequestStore } from "../src/services/donorRequestStore";
import { bloodRequestWorkflow } from "../src/services/bloodRequestWorkflow";

let totalPassed = 0;
let totalFailed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    totalPassed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    totalFailed++;
  }
}

async function runAllScenarios() {
  console.log("================================================================================");
  console.log("ORBINOVA HEALTHCARE — STATUS, RESERVATION, ISSUANCE & FULFILLMENT LIFECYCLE");
  console.log("Testing Scenarios A through J...");
  console.log("================================================================================");

  const hospId = "a1111111-1111-1111-1111-111111111111"; // LUTH
  const bb1Id = "b3333333-3333-3333-3333-333333333333";  // Lagos Island Central BB
  const bb2Id = "b4444444-4444-4444-4444-444444444444";  // National Standalone BB
  const bloodGroup = "B-";

  // Reset inventory to clean state
  inventoryStore.setQuantity(hospId, bloodGroup, 0, 0);
  inventoryStore.setQuantity("b2222222-2222-2222-2222-222222222222", bloodGroup, 0, 0);
  inventoryStore.setQuantity(bb1Id, bloodGroup, 1, 0); // 1 available in BB1
  inventoryStore.setQuantity(bb2Id, bloodGroup, 0, 0); // 0 in BB2 initially (reserves in Scenario D)

  // =========================================================================
  // SCENARIO A: Hospital requests 4 units. Blood bank reserves 1.
  // Verify fulfilled quantity remains 0.
  // =========================================================================
  console.log("\n--- SCENARIO A: Hospital requests 4 units. Blood bank reserves 1. Verify fulfilled quantity remains 0 ---");
  const reqAId = `req-scenario-a-${Date.now()}`;

  // Process request: BB1 reserves 1, remaining shortage is 3
  const workflowResA = await bloodRequestWorkflow.processHospitalRequest({
    requestId: reqAId,
    hospitalId: hospId,
    hospitalName: "Lagos University Teaching Hospital",
    bloodGroup,
    componentType: "red_cells",
    unitsRequired: 4,
    urgency: "urgent",
  });

  const storedReqA = bloodRequestStore.get(reqAId)!;
  assert(storedReqA !== undefined, "Scenario A: Blood request successfully persisted in store");
  assert(storedReqA.units_required === 4, "Scenario A: Requested quantity is 4");
  assert(storedReqA.units_reserved === 1, "Scenario A: Reserved quantity is 1");
  assert(storedReqA.units_issued === 0, "Scenario A: Issued quantity is 0");
  assert(storedReqA.units_received === 0, "Scenario A: Received quantity is 0");
  assert(storedReqA.units_fulfilled === 0, "Scenario A: Confirmed fulfilled quantity is strictly 0 (Reservation is NOT fulfillment)");
  assert(storedReqA.remaining_shortage === 3, "Scenario A: Remaining shortage requiring sourcing is 3");
  assert(
    storedReqA.status === "partially_reserved" || storedReqA.status === "donor_matching",
    `Scenario A: Request status accurately reflects progress ('${storedReqA.status}')`
  );

  const bb1ResA = workflowResA.reservations[0];
  assert(bb1ResA !== undefined, "Scenario A: Reservation 1 exists in reservation store");
  assert(bb1ResA.quantity === 1, "Scenario A: Reservation quantity is 1");
  assert(bb1ResA.status === "reserved", "Scenario A: Reservation status is 'reserved'");

  // =========================================================================
  // SCENARIO B: Blood bank issues the 1 reserved unit.
  // Verify issued quantity becomes 1 but received quantity remains 0.
  // =========================================================================
  console.log("\n--- SCENARIO B: Blood bank issues the 1 reserved unit. Verify issued quantity becomes 1, received remains 0 ---");
  const issueResB = await reservationStore.issueReservation(bb1ResA.id, "Dispatched via Dispatch Rider #12");
  assert(issueResB.success, "Scenario B: Blood bank successfully issued reservation");

  // Reconcile request state
  const storedReqB = bloodRequestStore.reconcileRequest(reqAId)!;
  assert(storedReqB.units_reserved === 0, "Scenario B: Reserved quantity transitioned to 0");
  assert(storedReqB.units_issued === 1, "Scenario B: Issued quantity is now 1");
  assert(storedReqB.units_received === 0, "Scenario B: Received quantity remains 0");
  assert(storedReqB.units_fulfilled === 0, "Scenario B: Fulfilled quantity remains 0 (Issued is NOT received/fulfilled)");
  assert(storedReqB.remaining_shortage === 3, "Scenario B: Remaining need remains 3");
  assert(
    storedReqB.status === "partially_issued" || storedReqB.status === "in_transit",
    `Scenario B: Request status is '${storedReqB.status}'`
  );

  // =========================================================================
  // SCENARIO C: Hospital confirms receipt of the 1 unit.
  // Verify fulfilled quantity becomes 1 and remaining need becomes 3.
  // =========================================================================
  console.log("\n--- SCENARIO C: Hospital confirms receipt of the 1 unit. Verify fulfilled = 1, remaining need = 3 ---");
  const confirmResC = await reservationStore.confirmReceipt(bb1ResA.id, "Checked in at Clinical Ward 3B");
  assert(confirmResC.success, "Scenario C: Hospital confirmed delivery and physical receipt");

  const storedReqC = bloodRequestStore.recordReceipt(reqAId, 1)!;
  assert(storedReqC.units_issued === 0, "Scenario C: Issued quantity decremented to 0");
  assert(storedReqC.units_received === 1, "Scenario C: Received quantity is 1");
  assert(storedReqC.units_fulfilled === 1, "Scenario C: Fulfilled quantity is now 1");
  assert(storedReqC.remaining_shortage === 3, "Scenario C: Remaining need is 3");
  const progressC = Math.round((storedReqC.units_fulfilled / storedReqC.units_required) * 100);
  assert(progressC === 25, `Scenario C: Fulfillment progress is exactly 25% (1/4)`);

  // =========================================================================
  // SCENARIO D: Another blood bank reserves 2 units.
  // Verify those 2 units are not counted as fulfilled.
  // =========================================================================
  console.log("\n--- SCENARIO D: Another blood bank reserves 2 units. Verify those 2 are not counted as fulfilled ---");
  inventoryStore.setQuantity(bb2Id, bloodGroup, 2, 0); // BB2 now has 2 units available
  const resD = await reservationStore.createReservation({
    bloodRequestId: reqAId,
    requestingHospitalId: hospId,
    requestingHospitalName: "LUTH",
    sourceOrgId: bb2Id,
    sourceOrgName: "National Standalone Blood Bank",
    bloodGroup,
    componentType: "red_cells",
    quantity: 2,
    idempotencyKey: `scen-d-res-${Date.now()}`,
    notes: "Secondary blood bank allocation",
  });
  assert(resD.success && resD.reservation !== undefined, "Scenario D: BB2 successfully reserved 2 units");

  const storedReqD = bloodRequestStore.reconcileRequest(reqAId)!;
  assert(storedReqD.units_reserved === 2, "Scenario D: Units reserved is 2");
  assert(storedReqD.units_fulfilled === 1, "Scenario D: Fulfilled quantity strictly remains 1 (The 2 reserved units are NOT fulfilled)");
  assert(storedReqD.remaining_shortage === 1, "Scenario D: Remaining need is now 1 (4 - 1 fulfilled - 2 reserved)");
  const progressD = Math.round((storedReqD.units_fulfilled / storedReqD.units_required) * 100);
  assert(progressD === 25, "Scenario D: Fulfillment progress strictly remains 25%");

  // =========================================================================
  // SCENARIO E: Those 2 units are issued and received.
  // Verify fulfilled quantity becomes 3.
  // =========================================================================
  console.log("\n--- SCENARIO E: Those 2 units are issued and received. Verify fulfilled quantity becomes 3 ---");
  const bb2Res = resD.reservation!;
  await reservationStore.issueReservation(bb2Res.id, "Dispatched via Dispatch Rider #7");
  await reservationStore.confirmReceipt(bb2Res.id, "Checked in at Emergency Ward");

  const storedReqE = bloodRequestStore.recordReceipt(reqAId, 2)!;
  assert(storedReqE.units_reserved === 0, "Scenario E: Units reserved is 0");
  assert(storedReqE.units_issued === 0, "Scenario E: Units issued is 0");
  assert(storedReqE.units_received === 3, "Scenario E: Total units received is 3");
  assert(storedReqE.units_fulfilled === 3, "Scenario E: Total units fulfilled is 3");
  assert(storedReqE.remaining_shortage === 1, "Scenario E: Remaining need is 1");
  const progressE = Math.round((storedReqE.units_fulfilled / storedReqE.units_required) * 100);
  assert(progressE === 75, "Scenario E: Fulfillment progress is exactly 75% (3/4)");

  // =========================================================================
  // SCENARIO F: The final unit is fulfilled.
  // Verify the request becomes FULFILLED and progress becomes 100%.
  // =========================================================================
  console.log("\n--- SCENARIO F: The final unit is fulfilled. Verify request becomes FULFILLED and progress = 100% ---");
  const storedReqF = bloodRequestStore.recordReceipt(reqAId, 1)!;
  assert(storedReqF.units_fulfilled === 4, "Scenario F: Total units fulfilled is 4");
  assert(storedReqF.remaining_shortage === 0, "Scenario F: Remaining shortage is 0");
  assert(storedReqF.status === "fulfilled", "Scenario F: Overall request status transitioned to 'fulfilled'");
  const progressF = Math.round((storedReqF.units_fulfilled / storedReqF.units_required) * 100);
  assert(progressF === 100, "Scenario F: Fulfillment progress is 100%");
  assert(storedReqF.closed_at !== null, "Scenario F: closed_at timestamp is stamped");

  // =========================================================================
  // SCENARIO G: A reservation expires.
  // Verify the suitable units are released and the shortage is recalculated.
  // =========================================================================
  console.log("\n--- SCENARIO G: A reservation expires. Verify units released and shortage recalculated ---");
  inventoryStore.setQuantity(bb1Id, "A+", 5, 0);
  const reqGId = `req-scen-g-${Date.now()}`;
  bloodRequestStore.save({
    id: reqGId,
    organization_id: hospId,
    hospital_id: hospId,
    requested_by: hospId,
    blood_group: "A+",
    units_required: 2,
    units_fulfilled: 0,
    units_reserved: 2,
    remaining_shortage: 0,
    urgency: "urgent",
    status: "fully_reserved",
    required_by: null,
    notes: null,
    latitude: null,
    longitude: null,
    closed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // Create an expired reservation
  const expiredRes = await reservationStore.createReservation({
    bloodRequestId: reqGId,
    requestingHospitalId: hospId,
    requestingHospitalName: "LUTH",
    sourceOrgId: bb1Id,
    sourceOrgName: "Lagos Island BB",
    bloodGroup: "A+",
    componentType: "red_cells",
    quantity: 2,
    expiresInMinutes: -5, // already expired
  });

  assert(expiredRes.success && expiredRes.reservation !== undefined, "Scenario G: Created past-deadline reservation");
  const expiryCheck = await reservationStore.processExpiredReservations();
  assert(expiryCheck.expiredCount > 0, "Scenario G: Expired reservation detected and processed");

  const bb1InvG = inventoryStore.getItem(bb1Id, "A+");
  assert(bb1InvG.reserved_quantity === 0, "Scenario G: Reserved stock released back to 0");
  assert(bb1InvG.available_quantity === 5, "Scenario G: Available stock restored to 5");

  const storedReqG = bloodRequestStore.reconcileRequest(reqGId)!;
  assert(storedReqG.units_reserved === 0, "Scenario G: Request units_reserved updated to 0");
  assert(storedReqG.remaining_shortage === 2, "Scenario G: Shortage recalculated to 2");

  // =========================================================================
  // SCENARIO H: Two hospitals attempt to reserve the same units.
  // Verify only one reservation succeeds (atomic mutex).
  // =========================================================================
  console.log("\n--- SCENARIO H: Two hospitals attempt to reserve the same units. Atomic mutex check ---");
  const hosp2Id = "a2222222-2222-2222-2222-222222222222";
  inventoryStore.setQuantity(bb1Id, "AB-", 1, 0); // Only 1 available

  const [resH1, resH2] = await Promise.all([
    reservationStore.createReservation({
      bloodRequestId: `req-h1-${Date.now()}`,
      requestingHospitalId: hospId,
      sourceOrgId: bb1Id,
      bloodGroup: "AB-",
      componentType: "red_cells",
      quantity: 1,
      idempotencyKey: `lock-test-1-${Date.now()}`,
    }),
    reservationStore.createReservation({
      bloodRequestId: `req-h2-${Date.now()}`,
      requestingHospitalId: hosp2Id,
      sourceOrgId: bb1Id,
      bloodGroup: "AB-",
      componentType: "red_cells",
      quantity: 1,
      idempotencyKey: `lock-test-2-${Date.now()}`,
    }),
  ]);

  const successCount = (resH1.success ? 1 : 0) + (resH2.success ? 1 : 0);
  assert(successCount === 1, `Scenario H: Exactly one reservation succeeded (1/2)`);
  assert(!resH1.success || !resH2.success, "Scenario H: Competing reservation safely rejected with insufficient stock");
  const bb1InvH = inventoryStore.getItem(bb1Id, "AB-");
  assert(bb1InvH.reserved_quantity === 1, "Scenario H: Reserved quantity is exactly 1");
  assert(bb1InvH.available_quantity === 0, "Scenario H: Available quantity is 0");

  // =========================================================================
  // SCENARIO I: A donor expresses interest.
  // Verify fulfilled quantity does not change.
  // =========================================================================
  console.log("\n--- SCENARIO I: A donor expresses interest. Verify fulfilled quantity does not change ---");
  const reqIId = `req-scen-i-${Date.now()}`;
  bloodRequestStore.save({
    id: reqIId,
    organization_id: hospId,
    hospital_id: hospId,
    requested_by: hospId,
    blood_group: "O-",
    units_required: 2,
    units_fulfilled: 0,
    remaining_shortage: 2,
    urgency: "urgent",
    status: "donor_matching",
    required_by: null,
    notes: null,
    latitude: null,
    longitude: null,
    closed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const drI = donorRequestStore.create({
    blood_request_id: reqIId,
    donor_id: "donor-interest-001",
    matching_score: 0.95,
    blood_group: "O-",
    status: "pending",
  });

  // Donor marks "interested"
  donorRequestStore.updateStatus(drI.id, "interested", { notes: "I am ready to donate tomorrow morning" });
  const updatedReqI = bloodRequestStore.get(reqIId)!;
  assert(updatedReqI.units_fulfilled === 0, "Scenario I: Fulfilled quantity strictly remains 0 after donor expresses interest");
  assert(updatedReqI.remaining_shortage === 2, "Scenario I: Shortage remains 2 until donation is verified and completed");

  // =========================================================================
  // SCENARIO J: A donor completes the approved donation process.
  // Verify donation & inventory records are updated correctly without duplicate stock.
  // =========================================================================
  console.log("\n--- SCENARIO J: A donor completes the approved donation process. Verify records updated without duplicate stock ---");
  inventoryStore.setQuantity(hospId, "O-", 2, 0); // initial 2 units

  // Complete donation and receipt
  donorRequestStore.updateStatus(drI.id, "completed");
  inventoryStore.adjustStock(
    hospId,
    "O-",
    "add",
    1,
    "Verified voluntary donor donation received",
    "user-staff-01",
    `Linked to request ${reqIId}`
  );
  bloodRequestStore.recordReceipt(reqIId, 1);

  const updatedReqJ = bloodRequestStore.get(reqIId)!;
  assert(updatedReqJ.units_fulfilled === 1, "Scenario J: Fulfilled quantity increased to 1 upon completed verified donation");
  assert(updatedReqJ.remaining_shortage === 1, "Scenario J: Shortage reduced to 1");

  const hospInvJ = inventoryStore.getItem(hospId, "O-");
  assert(hospInvJ.quantity === 3, "Scenario J: Facility stock accurately incremented from 2 to 3 units");
  assert(hospInvJ.reserved_quantity === 0, "Scenario J: Reserved stock remains 0");
  assert(hospInvJ.available_quantity === 3, "Scenario J: Available stock is 3");

  console.log("\n================================================================================");
  console.log(`LIFECYCLE TEST RESULTS: ${totalPassed} PASSED, ${totalFailed} FAILED.`);
  console.log("================================================================================");

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runAllScenarios().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
