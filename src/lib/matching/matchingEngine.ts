import { createClient } from "@/lib/supabase/server";
import {
  BloodRequest,
  DonorProfile,
  Profile,
  RequestUrgency,
  BloodGroupCode,
} from "@/types/database";
import { MATCHING_CONFIG } from "./config";
import { isBloodCompatible, getCompatibleDonorGroups } from "./bloodCompatibility";
import { calculateDistance, calculateDistanceScore } from "./distance";
import { calculateAvailabilityScore } from "./availability";
import { calculateUrgencyScore } from "./urgency";
import { calculateMatchScore, MatchScoreBreakdown } from "./matchScore";
import { filterCandidates, CandidateDonor } from "./candidateFilter";
import { selectStagedMatchBatch, RankedCandidate, StagedBatchResult } from "./stagedMatching";
import { generateMatchExplanation } from "./explanation";
import { donorRequestStore } from "@/services/donorRequestStore";
import { inAppNotificationStore } from "@/services/inAppNotificationStore";
import { donorStore } from "@/services/donorStore";
import { bloodRequestStore } from "@/services/bloodRequestStore";

export interface MatchingExecutionOptions {
  radiusKm?: number;
  batchSize?: number;
  actorUserId?: string;
}

export interface MatchingExecutionResult {
  success: boolean;
  matchingRunId?: string;
  bloodRequestId: string;
  donorsConsidered: number;
  donorsEligible: number;
  donorsNotified: number;
  selectedCandidates: Array<{
    donorId: string;
    bloodGroup: BloodGroupCode;
    distanceKm: number | null;
    finalScore: number;
    displayPercentage: number;
    rankingPosition: number;
  }>;
  matchingState: string;
  isFulfilled: boolean;
  message: string;
  error?: string;
}

