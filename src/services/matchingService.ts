import { createClient } from "@/lib/supabase/server";
import { matchingEngine, MatchingExecutionOptions, MatchingExecutionResult } from "@/lib/matching";
import { MatchingRun, DonorRequest, BloodRequest, Organization, Profile } from "@/types/database";

export interface MatchingRunDetail extends MatchingRun {
  blood_requests?: BloodRequest & {
    organizations?: Organization;
  };
  donor_requests?: Array<
    DonorRequest & {
      profiles?: Pick<Profile, "id" | "full_name" | "email" | "phone">;
      donor_profiles?: {
        blood_group: string;
        genotype: string | null;
        city: string | null;
        state: string | null;
      };
    }
  >;
}

export interface MatchingAnalytics {
  totalRuns: number;
  totalDonorsConsidered: number;
  totalDonorsEligible: number;
  totalNotificationsSent: number;
  totalAccepted: number;
  totalDeclined: number;
  totalExpired: number;
  acceptanceRatePercentage: number;
  averageMatchingScore: number;
  averageDistanceKm: number;
}

export const matchingService = {
  /**
   * Triggers the matching algorithm for a blood request
   */
  async triggerMatching(
    bloodRequestId: string,
    options: MatchingExecutionOptions = {}
  ): Promise<MatchingExecutionResult> {
    return matchingEngine.executeMatchingRun(bloodRequestId, options);
  },

  /**
   * Retrieves list of matching runs with pagination and filters
   */
  async getMatchingRuns(params: {
    bloodRequestId?: string;
    organizationId?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ runs: MatchingRunDetail[]; total: number }> {
    const supabase = await createClient();
    const limit = params.limit || 20;
    const offset = params.offset || 0;

    let query = supabase
      .from("matching_runs")
      .select(
        `
        *,
        blood_requests!inner(
          id,
          organization_id,
          blood_group,
          units_required,
          units_fulfilled,
          urgency,
          status,
          created_at,
          organizations(id, name, organization_type, city, state)
        )
      `,
        { count: "exact" }
      )
      .order("executed_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (params.bloodRequestId) {
      query = query.eq("blood_request_id", params.bloodRequestId);
    }

    if (params.organizationId) {
      query = query.eq("blood_requests.organization_id", params.organizationId);
    }

    const { data, count, error } = await query;

    if (error) {
      console.error("[MatchingService] getMatchingRuns error:", error);
      return { runs: [], total: 0 };
    }

    return {
      runs: (data || []) as unknown as MatchingRunDetail[],
      total: count || 0,
    };
  },

  /**
   * Retrieves full details and candidate audit for a specific matching run
   */
  async getMatchingRunById(runId: string): Promise<MatchingRunDetail | null> {
    const supabase = await createClient();

    // 1. Fetch matching run + request details
    const { data: run, error: runErr } = await supabase
      .from("matching_runs")
      .select(
        `
        *,
        blood_requests(
          id,
          organization_id,
          blood_group,
          units_required,
          units_fulfilled,
          urgency,
          status,
          notes,
          required_by,
          created_at,
          organizations(id, name, organization_type, city, state, address, phone)
        )
      `
      )
      .eq("id", runId)
      .single();

    if (runErr || !run) {
      console.error("[MatchingService] getMatchingRunById error:", runErr);
      return null;
    }

    // 2. Fetch all dispatched donor requests for this matching run
    const { data: donorRequests, error: drErr } = await supabase
      .from("donor_requests")
      .select(
        `
        *,
        profiles:donor_id(id, full_name, email, phone),
        donor_profiles:donor_id(blood_group, genotype, city, state)
      `
      )
      .eq("matching_run_id", runId)
      .order("matching_score", { ascending: false });

    if (drErr) {
      console.error("[MatchingService] getMatchingRunById donor_requests error:", drErr);
    }

    const runObj = run as unknown as MatchingRun & {
      blood_requests?: BloodRequest & { organizations?: Organization };
    };

    return {
      ...runObj,
      donor_requests: donorRequests || [],
    } as unknown as MatchingRunDetail;
  },

  /**
   * Calculates overall matching algorithm performance metrics
   */
  async getMatchingAnalytics(): Promise<MatchingAnalytics> {
    const supabase = await createClient();

    // 1. Fetch matching runs summary
    const { data: rawRuns } = await supabase
      .from("matching_runs")
      .select("donors_considered, donors_eligible");

    const runs = (rawRuns || []) as Array<{ donors_considered: number; donors_eligible: number }>;

    // 2. Fetch donor requests summary
    const { data: rawRequests } = await supabase
      .from("donor_requests")
      .select("matching_score, distance_km, status");

    const requests = (rawRequests || []) as Array<{
      matching_score: number;
      distance_km: number | null;
      status: string;
    }>;

    const totalRuns = runs.length;
    const totalDonorsConsidered = runs.reduce((acc, r) => acc + (r.donors_considered || 0), 0);
    const totalDonorsEligible = runs.reduce((acc, r) => acc + (r.donors_eligible || 0), 0);

    const totalNotificationsSent = requests.length;
    let totalAccepted = 0;
    let totalDeclined = 0;
    let totalExpired = 0;
    let scoreSum = 0;
    let distanceSum = 0;
    let distanceCount = 0;

    for (const req of requests) {
      if (req.status === "accepted") totalAccepted++;
      else if (req.status === "declined") totalDeclined++;
      else if (req.status === "expired") totalExpired++;

      scoreSum += req.matching_score || 0;
      if (req.distance_km !== null && req.distance_km !== undefined) {
        distanceSum += req.distance_km;
        distanceCount++;
      }
    }

    const acceptanceRatePercentage =
      totalNotificationsSent > 0
        ? Math.round((totalAccepted / totalNotificationsSent) * 100 * 10) / 10
        : 0;

    const averageMatchingScore =
      totalNotificationsSent > 0
        ? Math.round((scoreSum / totalNotificationsSent) * 1000) / 1000
        : 0;

    const averageDistanceKm =
      distanceCount > 0 ? Math.round((distanceSum / distanceCount) * 10) / 10 : 0;

    return {
      totalRuns,
      totalDonorsConsidered,
      totalDonorsEligible,
      totalNotificationsSent,
      totalAccepted,
      totalDeclined,
      totalExpired,
      acceptanceRatePercentage,
      averageMatchingScore,
      averageDistanceKm,
    };
  },
};

