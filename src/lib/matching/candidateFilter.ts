import { DonorProfile, Profile, BloodRequest, BloodGroupCode } from "@/types/database";
import { isBloodCompatible } from "./bloodCompatibility";
import { calculateDistance } from "./distance";
import { MATCHING_CONFIG } from "./config";

export interface CandidateDonor {
  profile: Profile;
  donorProfile: DonorProfile;
}

export interface EvaluatedCandidate {
  donor: CandidateDonor;
  distanceKm: number | null;
  isEligible: boolean;
  isCompatible: boolean;
  isWithinRadius: boolean;
  isAvailable: boolean;
  filterReason?: string;
}

/**
 * Hard-filters candidate donors according to clinical, operational, and geographic constraints.
 * Only candidates passing ALL criteria are permitted to proceed to score ranking.
 */
export function filterCandidates(
  candidates: CandidateDonor[],
  bloodRequest: BloodRequest,
  existingDonorRequestDonorIds: Set<string> = new Set(),
  maxRadiusKm: number = MATCHING_CONFIG.defaultRadiusKm
): {
  eligibleCandidates: EvaluatedCandidate[];
  excludedCandidates: EvaluatedCandidate[];
} {
  const eligibleCandidates: EvaluatedCandidate[] = [];
  const excludedCandidates: EvaluatedCandidate[] = [];

  for (const candidate of candidates) {
    const { profile, donorProfile } = candidate;

    // 1. Account Active Check
    if (!profile.is_active) {
      excludedCandidates.push({
        donor: candidate,
        distanceKm: null,
        isEligible: false,
        isCompatible: false,
        isWithinRadius: false,
        isAvailable: false,
        filterReason: "User account is deactivated",
      });
      continue;
    }

    // 2. Hard Eligibility Check
    if (donorProfile.eligibility_status !== "eligible") {
      excludedCandidates.push({
        donor: candidate,
        distanceKm: null,
        isEligible: false,
        isCompatible: false,
        isWithinRadius: false,
        isAvailable: false,
        filterReason: `Ineligible: ${donorProfile.eligibility_status.replace("_", " ")}`,
      });
      continue;
    }

    // 3. Hard Availability Check
    if (donorProfile.availability_status !== "available") {
      excludedCandidates.push({
        donor: candidate,
        distanceKm: null,
        isEligible: true,
        isCompatible: false,
        isWithinRadius: false,
        isAvailable: false,
        filterReason: `Unavailable: ${donorProfile.availability_status.replace("_", " ")}`,
      });
      continue;
    }

    // 3b. Location Matching Consent Check
    if (donorProfile.location_consent === false) {
      excludedCandidates.push({
        donor: candidate,
        distanceKm: null,
        isEligible: true,
        isCompatible: false,
        isWithinRadius: false,
        isAvailable: false,
        filterReason: "Donor has withdrawn consent for location-based matching",
      });
      continue;
    }

    // 4. Blood Compatibility Hard Filter (Component-Aware)
    const componentType = (bloodRequest as any).component_type || "red_cells";
    const compResult = isBloodCompatible(donorProfile.blood_group, bloodRequest.blood_group, componentType);
    if (!compResult.compatible) {
      excludedCandidates.push({
        donor: candidate,
        distanceKm: null,
        isEligible: true,
        isCompatible: false,
        isWithinRadius: false,
        isAvailable: true,
        filterReason: `Incompatible blood type ${donorProfile.blood_group} for request ${bloodRequest.blood_group} (${componentType})`,
      });
      continue;
    }

    // 5. Existing Request Duplication Filter
    if (existingDonorRequestDonorIds.has(donorProfile.id)) {
      excludedCandidates.push({
        donor: candidate,
        distanceKm: null,
        isEligible: true,
        isCompatible: true,
        isWithinRadius: false,
        isAvailable: true,
        filterReason: "Donor already dispatched for this blood request",
      });
      continue;
    }

    // 6. Distance & Geographic Radius Filter
    const distanceKm = calculateDistance(
      donorProfile.latitude,
      donorProfile.longitude,
      bloodRequest.latitude,
      bloodRequest.longitude
    );

    // If both coordinates exist and distance exceeds configured maximum radius
    if (distanceKm !== null && distanceKm > maxRadiusKm) {
      excludedCandidates.push({
        donor: candidate,
        distanceKm,
        isEligible: true,
        isCompatible: true,
        isWithinRadius: false,
        isAvailable: true,
        filterReason: `Outside maximum radius (${distanceKm} km > ${maxRadiusKm} km)`,
      });
      continue;
    }

    // Candidate passed all filters!
    eligibleCandidates.push({
      donor: candidate,
      distanceKm,
      isEligible: true,
      isCompatible: true,
      isWithinRadius: true,
      isAvailable: true,
    });
  }

  return { eligibleCandidates, excludedCandidates };
}