export const matchingEngine = {
  /**
   * Executes an end-to-end intelligent matching run for an active blood request.
   */
  async executeMatchingRun(
    bloodRequestId: string,
    options: MatchingExecutionOptions = {}
  ): Promise<MatchingExecutionResult> {
    const supabase = await createClient();
    const radiusKm = options.radiusKm || MATCHING_CONFIG.defaultRadiusKm;
    const batchSize = options.batchSize || MATCHING_CONFIG.initialBatchSize;

    const isPlaceholderSupabase =
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

    // STEP 1 & 2: Retrieve & Validate Blood Request
    let requestData: any = null;
    if (!isPlaceholderSupabase) {
      try {
        const res = await supabase
          .from("blood_requests")
          .select("*, organizations(id, name, latitude, longitude, city, state)")
          .eq("id", bloodRequestId)
          .single();
        requestData = res.data;
      } catch {}
    }

    if (!requestData) {
      const stored = bloodRequestStore.get(bloodRequestId);
      if (stored) {
        requestData = {
          ...stored,
          organizations: {
            id: stored.organization_id || stored.hospital_id,
            name: "Healthcare Facility",
            latitude: stored.latitude || 6.5244,
            longitude: stored.longitude || 3.3792,
            city: "Lagos",
            state: "Lagos",
          },
        };
      }
    }

    if (!requestData) {
      return {
        success: false,
        bloodRequestId,
        donorsConsidered: 0,
        donorsEligible: 0,
        donorsNotified: 0,
        selectedCandidates: [],
        matchingState: "failed",
        isFulfilled: false,
        message: "Blood request not found.",
        error: "NOT_FOUND",
      };
    }

    const bloodRequest = requestData as BloodRequest & {
      organizations?: { id: string; name: string; latitude: number | null; longitude: number | null };
    };

    // Validate request active state & expiration
    if (bloodRequest.status === "fulfilled" || bloodRequest.units_fulfilled >= bloodRequest.units_required) {
      return {
        success: true,
        bloodRequestId,
        donorsConsidered: 0,
        donorsEligible: 0,
        donorsNotified: 0,
        selectedCandidates: [],
        matchingState: "fulfilled",
        isFulfilled: true,
        message: "Blood request is already fulfilled. No additional matching needed.",
      };
    }

    if (bloodRequest.status === "cancelled") {
      return {
        success: false,
        bloodRequestId,
        donorsConsidered: 0,
        donorsEligible: 0,
        donorsNotified: 0,
        selectedCandidates: [],
        matchingState: "cancelled",
        isFulfilled: false,
        message: "Cannot run matching on a cancelled blood request.",
        error: "CANCELLED",
      };
    }

    if (bloodRequest.required_by && new Date(bloodRequest.required_by) < new Date()) {
      if (!isPlaceholderSupabase) {
        try {
          await (supabase.from("blood_requests") as any)
            .update({ status: "expired", updated_at: new Date().toISOString() })
            .eq("id", bloodRequestId);
        } catch {}
      }

      return {
        success: false,
        bloodRequestId,
        donorsConsidered: 0,
        donorsEligible: 0,
        donorsNotified: 0,
        selectedCandidates: [],
        matchingState: "expired",
        isFulfilled: false,
        message: "This blood request has expired.",
        error: "EXPIRED",
      };
    }

    // Set hospital coordinates fallback if not on request
    if (!bloodRequest.latitude && bloodRequest.organizations?.latitude) {
      bloodRequest.latitude = bloodRequest.organizations.latitude;
      bloodRequest.longitude = bloodRequest.organizations.longitude;
    }

    // STEP 3: Retrieve Existing Dispatched Requests to avoid duplicates
    let existingDonorReqs: any[] = [];
    if (!isPlaceholderSupabase) {
      try {
        const { data } = await supabase
          .from("donor_requests")
          .select("donor_id, status")
          .eq("blood_request_id", bloodRequestId);
        existingDonorReqs = data || [];
      } catch {}
    } else {
      existingDonorReqs = donorRequestStore.getByRequest(bloodRequestId);
    }

    const existingDonorIds = new Set<string>((existingDonorReqs || []).map((r: any) => r.donor_id));
    const activeExistingCount = (existingDonorReqs || []).filter(
      (r: any) => r.status === "pending" || r.status === "viewed" || r.status === "accepted"
    ).length;

    // STEP 4: Query Candidate Donors using strict role and status filtering (Component-Aware)
    const componentType = (bloodRequest as any).component_type || "red_cells";
    const compatibleGroups = getCompatibleDonorGroups(bloodRequest.blood_group, componentType);

    let candidateData: any[] = [];
    if (!isPlaceholderSupabase) {
      try {
        const { data: dbCand, error: candErr } = await supabase
          .from("donor_profiles")
          .select("*, profiles:profiles!donor_profiles_user_id_fkey!inner(*)")
          .eq("profiles.role", "donor")
          .eq("profiles.is_active", true)
          .eq("verification_status", "verified")
          .eq("availability_status", "available")
          .eq("eligibility_status", "eligible")
          .in("blood_group", compatibleGroups);

        if (!candErr && dbCand) {
          candidateData = dbCand;
        }
      } catch {}
    }

    const rawCandidates: CandidateDonor[] = ((candidateData as any[]) || []).map((c) => ({
      donorProfile: c as DonorProfile,
      profile: c.profiles as Profile,
    }));

    // Authoritative enrichment: Merge matching donors from donorStore
    const storeDonors = Object.values(donorStore.getAll());
    const existingCandidateIds = new Set(rawCandidates.map((c) => c.donorProfile.user_id));
    for (const d of storeDonors) {
      if (!existingCandidateIds.has(d.userId)) {
        if (
          d.isActive &&
          d.availabilityStatus === "available" &&
          d.eligibilityStatus === "eligible" &&
          d.locationConsent !== false &&
          compatibleGroups.includes(d.bloodGroup)
        ) {
          rawCandidates.push({
            donorProfile: {
              id: d.donorProfileId || `dp-${d.userId}`,
              user_id: d.userId,
              blood_group: d.bloodGroup,
              city: d.city || "Lagos",
              state: d.state || "Lagos",
              country: d.country || "Nigeria",
              district: d.district || null,
              postal_code: d.postalCode || null,
              latitude: d.latitude !== undefined && d.latitude !== null ? d.latitude : 6.5244,
              longitude: d.longitude !== undefined && d.longitude !== null ? d.longitude : 3.3792,
              location_consent: d.locationConsent ?? true,
              location_updated_at: d.locationUpdatedAt || d.updatedAt,
              availability_status: d.availabilityStatus,
              eligibility_status: d.eligibilityStatus,
              verification_status: "verified",
              created_at: d.updatedAt || new Date().toISOString(),
              updated_at: d.updatedAt || new Date().toISOString(),
            } as any,
            profile: {
              id: d.userId,
              email: d.email || "",
              full_name: d.fullName || "Voluntary Donor",
              phone: d.phone || null,
              role: "donor",
              is_active: d.isActive,
              created_at: d.updatedAt || new Date().toISOString(),
              updated_at: d.updatedAt || new Date().toISOString(),
            } as any,
          });
        }
      }
    }

    const totalConsidered = rawCandidates.length;

    // STEP 5: Hard-Filter Candidates
    const { eligibleCandidates } = filterCandidates(
      rawCandidates,
      bloodRequest,
      existingDonorIds,
      radiusKm
    );

    // STEP 6, 7, 8, 9: Calculate Normalized Scores & Deterministic Ranking
    const urgencyScore = calculateUrgencyScore(bloodRequest.urgency);

    const scoredCandidates: RankedCandidate[] = eligibleCandidates.map((evaluated) => {
      const { donor, distanceKm } = evaluated;
      const compResult = isBloodCompatible(donor.donorProfile.blood_group, bloodRequest.blood_group, componentType);
      const compatibilityScore = compResult.score;
      const distanceScore = calculateDistanceScore(distanceKm, radiusKm);
      const availabilityScore = calculateAvailabilityScore(donor.donorProfile.availability_status);

      const scoreBreakdown = calculateMatchScore({
        compatibilityScore,
        distanceScore,
        availabilityScore,
        urgencyScore,
      });

      return {
        donor,
        distanceKm,
        scoreBreakdown,
        rankingPosition: 0, // Assigned after sorting
      };
    });

    // Deterministic Multi-tier Sort:
    // 1. finalScore DESC
    // 2. distanceKm ASC
    // 3. donor_id ASC (deterministic tie-breaker)
    scoredCandidates.sort((a, b) => {
      if (b.scoreBreakdown.finalScore !== a.scoreBreakdown.finalScore) {
        return b.scoreBreakdown.finalScore - a.scoreBreakdown.finalScore;
      }
      const distA = a.distanceKm ?? 99999;
      const distB = b.distanceKm ?? 99999;
      if (distA !== distB) {
        return distA - distB;
      }
      return a.donor.donorProfile.id.localeCompare(b.donor.donorProfile.id);
    });

    // Assign rank positions
    scoredCandidates.forEach((c, idx) => {
      c.rankingPosition = idx + 1;
    });

    // STEP 10 & 11: Staged Batch Selection
    const stagedResult: StagedBatchResult = selectStagedMatchBatch(
      scoredCandidates,
      bloodRequest.units_required,
      bloodRequest.units_fulfilled,
      activeExistingCount,
      batchSize
    );

    const selectedToNotify = stagedResult.selectedCandidates;

    // STEP 12: Record Matching Run in Database
    let matchingRunId: string | null = null;
    if (!isPlaceholderSupabase) {
      try {
        const { data: matchingRun } = await (supabase
          .from("matching_runs") as any)
          .insert({
            blood_request_id: bloodRequestId,
            executed_at: new Date().toISOString(),
            donors_considered: totalConsidered,
            donors_eligible: scoredCandidates.length,
            radius_km: radiusKm,
          })
          .select()
          .single();
        matchingRunId = matchingRun?.id || null;
      } catch (err) {
        console.warn("Could not insert matching_run:", err);
      }
    }

    // STEP 13: Create Donor Request Snapshots & Notify Donors
    const expiryHours =
      MATCHING_CONFIG.defaultRequestExpiryHours[bloodRequest.urgency] || 24;
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();

    if (selectedToNotify.length > 0) {
      // 1. Authoritative persistence in donorRequestStore
      for (const c of selectedToNotify) {
        const drId = `dreq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        donorRequestStore.save({
          id: drId,
          blood_request_id: bloodRequestId,
          matching_run_id: matchingRunId,
          donor_id: c.donor.donorProfile.user_id || c.donor.donorProfile.id,
          matching_score: c.scoreBreakdown.finalScore,
          compatibility_score: c.scoreBreakdown.compatibilityScore,
          distance_score: c.scoreBreakdown.distanceScore,
          availability_score: c.scoreBreakdown.availabilityScore,
          urgency_score: c.scoreBreakdown.urgencyScore,
          distance_km: c.distanceKm,
          status: "pending",
          sent_at: new Date().toISOString(),
          expires_at: expiresAt,
          hospital_id: bloodRequest.organization_id,
          hospital_name: bloodRequest.organizations?.name || "Healthcare Facility",
          hospital_city: (bloodRequest.organizations as any)?.city || null,
          hospital_state: (bloodRequest.organizations as any)?.state || null,
          blood_group: bloodRequest.blood_group,
          component_type: (bloodRequest as any).component_type || "red_cells",
          units_required: bloodRequest.units_required,
          urgency: bloodRequest.urgency,
          required_by: bloodRequest.required_by,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        // In-App Notification
        const matchPct = c.scoreBreakdown.displayPercentage;
        const urgencyLabel = bloodRequest.urgency === "emergency" ? "Emergency" : "Urgent";
        inAppNotificationStore.create({
          userId: c.donor.donorProfile.user_id,
          organizationId: bloodRequest.organization_id,
          type: "blood_request",
          title: `${urgencyLabel} Blood Match: ${bloodRequest.blood_group} Needed`,
          message: `A compatible ${bloodRequest.blood_group} blood request has matched your profile (${matchPct}% match). Can you help save a life?`,
          data: {
            blood_request_id: bloodRequestId,
            matching_run_id: matchingRunId,
            matching_score: c.scoreBreakdown.finalScore,
            distance_km: c.distanceKm,
          },
        });
      }

      // 2. Resilient insert into Supabase donor_requests
      if (!isPlaceholderSupabase) {
        try {
          const donorRequestsPayload = selectedToNotify.map((c) => ({
            blood_request_id: bloodRequestId,
            matching_run_id: matchingRunId,
            donor_id: c.donor.donorProfile.user_id || c.donor.donorProfile.id,
            matching_score: c.scoreBreakdown.finalScore,
            compatibility_score: c.scoreBreakdown.compatibilityScore,
            distance_score: c.scoreBreakdown.distanceScore,
            availability_score: c.scoreBreakdown.availabilityScore,
            urgency_score: c.scoreBreakdown.urgencyScore,
            distance_km: c.distanceKm,
            status: "pending",
            sent_at: new Date().toISOString(),
            expires_at: expiresAt,
          }));

          await (supabase.from("donor_requests") as any).insert(donorRequestsPayload);
        } catch (e: any) {
          console.warn("Resilient donor_requests insert fallback:", e?.message);
        }

        // 3. Resilient insert into Supabase notifications
        try {
          const notificationsPayload = selectedToNotify.map((c) => {
            const matchPct = c.scoreBreakdown.displayPercentage;
            const urgencyLabel = bloodRequest.urgency === "emergency" ? "Emergency" : "Urgent";

            return {
              user_id: c.donor.donorProfile.user_id,
              type: "blood_request" as const,
              title: `${urgencyLabel} Blood Match: ${bloodRequest.blood_group} Needed`,
              message: `A compatible ${bloodRequest.blood_group} blood request has matched your profile (${matchPct}% match). Can you help save a life?`,
              data: {
                blood_request_id: bloodRequestId,
                matching_run_id: matchingRunId,
                matching_score: c.scoreBreakdown.finalScore,
                distance_km: c.distanceKm,
              },
            };
          });

          await (supabase.from("notifications") as any).insert(notificationsPayload);
        } catch (e: any) {
          console.warn("Resilient notifications insert fallback:", e?.message);
        }
      }

      // 4. Update blood_requests status to matching
      if (!isPlaceholderSupabase && bloodRequest.status === "open") {
        try {
          await (supabase.from("blood_requests") as any)
            .update({ status: "matching", updated_at: new Date().toISOString() })
            .eq("id", bloodRequestId);
        } catch {}
      }
    }

    // STEP 14: Record Audit Log
    if (!isPlaceholderSupabase) {
      try {
        await (supabase.from("audit_logs") as any).insert({
          user_id: options.actorUserId || null,
          organization_id: bloodRequest.organization_id,
          action: "MATCHING_RUN_EXECUTED",
          entity_type: "matching_runs",
          entity_id: matchingRunId,
          metadata: {
            blood_request_id: bloodRequestId,
            donors_considered: totalConsidered,
            donors_eligible: scoredCandidates.length,
            donors_notified: selectedToNotify.length,
            radius_km: radiusKm,
            batch_size: batchSize,
          },
        });
      } catch {}
    }

    const formattedSelected = selectedToNotify.map((c) => ({
      donorId: c.donor.donorProfile.id,
      bloodGroup: c.donor.donorProfile.blood_group,
      distanceKm: c.distanceKm,
      finalScore: c.scoreBreakdown.finalScore,
      displayPercentage: c.scoreBreakdown.displayPercentage,
      rankingPosition: c.rankingPosition,
    }));

    return {
      success: true,
      matchingRunId: matchingRunId || undefined,
      bloodRequestId,
      donorsConsidered: totalConsidered,
      donorsEligible: scoredCandidates.length,
      donorsNotified: selectedToNotify.length,
      selectedCandidates: formattedSelected,
      matchingState: stagedResult.matchingState,
      isFulfilled: stagedResult.isFulfilled,
      message:
        selectedToNotify.length > 0
          ? `Successfully matched and dispatched requests to ${selectedToNotify.length} top-ranked donors.`
          : stagedResult.matchingState === "exhausted"
          ? "No suitable unnotified donors are currently available within the matching area."
          : "Matching run completed.",
    };
  },
};
