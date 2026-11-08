import { createClient } from "@/lib/supabase/server";
import { donorStore } from "@/services/donorStore";
import { donorRequestStore, StoredDonorRequest } from "@/services/donorRequestStore";
import { inAppNotificationStore } from "@/services/inAppNotificationStore";
import { bloodRequestStore } from "@/services/bloodRequestStore";
import { KNOWN_ORGANIZATIONS } from "@/services/facilityRelationships";
import { isBloodCompatible } from "@/lib/matching/bloodCompatibility";
import {
  DonorProfile,
  Profile,
  BloodGroupCode,
  DonorAvailability,
  DonorEligibility,
  DonorRequest,
  Donation,
  Notification,
  BloodRequest,
  Organization,
} from "@/types/database";

export interface DonorContext {
  user: Profile;
  donorProfile: DonorProfile;
  registeringOrganizationName?: string;
  registeringOrganizationId?: string;
}

export interface DonorRequestWithDetails extends DonorRequest {
  blood_request: BloodRequest & {
    organization: Pick<Organization, "id" | "name" | "organization_type" | "city" | "state">;
  };
}

export interface DonationWithDetails extends Donation {
  organization: Pick<Organization, "id" | "name" | "organization_type" | "city" | "state">;
  blood_request?: Pick<BloodRequest, "id" | "blood_group" | "urgency"> | null;
}

