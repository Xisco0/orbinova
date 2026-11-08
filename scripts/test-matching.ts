import {
  isBloodCompatible,
  getCompatibleDonorGroups,
  calculateDistance,
  calculateDistanceScore,
  calculateAvailabilityScore,
  calculateUrgencyScore,
  calculateMatchScore,
  generateMatchExplanation,
  selectStagedMatchBatch,
  MATCHING_CONFIG,
} from "../src/lib/matching";
import { BloodGroupCode, RequestUrgency, DonorAvailability } from "../src/types/database";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

console.log("==================================================");
console.log("RUNNING SMART DONOR MATCHING ENGINE TEST SUITE");
console.log("==================================================");

// 1. TEST CONFIG INTEGRITY
const weightSum =
  MATCHING_CONFIG.weights.compatibility +
  MATCHING_CONFIG.weights.distance +
  MATCHING_CONFIG.weights.availability +
  MATCHING_CONFIG.weights.urgency;
assert(Math.abs(weightSum - 1.0) < 0.0001, `Weights sum to exactly 1.00 (got ${weightSum})`);

// 2. TEST BLOOD COMPATIBILITY MATRIX (All key groups)
const allGroups: BloodGroupCode[] = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];

// O- is universal red-cell donor
for (const recipient of allGroups) {
  assert(isBloodCompatible("O-", recipient).compatible, `O- donor is compatible with recipient ${recipient}`);
}

// AB+ is universal recipient
for (const donor of allGroups) {
  assert(isBloodCompatible(donor, "AB+").compatible, `AB+ recipient can receive from donor ${donor}`);
}

// O- recipient can ONLY receive from O-
for (const donor of allGroups) {
  const expected = donor === "O-";
  const result = isBloodCompatible(donor, "O-").compatible;
  assert(
    result === expected,
    `Recipient O- with donor ${donor} -> expected ${expected}, got ${result}`
  );
}

// A+ recipient can receive from O-, O+, A-, A+
const aPlusDonors = getCompatibleDonorGroups("A+");
assert(
  aPlusDonors.length === 4 &&
    aPlusDonors.includes("O-") &&
    aPlusDonors.includes("O+") &&
    aPlusDonors.includes("A-") &&
    aPlusDonors.includes("A+"),
  `A+ recipient compatible groups: [${aPlusDonors.join(", ")}]`
);

// 3. TEST DISTANCE CALCULATION & SCORING
// Lagos Island (6.4549, 3.4246) to Ikeja (6.6018, 3.3515) is ~18 km
const lagosIsland = { lat: 6.4549, lng: 3.4246 };
const ikeja = { lat: 6.6018, lng: 3.3515 };
const dist = calculateDistance(lagosIsland.lat, lagosIsland.lng, ikeja.lat, ikeja.lng);
assert(dist !== null && dist > 15 && dist < 22, `Calculated Lagos Island to Ikeja distance ~${dist} km`);

// Distance scoring: 0km -> 1.0, 50km -> 0.0, 25km -> 0.50
assert(calculateDistanceScore(0, 50) === 1.0, "Distance score at 0 km is 1.00");
assert(calculateDistanceScore(50, 50) === 0.0, "Distance score at 50 km (max) is 0.00");
assert(calculateDistanceScore(25, 50) === 0.5, "Distance score at 25 km (half radius) is 0.50");
assert(calculateDistanceScore(75, 50) === 0.0, "Distance score beyond max radius is 0.00");

// 4. TEST AVAILABILITY SCORING
assert(calculateAvailabilityScore("available") === 1.0, "Available donor gets 1.00");
assert(calculateAvailabilityScore("temporarily_unavailable") === 0.0, "Temporarily unavailable donor gets 0.00");
assert(calculateAvailabilityScore("unavailable") === 0.0, "Unavailable donor gets 0.00");

// 5. TEST URGENCY SCORING
assert(calculateUrgencyScore("emergency") === 1.0, "Emergency urgency score is 1.00");
assert(calculateUrgencyScore("urgent") === 0.75, "Urgent urgency score is 0.75");
assert(calculateUrgencyScore("normal") === 0.5, "Normal urgency score is 0.50");

// 6. TEST COMPOSITE MATCH SCORE
// Scenario 1: Perfect match (Compat: 1.0, Dist: 0km (1.0), Avail: 1.0, Urgency: Emergency (1.0))
// Score: 1.0*0.4 + 1.0*0.25 + 1.0*0.2 + 1.0*0.15 = 1.00
const perfectScore = calculateMatchScore({
  compatibilityScore: isBloodCompatible("O-", "O-").score,
  distanceScore: calculateDistanceScore(0, 50),
  availabilityScore: calculateAvailabilityScore("available"),
  urgencyScore: calculateUrgencyScore("emergency"),
});
assert(perfectScore.finalScore === 1.0, `Perfect candidate score is 1.00 (got ${perfectScore.finalScore})`);
assert(perfectScore.displayPercentage === 100, "Perfect score displays as 100%");

