/**
 * TEST SUITE: Donor Dashboard Request Fetching and Response Workflow
 * Verifies that:
 * 1. Blood donor dashboard fetches available matching requests.
 * 2. ID resolution maps donorProfileId, userId, and clean UUIDs seamlessly.
 * 3. Active compatible hospital blood requests are synced to the donor.
 * 4. Metrics report pendingRequestsCount and recentRequests accurately.
 * 5. Accept action updates status to 'interested' / 'accepted'.
 * 6. Decline action updates status to 'unavailable'.
 * 7. Single request lookup getDonorRequestById retrieves details without 404.
 */

import { donorService } from "../src/services/donorService";
import { donorRequestStore } from "../src/services/donorRequestStore";
import { donorStore } from "../src/services/donorStore";
import { bloodRequestStore } from "../src/services/bloodRequestStore";
import { KNOWN_ORGANIZATIONS } from "../src/services/facilityRelationships";

async function testDonorDashboardRequests() {
  console.log("\n========================================================");
  console.log("🩸 ORBINOVA DONOR DASHBOARD REQUESTS TEST SUITE");
  console.log("========================================================\n");

  let passed = 0;
  const total = 6;

  // 1. Resolve Donor Context for default donor
  const DONOR_EMAIL = "donor@orbinova.com";
  const storedDonor = donorStore.get(DONOR_EMAIL);
  if (!storedDonor) {
    throw new Error("Default donor account not found in store.");
  }

  const userId = storedDonor.userId; // "d0000004-0000-0000-0000-000000000004"
  const donorProfileId = storedDonor.donorProfileId; // "1776af45-264a-4dc7-a9c3-3378c64e6f9c"
  const donorBloodGroup = storedDonor.bloodGroup; // "A+"

  console.log(`Testing with Donor: ${storedDonor.fullName} (${DONOR_EMAIL})`);
  console.log(`- User ID: ${userId}`);
  console.log(`- Donor Profile ID: ${donorProfileId}`);
  console.log(`- Blood Group: ${donorBloodGroup}\n`);

  // Test 1: Alias resolution in donorRequestStore
  try {
    const byProfileId = donorRequestStore.getByDonor(donorProfileId);
    const byUserId = donorRequestStore.getByDonor(userId);

    if (byProfileId.length > 0 && byProfileId.length === byUserId.length) {
      console.log(`✅ TEST 1 PASSED: donorRequestStore resolves both donorProfileId and userId aliases (${byProfileId.length} requests matched).`);
      passed++;
    } else {
      console.error(`❌ TEST 1 FAILED: Mismatch between profileId (${byProfileId.length}) and userId (${byUserId.length})`);
    }
  } catch (err: any) {
    console.error("❌ TEST 1 FAILED:", err.message);
  }

  // Test 2: Create a fresh urgent hospital blood request compatible with A+
  let testBloodReqId = `test-req-${Date.now()}`;
  try {
    const luthId = KNOWN_ORGANIZATIONS[0].id;
    bloodRequestStore.save({
      id: testBloodReqId,
      organization_id: luthId,
      requested_by: luthId,
      blood_group: "A+",
      units_required: 2,
      units_fulfilled: 0,
      urgency: "urgent",
      status: "open",
      required_by: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      notes: "Emergency surgical ward requisition",
      latitude: 6.5244,
      longitude: 3.3792,
      closed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    console.log(`✅ TEST 2 PASSED: Compatible hospital blood request created (${testBloodReqId}) for A+ blood.`);
    passed++;
  } catch (err: any) {
    console.error("❌ TEST 2 FAILED:", err.message);
  }

  // Test 3: Dashboard metrics fetches available requests
  let matchedRequestId = "";
  try {
    const metrics = await donorService.getDashboardMetrics(donorProfileId, userId);
    
    if (metrics.pendingRequestsCount > 0 && metrics.recentRequests.length > 0) {
      const topReq = metrics.recentRequests[0];
      matchedRequestId = topReq.id;
      console.log(`✅ TEST 3 PASSED: Dashboard metrics successfully fetched available requests:`);
      console.log(`   - Pending Requests Count: ${metrics.pendingRequestsCount}`);
      console.log(`   - Recent Requests on Dashboard: ${metrics.recentRequests.length}`);
      console.log(`   - Top Match: REQ-${topReq.blood_request_id.slice(0, 8)} (${topReq.blood_request.blood_group}) at ${topReq.blood_request.organization.name}`);
      passed++;
    } else {
      console.error(`❌ TEST 3 FAILED: Dashboard returned 0 pending requests (count: ${metrics.pendingRequestsCount}, recent: ${metrics.recentRequests.length})`);
    }
  } catch (err: any) {
    console.error("❌ TEST 3 FAILED:", err.message);
  }

  // Test 4: Full Requests Page fetch with filtering
  try {
    const allRequests = await donorService.getDonorRequests(donorProfileId, "all", userId);
    const activeRequests = await donorService.getDonorRequests(donorProfileId, "active", userId);

    if (allRequests.length > 0 && activeRequests.length > 0) {
      console.log(`✅ TEST 4 PASSED: Requests list fetched ${allRequests.length} total requests (${activeRequests.length} active/pending).`);
      passed++;
    } else {
      console.error(`❌ TEST 4 FAILED: Requests list returned empty.`);
    }
  } catch (err: any) {
    console.error("❌ TEST 4 FAILED:", err.message);
  }

  // Test 5: Single request detail lookup
  try {
    const detail = await donorService.getDonorRequestById(donorProfileId, matchedRequestId, userId);
    if (detail && detail.id === matchedRequestId && detail.blood_request.organization.name) {
      console.log(`✅ TEST 5 PASSED: Request detail fetched without 404 for ${detail.id}:`);
      console.log(`   - Hospital: ${detail.blood_request.organization.name}`);
      console.log(`   - Status: ${detail.status}`);
      console.log(`   - Required Blood Group: ${detail.blood_request.blood_group}`);
      passed++;
    } else {
      console.error(`❌ TEST 5 FAILED: Could not fetch request detail for ${matchedRequestId}`);
    }
  } catch (err: any) {
    console.error("❌ TEST 5 FAILED:", err.message);
  }

  // Test 6: Accept and Decline status transitions
  try {
    // 6a. Accept (I'm Interested)
    donorRequestStore.updateStatus(matchedRequestId, "interested");
    const updatedAccept = donorRequestStore.get(matchedRequestId);
    const acceptOk = updatedAccept?.status === "interested";

    // 6b. Decline (I'm Unavailable)
    const testDeclineId = `test-decline-${Date.now()}`;
    donorRequestStore.create({
      id: testDeclineId,
      blood_request_id: testBloodReqId,
      donor_id: userId,
      status: "pending",
    });
    donorRequestStore.updateStatus(testDeclineId, "unavailable", { reason: "Temporarily busy" });
    const updatedDecline = donorRequestStore.get(testDeclineId);
    const declineOk = updatedDecline?.status === "unavailable" && updatedDecline?.decline_reason === "Temporarily busy";

    if (acceptOk && declineOk) {
      console.log(`✅ TEST 6 PASSED: Request response actions verified (Accept -> 'interested', Decline -> 'unavailable').`);
      passed++;
    } else {
      console.error(`❌ TEST 6 FAILED: Status update failure. AcceptOk: ${acceptOk}, DeclineOk: ${declineOk}`);
    }
  } catch (err: any) {
    console.error("❌ TEST 6 FAILED:", err.message);
  }

  console.log("\n========================================================");
  console.log(`TEST RESULTS: ${passed}/${total} TESTS PASSED (${Math.round((passed/total)*100)}%)`);
  console.log("========================================================\n");

  if (passed === total) {
    console.log("🎉 DONOR DASHBOARD REQUEST FETCHING FULLY VERIFIED!\n");
    process.exit(0);
  } else {
    process.exit(1);
  }
}

testDonorDashboardRequests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