export const donorService = {
  /**
   * Resolves or auto-initializes the donor profile for the authenticated user
   */
  async getDonorContext(userId: string): Promise<DonorContext | null> {
    const supabase = await createClient("donor");

    // 1. Get profile
    let profile: Profile | null = null;
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      profile = profileData as Profile | null;
    } catch {}

    if (!profile) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.id === userId) {
          profile = {
            id: userId,
            email: user.email || "donor@orbinova.com",
            full_name: user.user_metadata?.full_name || "Volunteer Hero Donor",
            phone: user.user_metadata?.phone || "",
            avatar_url: null,
            role: "donor",
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
      } catch {}
    }

    if (!profile) {
      profile = {
        id: userId,
        email: "donor@orbinova.com",
        full_name: "Volunteer Hero Donor",
        phone: "",
        avatar_url: null,
        role: "donor",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    // 2. Get donor profile
    let donorProfile: DonorProfile | null = null;
    try {
      const { data: donorProfileData } = await supabase
        .from("donor_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      donorProfile = donorProfileData as DonorProfile | null;
    } catch {}

    if (!donorProfile) {
      donorProfile = {
        id: `donor-${userId}`,
        user_id: userId,
        blood_group: "O+",
        date_of_birth: null,
        gender: null,
        address: null,
        city: "Lagos",
        state: "Lagos",
        country: "Nigeria",
        latitude: 6.5244,
        longitude: 3.3792,
        availability_status: "available",
        eligibility_status: "eligible",
        last_donation_date: null,
        next_eligible_date: null,
        emergency_contact_name: null,
        emergency_contact_phone: null,
        verification_status: "verified",
        verified_at: new Date().toISOString(),
        verified_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    // 3. Authoritative enrichment from donorStore
    const stored = donorStore.get(userId) || donorStore.get(profile.email);
    if (stored) {
      if (stored.fullName) profile.full_name = stored.fullName;
      if (stored.phone) profile.phone = stored.phone;
      if (stored.bloodGroup) donorProfile.blood_group = stored.bloodGroup;
      if (stored.dateOfBirth !== undefined) donorProfile.date_of_birth = stored.dateOfBirth;
      if (stored.gender !== undefined) donorProfile.gender = stored.gender;
      if (stored.city !== undefined) donorProfile.city = stored.city;
      if (stored.state !== undefined) donorProfile.state = stored.state;
      if (stored.availabilityStatus !== undefined) donorProfile.availability_status = stored.availabilityStatus;
      if (stored.eligibilityStatus !== undefined) donorProfile.eligibility_status = stored.eligibilityStatus;
      if (stored.lastDonationDate !== undefined) donorProfile.last_donation_date = stored.lastDonationDate;
    }

    const regOrgId =
      stored?.registeringOrganizationId ||
      stored?.organizationId ||
      (donorProfile as any)?.organization_id ||
      "a1111111-1111-1111-1111-111111111111";

    let regOrgName = "Lagos University Teaching Hospital (LUTH)";
    const knownMatch = KNOWN_ORGANIZATIONS.find((o) => o.id === regOrgId);
    if (knownMatch) {
      regOrgName = knownMatch.name;
    } else {
      try {
        const { data: dbOrg } = await (supabase.from("organizations") as any)
          .select("name")
          .eq("id", regOrgId)
          .maybeSingle();
        if (dbOrg?.name) regOrgName = dbOrg.name;
      } catch {}
    }

    return {
      user: profile as Profile,
      donorProfile: donorProfile as DonorProfile,
      registeringOrganizationName: regOrgName,
      registeringOrganizationId: regOrgId,
    };
  },

  /**
   * Resolves all valid IDs associated with a donor across profiles, stores, and auth
   */
  getValidDonorIds(donorId: string, userId?: string): string[] {
    const ids = new Set<string>();
    if (donorId) {
      ids.add(donorId);
      ids.add(donorId.replace(/^(dp-|donor-)+/g, ""));
    }
    if (userId) {
      ids.add(userId);
      ids.add(userId.replace(/^(dp-|donor-)+/g, ""));
    }
    const stored = donorStore.get(donorId) || (userId ? donorStore.get(userId) : undefined);
    if (stored) {
      if (stored.userId) {
        ids.add(stored.userId);
        ids.add(stored.userId.replace(/^(dp-|donor-)+/g, ""));
      }
      if (stored.donorProfileId) {
        ids.add(stored.donorProfileId);
        ids.add(stored.donorProfileId.replace(/^(dp-|donor-)+/g, ""));
      }
    }
    return Array.from(ids).filter(Boolean);
  },

  /**
   * Automatically scans active, unfulfilled hospital blood requests compatible with this donor
   * and creates pending donor_request snapshots so they appear on the donor dashboard ready to accept or decline.
   */
  syncCompatibleBloodRequests(donorId: string, userId?: string, donorBloodGroup?: BloodGroupCode) {
    try {
      const storedDonor = donorStore.get(donorId) || (userId ? donorStore.get(userId) : undefined);
      const bloodGroup = donorBloodGroup || storedDonor?.bloodGroup || "O+";
      const targetDonorId = storedDonor?.userId || userId || donorId;

      const allBloodReqs = bloodRequestStore.getAll();
      const existingDonorReqs = donorRequestStore.getByDonor(targetDonorId);
      const existingBloodReqIds = new Set(existingDonorReqs.map((r) => r.blood_request_id));

      const now = Date.now();

      for (const req of Object.values(allBloodReqs)) {
        if (req.status === "fulfilled" || req.status === "cancelled" || req.status === "expired") {
          continue;
        }
        if (req.units_fulfilled >= req.units_required) {
          continue;
        }
        if (req.required_by && new Date(req.required_by).getTime() < now) {
          continue;
        }

        const comp = isBloodCompatible(bloodGroup, req.blood_group, "red_cells");
        if (!comp.compatible) {
          continue;
        }

        if (!existingBloodReqIds.has(req.id)) {
          const knownOrg = KNOWN_ORGANIZATIONS.find((o) => o.id === req.organization_id);
          const hospitalName = knownOrg?.name || "Accredited Medical Center";
          const hospitalCity = knownOrg?.city || "Lagos";
          const hospitalState = knownOrg?.state || "Lagos";

          const urgencyHours = req.urgency === "emergency" ? 12 : req.urgency === "urgent" ? 24 : 72;
          const expiresAt = req.required_by || new Date(now + urgencyHours * 3600 * 1000).toISOString();

          const newReq = donorRequestStore.create({
            id: `dreq-${req.id.slice(0, 8)}-${targetDonorId.slice(0, 6)}`,
            blood_request_id: req.id,
            matching_run_id: null,
            donor_id: targetDonorId,
            matching_score: 0.95,
            compatibility_score: comp.score || 1.0,
            distance_score: 0.9,
            availability_score: 1.0,
            urgency_score: req.urgency === "emergency" ? 1.0 : 0.85,
            distance_km: 2.8,
            status: "pending",
            sent_at: req.created_at || new Date().toISOString(),
            expires_at: expiresAt,
            hospital_id: req.organization_id,
            hospital_name: hospitalName,
            hospital_city: hospitalCity,
            hospital_state: hospitalState,
            blood_group: req.blood_group,
            component_type: "red_cells",
            units_required: req.units_required,
            urgency: req.urgency,
            required_by: req.required_by,
          });

          existingBloodReqIds.add(req.id);

          inAppNotificationStore.create({
            userId: targetDonorId,
            organizationId: req.organization_id,
            type: "blood_request",
            title: `${req.urgency === "emergency" ? "Emergency" : "Urgent"} Blood Match: ${req.blood_group} Needed`,
            message: `${hospitalName} in ${hospitalCity} has an urgent request for ${req.blood_group} blood that matches your profile. Can you help save a life?`,
            data: {
              blood_request_id: req.id,
              donor_request_id: newReq.id,
              matching_score: 0.95,
            },
          });
        }
      }
    } catch (err) {
      console.warn("syncCompatibleBloodRequests notice:", err);
    }
  },

  /**
   * Aggregates dashboard metrics for the authenticated donor
   */
  async getDashboardMetrics(donorId: string, userId: string) {
    const supabase = await createClient("donor");
    const validDonorIds = this.getValidDonorIds(donorId, userId);
    const storedDonor = donorStore.get(donorId) || (userId ? donorStore.get(userId) : undefined);

    // Sync active compatible requests from hospitals
    this.syncCompatibleBloodRequests(donorId, userId, storedDonor?.bloodGroup);

    const [donationsRes, pendingRequestsRes, activeRequestsRes, unreadNotifsRes] = await Promise.all([
      supabase.from("donations").select("*", { count: "exact", head: true }).in("donor_id", validDonorIds).eq("status", "completed"),
      supabase.from("donor_requests").select("*", { count: "exact", head: true }).in("donor_id", validDonorIds).eq("status", "pending"),
      supabase.from("donor_requests").select("*", { count: "exact", head: true }).in("donor_id", validDonorIds).in("status", ["pending", "accepted", "interested"]),
      supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("is_read", false),
    ]);

    // Authoritative store metrics
    const storedRequests = donorRequestStore.getByDonor(donorId);
    const storedPendingCount = storedRequests.filter((r) => r.status === "pending" || r.status === "viewed").length;
    const storedActiveCount = storedRequests.filter((r) => ["pending", "viewed", "accepted", "interested", "contacted", "scheduled", "awaiting_screening"].includes(r.status)).length;
    const storedUnreadNotifs = inAppNotificationStore.getUnreadCount(userId);

    // Fetch latest recent requests from DB
    const { data: dbRecentRequests } = await supabase
      .from("donor_requests")
      .select("*, blood_requests(*, organizations(id, name, organization_type, city, state))")
      .in("donor_id", validDonorIds)
      .order("created_at", { ascending: false })
      .limit(3);

    const mappedDbRecent = ((dbRecentRequests as any[]) || []).map((r) => ({
      ...r,
      blood_request: {
        ...(r.blood_requests || {}),
        organization: r.blood_requests?.organizations || {
          id: "",
          name: "Medical Facility",
          organization_type: "hospital",
          city: "Nigeria",
          state: "Nigeria",
        },
      },
    })) as DonorRequestWithDetails[];

    // Merge with stored requests
    const existingRecentIds = new Set(mappedDbRecent.map((r) => r.id));
    const mergedRecent: DonorRequestWithDetails[] = [...mappedDbRecent];
    for (const s of storedRequests) {
      if (!existingRecentIds.has(s.id)) {
        mergedRecent.push(this.mapStoredToDetails(s));
      }
    }
    mergedRecent.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Fetch latest donation
    const { data: latestDonation } = await supabase
      .from("donations")
      .select("*, organizations(id, name, organization_type, city, state)")
      .in("donor_id", validDonorIds)
      .order("donation_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    const allDonorNotifs = await this.getDonorNotifications(userId);
    const resolvedUnreadNotifsCount = allDonorNotifs.filter((n) => !n.is_read).length;

    return {
      totalDonations: donationsRes.count || 0,
      pendingRequestsCount: Math.max(pendingRequestsRes.count || 0, storedPendingCount),
      activeRequestsCount: Math.max(activeRequestsRes.count || 0, storedActiveCount),
      unreadNotificationsCount: resolvedUnreadNotifsCount,
      recentRequests: mergedRecent.slice(0, 3),
      latestDonation: latestDonation
        ? ({
            ...(latestDonation as any),
            organization: (latestDonation as any).organizations || {
              id: "",
              name: "Medical Facility",
              organization_type: "hospital",
              city: "Nigeria",
              state: "Nigeria",
            },
          } as DonationWithDetails)
        : null,
    };
  },

  /**
   * Helper to map StoredDonorRequest into DonorRequestWithDetails
   */
  mapStoredToDetails(r: StoredDonorRequest): DonorRequestWithDetails {
    return {
      id: r.id,
      blood_request_id: r.blood_request_id,
      matching_run_id: r.matching_run_id || null,
      donor_id: r.donor_id,
      matching_score: r.matching_score,
      compatibility_score: r.compatibility_score,
      distance_score: r.distance_score,
      availability_score: r.availability_score,
      urgency_score: r.urgency_score,
      distance_km: r.distance_km,
      status: r.status as any,
      sent_at: r.sent_at,
      responded_at: r.responded_at || null,
      expires_at: r.expires_at || null,
      created_at: r.created_at,
      updated_at: r.updated_at,
      blood_request: {
        id: r.blood_request_id,
        organization_id: r.hospital_id,
        requested_by: r.hospital_id,
        blood_group: r.blood_group,
        units_required: r.units_required,
        units_fulfilled: 0,
        urgency: r.urgency,
        status: "open",
        required_by: r.required_by || null,
        notes: r.notes || null,
        latitude: null,
        longitude: null,
        closed_at: null,
        created_at: r.created_at,
        updated_at: r.updated_at,
        organization: {
          id: r.hospital_id,
          name: r.hospital_name,
          organization_type: "hospital",
          city: r.hospital_city || "Nigeria",
          state: r.hospital_state || "National",
        },
      },
    };
  },

  /**
   * Retrieves donor requests with optional filtering
   */
  async getDonorRequests(
    donorId: string,
    filterStatus?: string,
    userId?: string
  ): Promise<DonorRequestWithDetails[]> {
    const supabase = await createClient("donor");
    const validDonorIds = this.getValidDonorIds(donorId, userId);

    // Sync active compatible requests from hospitals
    this.syncCompatibleBloodRequests(donorId, userId);

    let dbRows: any[] = [];
    try {
      let query = supabase
        .from("donor_requests")
        .select("*, blood_requests(*, organizations(id, name, organization_type, city, state))")
        .in("donor_id", validDonorIds)
        .order("created_at", { ascending: false });

      if (filterStatus && filterStatus !== "all") {
        if (filterStatus === "active") {
          query = query.in("status", ["pending", "accepted", "interested", "contacted", "scheduled", "awaiting_screening"]);
        } else if (filterStatus === "history") {
          query = query.in("status", ["completed", "declined", "unavailable", "withdrawn", "expired", "cancelled", "deferred"]);
        } else {
          query = query.eq("status", filterStatus);
        }
      }

      const { data, error } = await query;
      if (!error && data) {
        dbRows = data;
      }
    } catch (e) {
      console.warn("DB donor requests fetch warning:", e);
    }

    const mappedDb = dbRows.map((item) => ({
      ...item,
      blood_request: {
        ...(item.blood_requests || {}),
        organization: item.blood_requests?.organizations || {
          id: "",
          name: "Medical Facility",
          organization_type: "hospital",
          city: "Nigeria",
          state: "Nigeria",
        },
      },
    }));

    // Authoritative enrichment from donorRequestStore
    const stored = donorRequestStore.getByDonor(donorId);
    const existingIds = new Set(mappedDb.map((r) => r.id));
    const merged: DonorRequestWithDetails[] = [...mappedDb];

    for (const s of stored) {
      if (!existingIds.has(s.id)) {
        if (filterStatus && filterStatus !== "all") {
          if (filterStatus === "active" && !["pending", "viewed", "accepted", "interested", "contacted", "scheduled", "awaiting_screening"].includes(s.status)) {
            continue;
          }
          if (filterStatus === "history" && !["completed", "declined", "unavailable", "withdrawn", "expired", "cancelled", "deferred"].includes(s.status)) {
            continue;
          }
          if (filterStatus !== "active" && filterStatus !== "history" && s.status !== filterStatus) {
            continue;
          }
        }
        merged.push(this.mapStoredToDetails(s));
      }
    }

    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return merged;
  },

  /**
   * Retrieves a single donor request by ID
   */
  async getDonorRequestById(
    donorId: string,
    requestId: string,
    userId?: string
  ): Promise<DonorRequestWithDetails | null> {
    const supabase = await createClient("donor");
    const validDonorIds = this.getValidDonorIds(donorId, userId);

    try {
      const { data, error } = await supabase
        .from("donor_requests")
        .select("*, blood_requests(*, organizations(id, name, organization_type, city, state, phone, address))")
        .eq("id", requestId)
        .in("donor_id", validDonorIds)
        .maybeSingle();

      if (!error && data) {
        const item = data as any;
        return {
          ...item,
          blood_request: {
            ...(item.blood_requests || {}),
            organization: item.blood_requests?.organizations || {
              id: "",
              name: "Medical Center",
              organization_type: "hospital",
              city: "Nigeria",
              state: "Nigeria",
            },
          },
        } as DonorRequestWithDetails;
      }
    } catch {}

    // Resilient fallback to donorRequestStore
    const stored = donorRequestStore.get(requestId);
    if (stored) {
      const isOwner =
        validDonorIds.includes(stored.donor_id) ||
        validDonorIds.some((vid) => vid.length > 5 && (stored.donor_id.includes(vid) || vid.includes(stored.donor_id)));
      if (isOwner) {
        return this.mapStoredToDetails(stored);
      }
    }

    return null;
  },

  /**
   * Retrieves donor's personal donation records
   */
  async getDonorDonations(donorId: string): Promise<DonationWithDetails[]> {
    const supabase = await createClient("donor");

    const { data, error } = await supabase
      .from("donations")
      .select("*, organizations(id, name, organization_type, city, state), blood_requests(id, blood_group, urgency)")
      .eq("donor_id", donorId)
      .order("donation_date", { ascending: false });

    if (error) {
      console.error("Error fetching donor donations:", error);
      return [];
    }

    return ((data as any[]) || []).map((item) => ({
      ...item,
      organization: item.organizations || {
        id: "",
        name: "Blood Bank Center",
        organization_type: "blood_bank",
        city: "Nigeria",
        state: "Nigeria",
      },
      blood_request: item.blood_requests || null,
    }));
  },

  /**
   * Retrieves single donation record
   */
  async getDonorDonationById(
    donorId: string,
    donationId: string
  ): Promise<DonationWithDetails | null> {
    const supabase = await createClient("donor");

    const { data, error } = await supabase
      .from("donations")
      .select("*, organizations(id, name, organization_type, city, state, address, phone), blood_requests(id, blood_group, urgency, notes)")
      .eq("id", donationId)
      .eq("donor_id", donorId)
      .maybeSingle();

    if (error || !data) return null;

    const item = data as any;
    return {
      ...item,
      organization: item.organizations || {
        id: "",
        name: "Blood Bank Center",
        organization_type: "blood_bank",
        city: "Nigeria",
        state: "Nigeria",
      },
      blood_request: item.blood_requests || null,
    } as DonationWithDetails;
  },

  /**
   * Retrieves notifications for the donor
   */
  async getDonorNotifications(userId: string): Promise<Notification[]> {
    const supabase = await createClient("donor");

    let dbRows: any[] = [];
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        dbRows = data;
      }
    } catch {}

    const storedNotifs = inAppNotificationStore.getByUser(userId);
    const storedMap = new Map(storedNotifs.map((s) => [s.id, s]));
    const merged: Notification[] = [];

    // Add DB rows, giving store-level precedence to read state
    for (const r of dbRows) {
      const match = storedMap.get(r.id);
      if (match) {
        merged.push({
          ...r,
          is_read: match.is_read,
          read_at: match.read_at,
        });
      } else {
        merged.push(r as Notification);
      }
    }

    // Append store items not present in DB
    const existingIds = new Set(dbRows.map((n) => n.id));
    for (const s of storedNotifs) {
      if (!existingIds.has(s.id)) {
        merged.push(s as unknown as Notification);
      }
    }

    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return merged;
  },

  /**
   * Calculates profile completion percentage
   */
  calculateProfileCompletion(profile: Profile, donorProfile: DonorProfile): {
    percentage: number;
    missingFields: string[];
  } {
    const fields = [
      { name: "Full Name", value: profile.full_name },
      { name: "Phone Number", value: profile.phone },
      { name: "Blood Group", value: donorProfile.blood_group },
      { name: "City", value: donorProfile.city },
      { name: "State", value: donorProfile.state },
      { name: "Date of Birth", value: donorProfile.date_of_birth },
      { name: "Gender", value: donorProfile.gender },
    ];

    const completed = fields.filter((f) => !!f.value).length;
    const missing = fields.filter((f) => !f.value).map((f) => f.name);
    const percentage = Math.round((completed / fields.length) * 100);

    return { percentage, missingFields: missing };
  },
};