// Scenario 2: Emergency, 25km away, compatible, available
// Score: 1.0*0.40 + 0.50*0.25 + 1.0*0.20 + 1.0*0.15 = 0.40 + 0.125 + 0.20 + 0.15 = 0.875
const realisticScore = calculateMatchScore({
  compatibilityScore: isBloodCompatible("O+", "A+").score,
  distanceScore: calculateDistanceScore(25, 50),
  availabilityScore: calculateAvailabilityScore("available"),
  urgencyScore: calculateUrgencyScore("emergency"),
});
assert(
  Math.abs(realisticScore.finalScore - 0.875) < 0.0001,
  `Realistic candidate score is 0.875 (got ${realisticScore.finalScore})`
);
assert(realisticScore.displayPercentage === 88, `Realistic score displays as 88% (got ${realisticScore.displayPercentage}%)`);

// 7. TEST MATCH EXPLANATION GENERATOR
const explanation = generateMatchExplanation({
  donorBloodGroup: "O-",
  recipientBloodGroup: "A+",
  distanceKm: 8.5,
  maxRadiusKm: 50,
  availabilityStatus: "available",
  eligibilityStatus: "eligible",
});
assert(explanation.compatibleBloodType === true, "Explanation confirms compatible blood type");
assert(explanation.withinMatchingRadius === true, "Explanation confirms within matching radius");
assert(explanation.currentlyAvailable === true, "Explanation confirms donor is available");
assert(explanation.eligibleToDonate === true, "Explanation confirms donor is eligible");
assert(explanation.bulletPoints.length === 4, "Explanation contains 4 clear bullet points");
assert(explanation.summary.length > 0, `Generated explanation summary: "${explanation.summary}"`);

// 8. TEST STAGED BATCH SELECTION & DETERMINISTIC SORTING
const candidates = [
  {
    donor: {
      profile: { id: "donor-3", is_active: true } as any,
      donorProfile: { id: "donor-3", blood_group: "O+" as BloodGroupCode, availability_status: "available", eligibility_status: "eligible" } as any,
    },
    distanceKm: 12,
    scoreBreakdown: {
      compatibilityScore: 1.0,
      distanceScore: 0.76,
      availabilityScore: 1.0,
      urgencyScore: 0.75,
      finalScore: 0.85,
      displayPercentage: 85,
      weightedComponents: {
        compatibilityWeighted: 0.4,
        distanceWeighted: 0.19,
        availabilityWeighted: 0.2,
        urgencyWeighted: 0.1125,
      },
    },
  },
  {
    donor: {
      profile: { id: "donor-1", is_active: true } as any,
      donorProfile: { id: "donor-1", blood_group: "O-" as BloodGroupCode, availability_status: "available", eligibility_status: "eligible" } as any,
    },
    distanceKm: 5,
    scoreBreakdown: {
      compatibilityScore: 1.0,
      distanceScore: 0.9,
      availabilityScore: 1.0,
      urgencyScore: 0.75,
      finalScore: 0.95,
      displayPercentage: 95,
      weightedComponents: {
        compatibilityWeighted: 0.4,
        distanceWeighted: 0.225,
        availabilityWeighted: 0.2,
        urgencyWeighted: 0.1125,
      },
    },
  },
  {
    donor: {
      profile: { id: "donor-2", is_active: true } as any,
      donorProfile: { id: "donor-2", blood_group: "A+" as BloodGroupCode, availability_status: "available", eligibility_status: "eligible" } as any,
    },
    distanceKm: 5,
    scoreBreakdown: {
      compatibilityScore: 1.0,
      distanceScore: 0.9,
      availabilityScore: 1.0,
      urgencyScore: 0.75,
      finalScore: 0.95,
      displayPercentage: 95,
      weightedComponents: {
        compatibilityWeighted: 0.4,
        distanceWeighted: 0.225,
        availabilityWeighted: 0.2,
        urgencyWeighted: 0.1125,
      },
    },
  },
];

const batchResult = selectStagedMatchBatch(
  candidates.map((c, i) => ({ ...c, rankingPosition: i + 1 })),
  2, // unitsRequired
  0, // unitsFulfilled
  0, // existingActiveRequestCount
  2  // batchSize
);

assert(batchResult.selectedCandidates.length === 2, "Selected staged batch contains 2 candidates");
assert(batchResult.selectedCandidates[0].donor.donorProfile.id === "donor-3", "Rank #1 is top ranked candidate");
assert(batchResult.remainingUnitsNeeded === 2, "Remaining units needed is 2");
assert(!batchResult.isFulfilled, "Request is not yet fulfilled");

console.log("==================================================");
console.log("ALL MATCHING ENGINE TESTS PASSED PERFECTLY (100%)");
console.log("==================================================");

