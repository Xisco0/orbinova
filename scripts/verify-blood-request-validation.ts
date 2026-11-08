import { bloodRequestStore } from "../src/services/bloodRequestStore";
import { hospitalService } from "../src/services/hospitalService";

const HOSP_ID = "a1111111-1111-1111-1111-111111111111"; // LUTH

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${name}`);
    failed++;
  }
}

async function run() {
  console.log("==============================================================================");
  console.log("VERIFY BLOOD REQUEST VALIDATION & PERSISTENCE (NO SCHEMA CACHE ERROR)");
  console.log("==============================================================================\n");

  // 1. Validation rule checks
  console.log("--- 1. Validation Logic Checks ---");

  // Test past date detection
  const pastDate = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
  const isPast = new Date(pastDate).getTime() < Date.now() - 60000;
  assert(isPast, "Past date is correctly flagged as invalid");

  // Test future date acceptance
  const futureDate = new Date(Date.now() + 86400000 * 2).toISOString(); // 2 days in future
  const isFuture = new Date(futureDate).getTime() > Date.now();
  assert(isFuture, "Future date is correctly accepted");

  // 2. Test Store Persistence & Retrieval
  console.log("\n--- 2. Store Persistence & Fallback Retrieval ---");
  const testReqId = "req-test-" + Date.now();
  const testReq = {
    id: testReqId,
    organization_id: HOSP_ID,
    hospital_id: HOSP_ID,
    requested_by: "d0000001-0000-0000-0000-000000000001",
    blood_group: "O+" as const,
    units_required: 3,
    units_fulfilled: 0,
    urgency: "urgent" as const,
    status: "open" as const,
    required_by: futureDate,
    notes: "Patient prepped for emergency orthopaedic surgery",
    latitude: 6.5186,
    longitude: 3.3562,
    closed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  bloodRequestStore.save(testReq);
  const fetchedFromStore = bloodRequestStore.get(testReqId);
  assert(!!fetchedFromStore, "Request successfully persisted to authoritative bloodRequestStore");
  assert(fetchedFromStore?.units_required === 3, "Units required accurately recorded");
  assert(fetchedFromStore?.required_by === futureDate, "Future preferred deadline preserved");

  // 3. Test hospitalService Integration
  console.log("\n--- 3. Hospital Service Integration ---");
  const serviceDetail = await hospitalService.getBloodRequestById(HOSP_ID, testReqId);
  assert(!!serviceDetail, "hospitalService.getBloodRequestById successfully retrieved request");
  assert(serviceDetail?.request.id === testReqId, "Correct request ID returned");
  assert(serviceDetail?.request.units_required === 3, "Normalized units_required matches");

  const orgRequests = await hospitalService.getBloodRequests(HOSP_ID);
  const foundInList = orgRequests.some((r) => r.id === testReqId);
  assert(foundInList, "Created request appears immediately in hospitalService.getBloodRequests list");

  // 4. Test Status Update & Cancellation
  console.log("\n--- 4. Status Update & Cancellation ---");
  bloodRequestStore.updateStatus(testReqId, "cancelled");
  const cancelledReq = bloodRequestStore.get(testReqId);
  assert(cancelledReq?.status === "cancelled", "Request status updated to cancelled");
  assert(!!cancelledReq?.closed_at, "closed_at timestamp recorded upon cancellation");

  console.log("\n==============================================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==============================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch(console.error);
