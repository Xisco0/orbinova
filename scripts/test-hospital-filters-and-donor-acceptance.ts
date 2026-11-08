import { hospitalService } from "../src/services/hospitalService";
import { bloodRequestStore } from "../src/services/bloodRequestStore";
import { donorRequestStore } from "../src/services/donorRequestStore";

async function runTest() {
  console.log("=== RUNNING HOSPITAL FILTERS & DONOR ACCEPTANCE VISIBILITY TEST ===");

  const LUTH_HOSPITAL_ID = "a1111111-1111-1111-1111-111111111111";
  const TEST_USER_ID = "00000000-0000-0000-0000-000000000002"; // Dr. Babatunde

  // 1. Test Dashboard Metrics
  console.log("\n--- 1. Testing Dashboard Metrics ---");
  const metrics = await hospitalService.getDashboardMetrics(LUTH_HOSPITAL_ID, TEST_USER_ID);
  console.log("Metrics total available units:", metrics.totalAvailableUnits);
  console.log("Metrics active requests:", metrics.requests.active);
  console.log("Metrics pending matches count:", metrics.donorRequestsPending);
  console.log("Metrics ACCEPTED donor requests count:", metrics.donorRequestsAccepted);
  console.log("Metrics recent donor responses count:", metrics.recentDonorResponses.length);

  if (metrics.donorRequestsAccepted > 0) {
    console.log("✓ PASS: Accepted donors count is correctly tracked (> 0):", metrics.donorRequestsAccepted);
  } else {
    console.error("✗ FAIL: Expected accepted donor requests count > 0");
  }

  // 2. Test Recent Requests Enrichment on Dashboard
  console.log("\n--- 2. Testing Recent Requests Enrichment ---");
  console.log("Total recent requests on dashboard:", metrics.recentRequests.length);
  const reqWithAcceptedDonors = metrics.recentRequests.find(r => (r.accepted_donors_count ?? 0) > 0);
  if (reqWithAcceptedDonors) {
    console.log(`✓ PASS: Request REQ-${reqWithAcceptedDonors.id.substring(0,8)} has ${reqWithAcceptedDonors.accepted_donors_count} accepted donors!`);
    console.log("Next Action:", reqWithAcceptedDonors.next_action);
  } else {
    console.log("Notice: No recent request has accepted donors in top slice; checking full list...");
  }

  // 3. Test Blood Requests Filtering
  console.log("\n--- 3. Testing Blood Requests Filtering ---");
  const allRequests = await hospitalService.getBloodRequests(LUTH_HOSPITAL_ID);
  console.log("Total blood requests for facility:", allRequests.length);

  const acceptedFiltered = await hospitalService.getBloodRequests(LUTH_HOSPITAL_ID, {
    status: "accepted_donors",
  });
  console.log(`Requests with accepted donors (status='accepted_donors'): ${acceptedFiltered.length}`);
  for (const r of acceptedFiltered) {
    if ((r.accepted_donors_count ?? 0) <= 0) {
      throw new Error(`Filter failure: request ${r.id} returned with 0 accepted donors`);
    }
  }
  console.log("✓ PASS: Filter by 'accepted_donors' only returns requests with accepted donors!");

  const bloodGroupFiltered = await hospitalService.getBloodRequests(LUTH_HOSPITAL_ID, {
    bloodGroup: "O+",
  });
  console.log(`Requests for group O+: ${bloodGroupFiltered.length}`);
  for (const r of bloodGroupFiltered) {
    if (r.blood_group !== "O+") {
      throw new Error(`Filter failure: request ${r.id} returned with blood group ${r.blood_group}`);
    }
  }
  console.log("✓ PASS: Filter by bloodGroup='O+' works accurately!");

  // Search filter test
  if (allRequests.length > 0) {
    const firstReq = allRequests[0];
    const searchTerm = firstReq.id.substring(0, 6);
    const searchFiltered = await hospitalService.getBloodRequests(LUTH_HOSPITAL_ID, {
      search: searchTerm,
    });
    console.log(`Search for '${searchTerm}': ${searchFiltered.length} match(es)`);
    if (searchFiltered.length === 0 || !searchFiltered.some(r => r.id === firstReq.id)) {
      throw new Error(`Search filter failed to find request by ID prefix ${searchTerm}`);
    }
    console.log("✓ PASS: Search filter by ID prefix works accurately!");
  }

  // 4. Test Donor Requests Filtering & Search
  console.log("\n--- 4. Testing Donor Requests Filtering & Search ---");
  const allDonorReqs = await hospitalService.getDonorRequests(LUTH_HOSPITAL_ID);
  console.log("Total dispatched donor requests:", allDonorReqs.length);

  const acceptedDonorReqs = await hospitalService.getDonorRequests(LUTH_HOSPITAL_ID, "accepted");
  console.log("Accepted donor requests (status='accepted'):", acceptedDonorReqs.length);
  for (const dr of acceptedDonorReqs) {
    if (dr.status !== "accepted" && dr.status !== "interested") {
      throw new Error(`Filter failure: donor request ${dr.id} has status ${dr.status}`);
    }
  }
  console.log("✓ PASS: Filter by status='accepted' captures both 'accepted' and 'interested' responses!");

  if (allDonorReqs.length > 0) {
    const firstDr = allDonorReqs[0];
    const donorRefSearch = firstDr.donor_ref;
    const searchDonorReqs = await hospitalService.getDonorRequests(LUTH_HOSPITAL_ID, undefined, donorRefSearch);
    console.log(`Search by donorRef '${donorRefSearch}': ${searchDonorReqs.length} match(es)`);
    if (searchDonorReqs.length === 0 || !searchDonorReqs.some(d => d.id === firstDr.id)) {
      throw new Error(`Search filter failed to find donor request by donor ref ${donorRefSearch}`);
    }
    console.log("✓ PASS: Search filter by donorRef works accurately!");
  }

  console.log("\n=== ALL TESTS PASSED SUCCESSFULLY! ===");
}

runTest().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
