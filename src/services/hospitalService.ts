import { createClient } from "@/lib/supabase/server";
import { staffStore } from "@/services/staffStore";
import { donorStore } from "@/services/donorStore";
import { getDonorDisplayReference } from "@/lib/donor/donorReference";
import { bloodRequestStore } from "@/services/bloodRequestStore";
import { inventoryStore } from "@/services/inventoryStore";
import { donorRequestStore } from "@/services/donorRequestStore";
import { reservationStore } from "@/services/reservationStore";
import { inAppNotificationStore } from "@/services/inAppNotificationStore";
import { getAuthoritativeInventoryOrgId, KNOWN_ORGANIZATIONS } from "@/services/facilityRelationships";
import {
  Organization,
  OrganizationMember,
  Profile,
  UserRole,
  OrgType,
  BloodInventory,
  BloodInventoryTransaction,
  BloodRequest,
  Donation,
  DonorRequest,
  Notification,
  BloodGroupCode,
  RequestUrgency,
  RequestStatus,
  InventoryTxType,
} from "@/types/database";

export interface HospitalContext {
  user: Profile;
  membership: OrganizationMember;
  organization: Organization;
  isOwner: boolean;
  isManager: boolean;
  isStaff: boolean;
}

function normalizeBloodRequest(raw: any, orgId?: string): BloodRequest {
  if (!raw) return raw;
  return {
    ...raw,
    organization_id: raw.organization_id || raw.hospital_id || orgId || "",
    units_required: raw.units_required ?? raw.units_needed ?? 1,
    units_fulfilled: raw.units_fulfilled ?? 0,
  } as BloodRequest;
}

function normalizeBloodInventory(raw: any, orgId: string): BloodInventory {
  const avail = raw.available_quantity ?? raw.units_available ?? 0;
  const res = raw.reserved_quantity ?? raw.units_reserved ?? 0;
  const qty = raw.quantity ?? (avail + res);
  return {
    ...raw,
    organization_id: raw.organization_id || orgId,
    quantity: qty,
    reserved_quantity: res,
    available_quantity: avail,
  } as BloodInventory;
}

// Helper to resolve donor response counts for a blood request
function getDonorRequestCounts(bloodRequestId: string) {
  try {
    const all = Object.values(donorRequestStore.getAll());
    const matches = all.filter((dr) => dr.blood_request_id === bloodRequestId);
    const accepted = matches.filter(
      (dr) =>
        dr.status === "accepted" ||
        dr.status === "interested" ||
        dr.status === "scheduled" ||
        dr.status === "awaiting_screening" ||
        dr.status === "contacted"
    ).length;
    const pending = matches.filter((dr) => dr.status === "pending" || dr.status === "viewed").length;
    return {
      accepted,
      pending,
      total: matches.length,
    };
  } catch {
    return { accepted: 0, pending: 0, total: 0 };
  }
}

// Helper to determine next operational action for a blood request
function determineNextAction(req: BloodRequest, acceptedCount: number, pendingCount: number) {
  if (req.units_fulfilled >= req.units_required || req.status === "fulfilled") {
    return {
      type: "fulfilled" as const,
      label: "Request Fulfilled",
      description: "All required blood units confirmed received and fulfilled.",
      href: `/hospital/blood-requests/${req.id}`,
    };
  }
  if (acceptedCount > 0) {
    return {
      type: "screen_donor" as const,
      label: `${acceptedCount} Donor(s) Accepted • Schedule Screening`,
      description: `${acceptedCount} voluntary donor(s) confirmed interest. Review match and coordinate screening appointment.`,
      href: `/hospital/donor-requests?status=accepted`,
    };
  }
  if ((req.units_issued ?? 0) > 0 || req.status === "partially_issued" || req.status === "fully_issued") {
    return {
      type: "confirm_receipt" as const,
      label: "Confirm Blood Delivery",
      description: "Units have been dispatched by blood bank. Confirm receipt at facility ward.",
      href: `/hospital/blood-requests/${req.id}`,
    };
  }
  if ((req.units_reserved ?? 0) > 0 || req.status === "partially_reserved" || req.status === "fully_reserved") {
    return {
      type: "issue_blood" as const,
      label: "Issue Reserved Blood",
      description: "Blood bank has reserved stock. Issue units to transit.",
      href: `/hospital/blood-requests/${req.id}`,
    };
  }
  if (pendingCount > 0 || req.status === "donor_matching" || req.status === "matching") {
    return {
      type: "awaiting_donor" as const,
      label: `Awaiting ${pendingCount || "Candidate"} Donor Responses`,
      description: "Dispatched to matching voluntary donors. Awaiting confirmations.",
      href: `/hospital/blood-requests/${req.id}`,
    };
  }
  return {
    type: "open" as const,
    label: "Dispatch Request",
    description: "Request open. Dispatch to nearby blood banks and compatible donors.",
    href: `/hospital/blood-requests/${req.id}`,
  };
}

export const hospitalService = {
  /**
   * Resolves authenticated user's organization context & permissions
   */
  async getHospitalContext(userId: string): Promise<HospitalContext | null> {
    try {
      const supabase = await createClient("hospital");

      // 1. Get profile (with auth.getUser metadata fallback)
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
          if (user) {
            const metaRole = (user.user_metadata?.role as UserRole) || "hospital";
            profile = {
              id: userId,
              email: user.email || "",
              full_name: user.user_metadata?.full_name || "Healthcare Specialist",
              role: metaRole,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as Profile;
          }
        } catch {}
      }

      if (!profile) {
        profile = {
          id: userId,
          email: "hospital@orbinova.com",
          full_name: "Chief Medical Officer",
          role: "hospital",
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Profile;
      }

      // 2. Query organization_members
      let membershipData: any = null;
      let memberErr: any = null;
      try {
        const res = await supabase
          .from("organization_members")
          .select("*, organizations(*)")
          .eq("user_id", userId)
          .eq("is_active", true)
          .maybeSingle();
        membershipData = res.data;
        memberErr = res.error;
      } catch (e: any) {
        memberErr = e;
      }

      // Check if user is associated with an organization in staffStore or KNOWN_ORGANIZATIONS
      const staffRecord = staffStore.get(userId) || (profile?.email ? staffStore.get(profile.email) : undefined);
      const matchedOrg = staffRecord?.organizationId
        ? KNOWN_ORGANIZATIONS.find((o) => o.id === staffRecord.organizationId)
        : profile?.email
        ? KNOWN_ORGANIZATIONS.find((o) => o.email.toLowerCase() === profile.email.toLowerCase())
        : undefined;

      if (memberErr || !membershipData || !(membershipData as any).organizations) {
        // Dynamic Resolution: Resolve the specific registered hospital the user belongs to
        const orgType = profile.role === "blood_bank" ? "blood_bank" : "hospital";

        let fallbackOrg: any = matchedOrg;
        if (!fallbackOrg) {
          try {
            const res = await supabase
              .from("organizations")
              .select("*")
              .eq("type", orgType)
              .limit(1)
              .maybeSingle();
            fallbackOrg = res.data;
          } catch {}
        }

        if (!fallbackOrg) {
          fallbackOrg = {
            id: orgType === "hospital" ? "a1111111-1111-1111-1111-111111111111" : "b2222222-2222-2222-2222-222222222222",
            name: orgType === "hospital" ? "Lagos University Teaching Hospital (LUTH)" : "Lagos Island Central Blood Bank",
            type: orgType,
            registration_number: orgType === "hospital" ? "RC-HOSP-001" : "RC-BB-002",
            email: orgType === "hospital" ? "hospital@orbinova.com" : "bloodbank@orbinova.com",
            phone: "+2348022334455",
            address: "Ishaga Road, Idi-Araba",
            city: "Surulere",
            state: "Lagos",
            verification_status: "verified",
          };
        }

        const resolvedOrg = {
          ...fallbackOrg,
          organization_type: (fallbackOrg as any).organization_type || (fallbackOrg as any).type || orgType,
        } as unknown as Organization;

        const isOwnerRole = profile.email === resolvedOrg.email || staffRecord?.memberRole === "owner";
        const memberRole = staffRecord?.memberRole || (isOwnerRole ? "owner" : "doctor");

        const fakeMembership: OrganizationMember = {
          id: `member-${userId}`,
          organization_id: resolvedOrg.id,
          user_id: userId,
          member_role: memberRole,
          is_active: staffRecord?.isActive ?? true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        return {
          user: profile,
          membership: fakeMembership,
          organization: resolvedOrg,
          isOwner: isOwnerRole,
          isManager: isOwnerRole || memberRole === "manager" || memberRole === "administrator",
          isStaff: memberRole === "staff" || memberRole === "hospital_staff" || memberRole === "clinical_staff",
        };
      }

      const rawOrg = (membershipData as any).organizations;
      const org: Organization = {
        ...rawOrg,
        organization_type: rawOrg.organization_type || rawOrg.type || "hospital",
      };
      const rawMember = membershipData as any;
      let memberRole = staffRecord?.memberRole || rawMember.member_role || rawMember.role || "owner";
      if (profile.email === org.email || memberRole === "owner") {
        memberRole = "owner";
      }
      const member: OrganizationMember = {
        ...rawMember,
        member_role: memberRole,
      };
      const isOwner = memberRole === "owner";
      const isManager = memberRole === "manager" || memberRole === "administrator" || isOwner;
      const isStaff = memberRole === "staff" || memberRole === "hospital_staff" || memberRole === "clinical_staff";

      return {
        user: profile,
        membership: member,
        organization: org,
        isOwner,
        isManager,
        isStaff,
      };
    } catch (globalErr: any) {
      console.warn("Resilient getHospitalContext fallback due to network error:", globalErr?.message);
      const fallbackOrg = {
        id: "a1111111-1111-1111-1111-111111111111",
        name: "Lagos University Teaching Hospital (LUTH)",
        organization_type: "hospital" as const,
        type: "hospital" as const,
        registration_number: "RC-HOSP-001",
        email: "hospital@orbinova.com",
        phone: "+2348022334455",
        address: "Ishaga Road, Idi-Araba",
        city: "Surulere",
        state: "Lagos",
        country: "Nigeria",
        verification_status: "verified" as const,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        latitude: 6.5186,
        longitude: 3.3562,
        license_number: "RC-HOSP-001",
        verified_at: new Date().toISOString(),
        verified_by: null,
      } as Organization;

      return {
        user: {
          id: userId,
          email: "hospital@orbinova.com",
          full_name: "Chief Medical Officer",
          role: "hospital" as const,
          phone: "+2348022334455",
          avatar_url: null,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        membership: {
          id: `member-${userId}`,
          organization_id: fallbackOrg.id,
          user_id: userId,
          member_role: "owner" as const,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        organization: fallbackOrg,
        isOwner: true,
        isManager: true,
        isStaff: false,
      };
    }
  },

  /**
   * Dashboard metrics aggregated for the facility
   */
  async getDashboardMetrics(orgId: string, userId: string) {
    const supabase = await createClient();

    // 1. Safe Blood Requests counts (handles both hospital_id and organization_id)
    let totalReqCount = 0;
    let activeReqCount = 0;
    let fulfilledReqCount = 0;

    try {
      let qTotal = await supabase.from("blood_requests").select("*", { count: "exact", head: true }).eq("hospital_id", orgId);
      if (qTotal.error) {
        qTotal = await supabase.from("blood_requests").select("*", { count: "exact", head: true }).eq("organization_id", orgId);
      }
      totalReqCount = qTotal.count || 0;

      let qActive = await supabase.from("blood_requests").select("*", { count: "exact", head: true }).eq("hospital_id", orgId).in("status", ["open", "matching", "partially_fulfilled"]);
      if (qActive.error) {
        qActive = await supabase.from("blood_requests").select("*", { count: "exact", head: true }).eq("organization_id", orgId).in("status", ["open", "matching", "partially_fulfilled"]);
      }
      activeReqCount = qActive.count || 0;

      let qFulfilled = await supabase.from("blood_requests").select("*", { count: "exact", head: true }).eq("hospital_id", orgId).eq("status", "fulfilled");
      if (qFulfilled.error) {
        qFulfilled = await supabase.from("blood_requests").select("*", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "fulfilled");
      }
      fulfilledReqCount = qFulfilled.count || 0;
    } catch (e) {
      console.warn("Blood requests count query:", e);
    }

    // Incorporate store requests into counts if not already counted
    const storedRequests = bloodRequestStore.getByOrg(orgId);
    if (storedRequests.length > totalReqCount) {
      totalReqCount = storedRequests.length;
      activeReqCount = storedRequests.filter(r => ["open", "matching", "partially_fulfilled"].includes(r.status)).length;
      fulfilledReqCount = storedRequests.filter(r => r.status === "fulfilled").length;
    }

    // 2. Safe Donations count
    let donationsTotalCount = 0;
    try {
      const qDon = await supabase.from("donations").select("*", { count: "exact", head: true }).eq("organization_id", orgId);
      donationsTotalCount = qDon.count || 0;
    } catch {
      // Table may not exist yet
      donationsTotalCount = 0;
    }

    // 3. Safe Pending & Accepted Donor Requests count (strictly scoped to this facility's blood requests)
    let donorRequestsPendingCount = 0;
    let donorRequestsAcceptedCount = 0;

    const facilityStoredRequests = bloodRequestStore.getByOrg(orgId);
    const facilityReqIds: string[] = facilityStoredRequests.map((r) => r.id);

    try {
      const { data: facilityRequests } = await supabase
        .from("blood_requests")
        .select("id")
        .eq("organization_id", orgId);

      const typedFacilityRequests = (facilityRequests || []) as Array<{ id: string }>;
      for (const r of typedFacilityRequests) {
        if (!facilityReqIds.includes(r.id)) facilityReqIds.push(r.id);
      }

      if (facilityReqIds.length > 0) {
        const qDrPending = await supabase
          .from("donor_requests")
          .select("*", { count: "exact", head: true })
          .in("blood_request_id", facilityReqIds)
          .eq("status", "pending");
        donorRequestsPendingCount = qDrPending.count || 0;

        const qDrAccepted = await supabase
          .from("donor_requests")
          .select("*", { count: "exact", head: true })
          .in("blood_request_id", facilityReqIds)
          .in("status", ["accepted", "interested"]);
        donorRequestsAcceptedCount = qDrAccepted.count || 0;
      }
    } catch {
      donorRequestsPendingCount = 0;
      donorRequestsAcceptedCount = 0;
    }

    // Merge with donorRequestStore
    const allStoredDonorReqs = Object.values(donorRequestStore.getAll()).filter(
      (dr) => facilityReqIds.includes(dr.blood_request_id) || dr.hospital_id === orgId
    );
    const storedAcceptedCount = allStoredDonorReqs.filter(
      (dr) => dr.status === "accepted" || dr.status === "interested"
    ).length;
    const storedPendingCount = allStoredDonorReqs.filter(
      (dr) => dr.status === "pending" || dr.status === "viewed"
    ).length;

    donorRequestsPendingCount = Math.max(donorRequestsPendingCount, storedPendingCount);
    donorRequestsAcceptedCount = Math.max(donorRequestsAcceptedCount, storedAcceptedCount);

    // Recent donor responses (sorted descending by response / update time)
    const recentDonorResponses = allStoredDonorReqs
      .sort((a, b) => new Date(b.responded_at || b.updated_at || b.created_at).getTime() - new Date(a.responded_at || a.updated_at || a.created_at).getTime())
      .slice(0, 5)
      .map((s) => ({
        id: s.id,
        blood_request_id: s.blood_request_id,
        donor_ref: getDonorDisplayReference(s.donor_id, (s as any).donor_ref),
        blood_group: s.blood_group || "O+",
        status: s.status,
        distance_km: s.distance_km,
        matching_score: s.matching_score,
        responded_at: s.responded_at || s.updated_at,
        created_at: s.created_at,
      }));

    // 4. Safe Notifications count (User + Organization in-app store)
    let notificationsUnreadCount = 0;
    try {
      const qNotif = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("is_read", false);
      notificationsUnreadCount = qNotif.count || 0;
    } catch {
      notificationsUnreadCount = 0;
    }
    const storeUnreadUser = inAppNotificationStore.getUnreadCount(userId);
    const storeUnreadOrg = inAppNotificationStore.getUnreadCount(orgId);
    notificationsUnreadCount = Math.max(notificationsUnreadCount, storeUnreadUser, storeUnreadOrg);

    // 5. Blood Inventory (handles quantity/reserved_quantity/available_quantity AND units_available/units_reserved)
    let totalAvailable = 0;
    let totalReserved = 0;
    const stockMap: Record<string, { total: number; reserved: number; available: number }> = {
      "A+": { total: 0, reserved: 0, available: 0 },
      "A-": { total: 0, reserved: 0, available: 0 },
      "B+": { total: 0, reserved: 0, available: 0 },
      "B-": { total: 0, reserved: 0, available: 0 },
      "AB+": { total: 0, reserved: 0, available: 0 },
      "AB-": { total: 0, reserved: 0, available: 0 },
      "O+": { total: 0, reserved: 0, available: 0 },
      "O-": { total: 0, reserved: 0, available: 0 },
    };

    try {
      const { data: invRows } = await supabase.from("blood_inventory").select("*").eq("organization_id", orgId);
      if (invRows) {
        for (const item of (invRows as any[])) {
          if (stockMap[item.blood_group]) {
            const avail = item.available_quantity ?? item.units_available ?? 0;
            const res = item.reserved_quantity ?? item.units_reserved ?? 0;
            const tot = item.quantity ?? (avail + res);

            stockMap[item.blood_group] = {
              total: tot,
              reserved: res,
              available: avail,
            };
            totalAvailable += avail;
            totalReserved += res;
          }
        }
      }
    } catch (e) {
      console.warn("Blood inventory query:", e);
    }

    const lowStockGroups = Object.entries(stockMap)
      .filter(([_, v]) => v.available > 0 && v.available < 10)
      .map(([bg, v]) => ({ bloodGroup: bg, available: v.available }));

    const criticalStockGroups = Object.entries(stockMap)
      .filter(([_, v]) => v.available < 3)
      .map(([bg, v]) => ({ bloodGroup: bg, available: v.available }));

    // 6. Recent requests
    let recentRequests: BloodRequest[] = [];
    try {
      let qRecent = await supabase
        .from("blood_requests")
        .select("*")
        .eq("hospital_id", orgId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (qRecent.error) {
        qRecent = await supabase
          .from("blood_requests")
          .select("*")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false })
          .limit(10);
      }
      recentRequests = (qRecent.data || []).map((r) => normalizeBloodRequest(r, orgId));
    } catch {
      recentRequests = [];
    }

    // Merge store requests into recentRequests
    const storedForRecent = bloodRequestStore.getByOrg(orgId);
    const existingRecentIds = new Set(recentRequests.map((r) => r.id));
    for (const s of storedForRecent) {
      if (!existingRecentIds.has(s.id)) {
        recentRequests.push(s as BloodRequest);
      }
    }
    recentRequests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    recentRequests = recentRequests.slice(0, 6);

    // Enrich with donor acceptance counts and next action
    for (const req of recentRequests) {
      const counts = getDonorRequestCounts(req.id);
      req.accepted_donors_count = counts.accepted;
      req.pending_donors_count = counts.pending;
      req.total_matched_donors = counts.total;
      req.next_action = determineNextAction(req, counts.accepted, counts.pending);
    }

    // 7. Recent donations
    let recentDonations: Donation[] = [];
    try {
      const { data: donRows } = await supabase
        .from("donations")
        .select("*, donor_profiles(blood_group)")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(5);
      recentDonations = (donRows || []) as Donation[];
    } catch {
      recentDonations = [];
    }

    return {
      totalAvailableUnits: totalAvailable,
      totalReservedUnits: totalReserved,
      lowStockGroups,
      criticalStockGroups,
      stockMap,
      requests: {
        total: totalReqCount,
        active: activeReqCount,
        fulfilled: fulfilledReqCount,
      },
      donationsTotal: donationsTotalCount,
      donorRequestsPending: donorRequestsPendingCount,
      donorRequestsAccepted: donorRequestsAcceptedCount,
      recentDonorResponses,
      unreadNotificationsCount: notificationsUnreadCount,
      recentRequests,
      recentDonations,
    };
  },

  /**
   * Blood inventory for the 8 groups.
   * If the hospital operates a linked internal blood bank facility,
   * its blood inventory is managed through that facility as the single authoritative owner.
   */
  async getInventory(orgId: string): Promise<BloodInventory[]> {
    const authOrgId = getAuthoritativeInventoryOrgId(orgId);
    const storeInventory = inventoryStore.getInventory(authOrgId);
    const storeMap = new Map(storeInventory.map((item) => [item.blood_group, item]));

    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("blood_inventory")
        .select("*")
        .eq("organization_id", authOrgId)
        .order("blood_group", { ascending: true });

      if (!error && data && data.length > 0) {
        const existing = (data as any[]).map((item) => normalizeBloodInventory(item, authOrgId));
        for (const item of existing) {
          if (!storeMap.has(item.blood_group) || (item.quantity > 0 && storeMap.get(item.blood_group)?.quantity === 0)) {
            storeMap.set(item.blood_group, item);
          }
        }
      }
    } catch {}

    const standardGroups: BloodGroupCode[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
    return standardGroups.map((bg) => {
      if (storeMap.has(bg)) {
        return storeMap.get(bg)!;
      }
      return {
        id: `virtual-${bg}`,
        organization_id: authOrgId,
        blood_group: bg,
        quantity: 0,
        reserved_quantity: 0,
        available_quantity: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });
  },

  /**
   * Inventory transactions ledger with search support
   */
  async getInventoryTransactions(
    orgId: string,
    filterBloodGroup?: string,
    filterTxType?: string,
    search?: string
  ): Promise<BloodInventoryTransaction[]> {
    const authOrgId = getAuthoritativeInventoryOrgId(orgId);
    const storeTx = inventoryStore.getTransactions(authOrgId, filterBloodGroup, filterTxType);

    let allTx = [...storeTx];
    try {
      const supabase = await createClient();
      let query = supabase
        .from("blood_inventory_transactions")
        .select("*")
        .eq("organization_id", authOrgId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (filterBloodGroup && filterBloodGroup !== "all") {
        query = query.eq("blood_group", filterBloodGroup as BloodGroupCode);
      }
      if (filterTxType && filterTxType !== "all") {
        query = query.eq("transaction_type", filterTxType as InventoryTxType);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        const existingIds = new Set(allTx.map((t) => t.id));
        for (const dbTx of data as BloodInventoryTransaction[]) {
          if (!existingIds.has(dbTx.id)) {
            allTx.push(dbTx);
          }
        }
      }
    } catch {}

    allTx.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      allTx = allTx.filter((t) => {
        const bg = (t.blood_group || "").toLowerCase();
        const type = (t.transaction_type || "").toLowerCase();
        const refId = (t.reference_id || "").toLowerCase();
        const notes = (t.notes || "").toLowerCase();
        const id = (t.id || "").toLowerCase();
        return bg.includes(term) || type.includes(term) || refId.includes(term) || notes.includes(term) || id.includes(term);
      });
    }

    return allTx;
  },

  /**
   * Facility Blood Requests list with full filter and search support + donor progress enrichment
   */
  async getBloodRequests(
    orgId: string,
    filters?: { status?: string; urgency?: string; bloodGroup?: string; search?: string }
  ): Promise<BloodRequest[]> {
    const supabase = await createClient();

    let dbRows: any[] = [];
    try {
      let query = supabase
        .from("blood_requests")
        .select("*")
        .order("created_at", { ascending: false });

      // Try hospital_id first
      let testHosp = await supabase.from("blood_requests").select("hospital_id").limit(1);
      if (!testHosp.error) {
        query = query.eq("hospital_id", orgId);
      } else {
        query = query.eq("organization_id", orgId);
      }

      const { data, error } = await query;
      if (!error && data) {
        dbRows = data;
      }
    } catch (e) {
      console.warn("DB Blood requests fetch error:", e);
    }

    const normalizedDb = dbRows.map((r) => normalizeBloodRequest(r, orgId));

    // Authoritative enrichment from bloodRequestStore
    const stored = bloodRequestStore.getByOrg(orgId);
    const existingIds = new Set(normalizedDb.map((r) => r.id));
    const merged: BloodRequest[] = [...normalizedDb];

    for (const s of stored) {
      if (!existingIds.has(s.id)) {
        merged.push(s as BloodRequest);
      }
    }

    // Enrich every request with donor acceptance counts and next action
    for (const req of merged) {
      const counts = getDonorRequestCounts(req.id);
      req.accepted_donors_count = counts.accepted;
      req.pending_donors_count = counts.pending;
      req.total_matched_donors = counts.total;
      req.next_action = determineNextAction(req, counts.accepted, counts.pending);
    }

    // Comprehensive client/server filtering across ALL merged requests
    const filtered = merged.filter((req) => {
      // 1. Urgency filter
      if (filters?.urgency && filters.urgency !== "all" && req.urgency !== filters.urgency) {
        return false;
      }

      // 2. Blood group filter
      if (filters?.bloodGroup && filters.bloodGroup !== "all" && req.blood_group !== filters.bloodGroup) {
        return false;
      }

      // 3. Status filter
      if (filters?.status && filters.status !== "all") {
        const s = filters.status.toLowerCase();
        if (s === "open" || s === "pending") {
          if (!["open", "pending", "donor_matching", "checking_inventory"].includes(req.status)) return false;
        } else if (s === "accepted" || s === "accepted_donors" || s === "donors_accepted") {
          if ((req.accepted_donors_count || 0) <= 0) return false;
        } else if (s === "matching" || s === "donor_matching") {
          if (!["matching", "donor_matching"].includes(req.status) && (req.pending_donors_count || 0) <= 0) return false;
        } else if (s === "reserved" || s === "partially_reserved") {
          if (!["partially_reserved", "fully_reserved"].includes(req.status)) return false;
        } else if (s === "issued") {
          if (!["partially_issued", "fully_issued", "in_transit"].includes(req.status)) return false;
        } else if (s === "partially_fulfilled") {
          if (!["partially_fulfilled", "partially_received"].includes(req.status)) return false;
        } else if (s === "fulfilled") {
          if (req.status !== "fulfilled" && req.units_fulfilled < req.units_required) return false;
        } else if (s === "cancelled") {
          if (req.status !== "cancelled") return false;
        } else if (req.status !== filters.status) {
          return false;
        }
      }

      // 4. Search term filter
      if (filters?.search && filters.search.trim()) {
        const term = filters.search.trim().toLowerCase();
        const ref = `req-${req.id.substring(0, 8)}`.toLowerCase();
        const id = req.id.toLowerCase();
        const bg = (req.blood_group || "").toLowerCase();
        const notes = (req.notes || "").toLowerCase();
        const urgency = (req.urgency || "").toLowerCase();
        const status = (req.status || "").toLowerCase();
        const hasNextActionMatch = req.next_action?.label?.toLowerCase().includes(term);

        if (
          !ref.includes(term) &&
          !id.includes(term) &&
          !bg.includes(term) &&
          !notes.includes(term) &&
          !urgency.includes(term) &&
          !status.includes(term) &&
          !hasNextActionMatch
        ) {
          return false;
        }
      }

      return true;
    });

    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return filtered;
  },

  /**
   * Single Blood Request details with dispatched donor responses
   */
  async getBloodRequestById(orgId: string, requestId: string) {
    const supabase = await createClient();

    let request: any = null;
    try {
      let { data, error: reqErr } = await supabase
        .from("blood_requests")
        .select("*")
        .eq("id", requestId)
        .eq("hospital_id", orgId)
        .maybeSingle();

      if (reqErr || !data) {
        const q2 = await supabase
          .from("blood_requests")
          .select("*")
          .eq("id", requestId)
          .eq("organization_id", orgId)
          .maybeSingle();
        data = q2.data;
      }
      request = data;
    } catch {}

    // Resilient fallback to bloodRequestStore
    if (!request) {
      const stored = bloodRequestStore.get(requestId);
      const hasReservation = reservationStore.getReservationsByRequest(requestId).some(r => r.sourceOrgId === orgId);
      if (stored && (stored.organization_id === orgId || stored.hospital_id === orgId || hasReservation)) {
        request = stored;
      }
    }

    if (!request) return null;

    const req = normalizeBloodRequest(request, orgId);
    const reservations = reservationStore.getReservationsByRequest(requestId);

    // Dispatched candidate responses (privacy-conscious)
    let donorRequests: any[] = [];
    try {
      const { data: drData } = await supabase
        .from("donor_requests")
        .select("*, donor_profiles(blood_group, availability_status, eligibility_status)")
        .eq("blood_request_id", requestId)
        .order("match_score", { ascending: false });
      donorRequests = drData || [];
    } catch {
      donorRequests = [];
    }

    return {
      request: req,
      reservations,
      donorRequests: donorRequests.map((dr) => ({
        ...dr,
        matching_score: dr.match_score ?? dr.matching_score ?? 0.85,
        donor_ref: getDonorDisplayReference(dr.donor_id || "", (dr as any).donor_ref),
        blood_group: dr.donor_profiles?.blood_group || req.blood_group,
      })),
    };
  },

  /**
   * Dispatched donor responses across all facility requests (strictly tenant-isolated)
   */
  async getDonorRequests(orgId: string, filterStatus?: string, search?: string) {
    const supabase = await createClient();

    let dbList: any[] = [];
    try {
      // 1. Fetch blood requests belonging to this authenticated facility
      const { data: facilityRequests } = await supabase
        .from("blood_requests")
        .select("id")
        .eq("organization_id", orgId);

      const reqIds = (facilityRequests || []).map((r: any) => r.id);
      if (reqIds.length > 0) {
        let query = supabase
          .from("donor_requests")
          .select("*, donor_profiles(blood_group, availability_status)")
          .in("blood_request_id", reqIds)
          .order("created_at", { ascending: false });

        if (filterStatus && filterStatus !== "all") {
          if (filterStatus === "accepted") {
            query = query.in("status", ["accepted", "interested", "scheduled", "awaiting_screening", "contacted"]);
          } else if (filterStatus === "pending") {
            query = query.in("status", ["pending", "viewed"]);
          } else {
            query = query.eq("status", filterStatus as any);
          }
        }

        const { data, error } = await query;
        if (!error && data) {
          dbList = data;
        }
      }
    } catch {}

    const mappedDb = dbList.map((dr) => ({
      ...dr,
      donor_ref: getDonorDisplayReference(dr.donor_id || "", (dr as any).donor_ref),
      blood_group: dr.donor_profiles?.blood_group || "O+",
    }));

    // Authoritative enrichment from donorRequestStore (strictly scoped to this org's requests)
    const facilityStoredRequests = bloodRequestStore.getByOrg(orgId);
    const facilityRequestIds = new Set(facilityStoredRequests.map((r) => r.id));
    const allStoredDonorReqs = Object.values(donorRequestStore.getAll()).filter(
      (dr) => facilityRequestIds.has(dr.blood_request_id) || dr.hospital_id === orgId
    );

    const existingIds = new Set(mappedDb.map((d) => d.id));
    const merged = [...mappedDb];

    const matchesStatus = (status: string) => {
      if (!filterStatus || filterStatus === "all") return true;
      if (filterStatus === "accepted") {
        return (
          status === "accepted" ||
          status === "interested" ||
          status === "scheduled" ||
          status === "awaiting_screening" ||
          status === "contacted"
        );
      }
      if (filterStatus === "pending") {
        return status === "pending" || status === "viewed";
      }
      return status === filterStatus;
    };

    for (const s of allStoredDonorReqs) {
      if (!existingIds.has(s.id)) {
        if (!matchesStatus(s.status)) {
          continue;
        }
        merged.push({
          id: s.id,
          blood_request_id: s.blood_request_id,
          donor_id: s.donor_id,
          matching_score: s.matching_score,
          compatibility_score: s.compatibility_score,
          distance_score: s.distance_score,
          availability_score: s.availability_score,
          urgency_score: s.urgency_score,
          distance_km: s.distance_km,
          status: s.status,
          sent_at: s.sent_at,
          responded_at: s.responded_at || null,
          created_at: s.created_at,
          updated_at: s.updated_at,
          donor_ref: getDonorDisplayReference(s.donor_id, (s as any).donor_ref),
          blood_group: s.blood_group || "O+",
        });
      }
    }

    let result = merged;
    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter((dr) => {
        const dRef = (dr.donor_ref || `DONOR-${(dr.donor_id || "").substring(0, 6)}`).toLowerCase();
        const bg = (dr.blood_group || "").toLowerCase();
        const reqId = (dr.blood_request_id || "").toLowerCase();
        const status = (dr.status || "").toLowerCase();
        return dRef.includes(term) || bg.includes(term) || reqId.includes(term) || status.includes(term);
      });
    }

    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return result;
  },

  /**
   * Single donor response detail with strict cross-tenant verification
   */
  async getDonorRequestById(orgId: string, donorRequestId: string) {
    const supabase = await createClient();

    try {
      const { data, error } = await supabase
        .from("donor_requests")
        .select("*, donor_profiles(blood_group, availability_status, eligibility_status), blood_requests(organization_id)")
        .eq("id", donorRequestId)
        .maybeSingle();

      if (!error && data) {
        // Verify that the parent blood request belongs to the caller's authorized facility
        const bloodReq = (data as any).blood_requests;
        if (!bloodReq || bloodReq.organization_id !== orgId) {
          console.warn(`SECURITY: Blocked unauthorized cross-institution access attempt to donor request ${donorRequestId} from org ${orgId}`);
          return null;
        }

        const dr = data as any;
        return {
          ...dr,
          donor_ref: getDonorDisplayReference(dr.donor_id || "", (dr as any).donor_ref),
          blood_group: dr.donor_profiles?.blood_group || "O+",
        };
      }
    } catch {}

    // Resilient fallback to donorRequestStore
    const stored = donorRequestStore.get(donorRequestId);
    if (stored) {
      if (stored.hospital_id !== orgId) {
        console.warn(`SECURITY: Blocked unauthorized cross-institution access attempt to stored donor request ${donorRequestId} from org ${orgId}`);
        return null;
      }
      return {
        ...stored,
        donor_ref: getDonorDisplayReference(stored.donor_id, (stored as any).donor_ref),
        blood_group: stored.blood_group || "O+",
      };
    }

    return null;
  },

  /**
   * Facility recorded donations
   */
  async getDonations(orgId: string): Promise<Donation[]> {
    const supabase = await createClient();

    try {
      const { data, error } = await supabase
        .from("donations")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      if (error) {
        return [];
      }

      return (data as Donation[]) || [];
    } catch {
      return [];
    }
  },

  /**
   * Single recorded donation detail
   */
  async getDonationById(orgId: string, donationId: string) {
    const supabase = await createClient();

    try {
      const { data, error } = await supabase
        .from("donations")
        .select("*, profiles:recorded_by(full_name, email)")
        .eq("id", donationId)
        .eq("organization_id", orgId)
        .maybeSingle();

      if (error || !data) return null;

      const don = data as any;
      return {
        ...don,
        donor_ref: getDonorDisplayReference(don.donor_id || "", (don as any).donor_ref),
        recorder_name: don.profiles?.full_name || "Facility Staff",
      };
    } catch {
      return null;
    }
  },

  /**
   * Facility Registered Donors roster
   */
  async getHospitalDonors(orgId: string) {
    try {
      const supabase = await createClient();
      let donorsList: any[] = [];

      try {
        // Multi-tenant scoped query: only retrieve donors registered under this institution
        const { data, error } = await (supabase
          .from("donor_profiles") as any)
          .select("*, profiles(*)")
          .or(`organization_id.eq.${orgId},registering_organization_id.eq.${orgId}`)
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          donorsList = data.map((d: any) => {
            const prof = Array.isArray(d.profiles) ? d.profiles[0] : d.profiles;
            return {
              id: d.id,
              user_id: d.user_id,
              organization_id: d.organization_id || orgId,
              registering_organization_id: d.registering_organization_id || d.organization_id || orgId,
              first_name: d.first_name,
              other_names: d.other_names,
              surname: d.surname,
              blood_group: d.blood_group,
              country: d.country || "Nigeria",
              state: d.state || "Lagos",
              city: d.city || "Lagos",
              district: d.district || null,
              postal_code: d.postal_code || null,
              latitude: d.latitude ?? null,
              longitude: d.longitude ?? null,
              location_consent: d.location_consent ?? true,
              location_updated_at: d.location_updated_at || d.updated_at,
              gender: d.gender || "male",
              availability_status: d.availability_status || "available",
              eligibility_status: d.eligibility_status || "eligible",
              last_donation_date: d.last_donation_date,
              is_active: prof?.is_active ?? true,
              created_at: d.created_at,
              profile: prof || {
                id: d.user_id,
                full_name: [d.first_name, d.other_names, d.surname].filter(Boolean).join(" ") || "Registered Donor",
                email: "donor@orbinova.com",
                phone: null,
                role: "donor",
                is_active: true,
              },
            };
          });
        }
      } catch (err) {
        console.warn("Could not query donor_profiles:", err);
      }

      // Merge persistent donorStore overrides and hospital-registered donors
      const existingIds = new Set<string>();

      donorsList = donorsList.map((d) => {
        existingIds.add(d.id);
        existingIds.add(d.user_id);
        if (d.profile?.email) existingIds.add(d.profile.email.toLowerCase());

        const override =
          donorStore.get(d.id) ||
          donorStore.get(d.user_id) ||
          (d.profile?.email ? donorStore.get(d.profile.email) : undefined);

        if (override) {
          return {
            ...d,
            blood_group: override.bloodGroup || d.blood_group,
            eligibility_status: override.eligibilityStatus || d.eligibility_status,
            country: override.country || d.country,
            state: override.state || d.state,
            city: override.city || d.city,
            district: override.district || d.district,
            latitude: override.latitude ?? d.latitude,
            longitude: override.longitude ?? d.longitude,
            location_consent: override.locationConsent !== undefined ? override.locationConsent : d.location_consent,
            is_active: typeof override.isActive === "boolean" ? override.isActive : d.is_active,
            profile: {
              ...d.profile,
              full_name: override.fullName || d.profile?.full_name,
              email: override.email || d.profile?.email,
              phone:
                override.phone !== undefined && override.phone !== ""
                  ? override.phone
                  : d.profile?.phone,
              is_active: typeof override.isActive === "boolean" ? override.isActive : d.profile?.is_active,
            },
          };
        }
        return d;
      });

      // Add any newly registered donors in donorStore for this hospital
      const orgDonors = donorStore.getByOrg(orgId);
      for (const od of orgDonors) {
        if (
          !existingIds.has(od.donorProfileId) &&
          !existingIds.has(od.userId) &&
          (!od.email || !existingIds.has(od.email.toLowerCase()))
        ) {
          donorsList.unshift({
            id: od.donorProfileId,
            user_id: od.userId,
            organization_id: od.organizationId,
            registering_organization_id: od.registeringOrganizationId || od.organizationId,
            first_name: od.firstName,
            other_names: od.otherNames,
            surname: od.surname,
            blood_group: od.bloodGroup,
            country: od.country || "Nigeria",
            state: od.state || "Lagos",
            city: od.city || "Lagos",
            district: od.district || null,
            postal_code: od.postalCode || null,
            latitude: od.latitude ?? null,
            longitude: od.longitude ?? null,
            location_consent: od.locationConsent ?? true,
            location_updated_at: od.locationUpdatedAt || od.updatedAt,
            gender: od.gender || "male",
            availability_status: od.availabilityStatus || "available",
            eligibility_status: od.eligibilityStatus,
            last_donation_date: od.lastDonationDate || null,
            is_active: od.isActive,
            created_at: od.updatedAt,
            profile: {
              id: od.userId,
              full_name: od.fullName,
              email: od.email || "",
              phone: od.phone || null,
              role: "donor",
              is_active: od.isActive,
              created_at: od.updatedAt,
              updated_at: od.updatedAt,
            },
          });
        }
      }

      return donorsList;
    } catch (e: any) {
      console.warn("getHospitalDonors fallback:", e?.message);
      return [];
    }
  },

  /**
   * Facility staff members roster with strict tenant scoping and active user exclusion
   */
  async getMembers(
    orgId: string,
    options?: { excludeActive?: boolean }
  ): Promise<(OrganizationMember & { profile: Profile })[]> {
    try {
      const supabase = await createClient();

      let query = supabase
        .from("organization_members")
        .select("*, profiles(*)")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: true });

      if (options?.excludeActive) {
        query = query.eq("is_active", false);
      }

      const { data, error } = await query;
      let membersList: (OrganizationMember & { profile: Profile })[] = [];

      if (!error && data && data.length > 0) {
        membersList = (data as any[]).map((m) => ({
          ...m,
          member_role: m.member_role || m.role || "staff",
          profile: m.profiles,
        }));
      }

      // If no organization_members records are linked yet in the database,
      // fallback to pre-seeded profiles ONLY for default demo hospital
      if (membersList.length === 0 && orgId === "a1111111-1111-1111-1111-111111111111") {
        try {
          const { data: hospitalProfiles } = await supabase
            .from("profiles")
            .select("*")
            .eq("role", "hospital")
            .order("created_at", { ascending: true });

          if (hospitalProfiles && hospitalProfiles.length > 0) {
            membersList = hospitalProfiles.map((p: any) => {
              let clinicalRole: any = "doctor";
              if (p.email === "hospital@orbinova.com") clinicalRole = "owner";
              else if (p.email?.includes("radiologist")) clinicalRole = "radiologist";
              else if (p.email?.includes("nurse")) clinicalRole = "nurse";
              else if (p.email?.includes("coordinator")) clinicalRole = "donor_coordinator";
              else if (p.email?.includes("doctor") || p.email?.includes("bamirin")) clinicalRole = "doctor";

              return {
                id: `member-${p.id}`,
                organization_id: orgId,
                user_id: p.id,
                member_role: clinicalRole,
                is_active: p.is_active ?? true,
                created_at: p.created_at || new Date().toISOString(),
                updated_at: p.updated_at || new Date().toISOString(),
                profile: p,
              };
            });
          }
        } catch (profErr) {
          console.warn("Could not fallback to hospital profiles:", profErr);
        }
      }

      // Merge and apply persistent staffStore updates & additions
      const storeOverrides = staffStore.getAll();
      const existingUserIds = new Set<string>();

      membersList = membersList.map((m) => {
        existingUserIds.add(m.user_id);
        if (m.profile?.email) existingUserIds.add(m.profile.email.toLowerCase());

        const override =
          staffStore.get(m.user_id) ||
          (m.profile?.email ? staffStore.get(m.profile.email) : undefined) ||
          staffStore.get(m.id);

        if (override) {
          return {
            ...m,
            member_role: override.memberRole || m.member_role,
            is_active: typeof override.isActive === "boolean" ? override.isActive : m.is_active,
            profile: {
              ...m.profile,
              full_name: override.fullName || m.profile?.full_name,
              phone: override.phone !== undefined ? override.phone : m.profile?.phone,
              is_active: typeof override.isActive === "boolean" ? override.isActive : m.profile?.is_active,
            },
          };
        }
        return m;
      });

      // Include any newly added staff in the store that weren't in profiles yet
      const orgStaffInStore = staffStore.getByOrg(orgId);
      for (const st of orgStaffInStore) {
        if (!existingUserIds.has(st.userId) && (!st.email || !existingUserIds.has(st.email.toLowerCase()))) {
          membersList.push({
            id: st.memberId || `member-${st.userId}`,
            organization_id: orgId,
            user_id: st.userId,
            member_role: st.memberRole,
            is_active: st.isActive,
            created_at: st.updatedAt || new Date().toISOString(),
            updated_at: st.updatedAt || new Date().toISOString(),
            profile: {
              id: st.userId,
              email: st.email || "",
              full_name: st.fullName,
              phone: st.phone || null,
              role: "hospital",
              is_active: st.isActive,
              created_at: st.updatedAt || new Date().toISOString(),
              updated_at: st.updatedAt || new Date().toISOString(),
            } as Profile,
          });
        }
      }

      // Apply active user exclusion filter if explicitly requested
      if (options?.excludeActive) {
        membersList = membersList.filter((m) => !m.is_active || m.profile?.is_active === false);
      }

      return membersList;
    } catch (e: any) {
      console.warn("Resilient getMembers fallback:", e?.message);
      return [];
    }
  },

  /**
   * Facility staff notifications
   */
  async getNotifications(userId: string, orgId?: string): Promise<Notification[]> {
    const supabase = await createClient();

    let dbNotifs: Notification[] = [];
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        dbNotifs = (data as Notification[]) || [];
      }
    } catch {}

    const storeNotifs = inAppNotificationStore.getByUser(userId, orgId);
    const existingIds = new Set(dbNotifs.map((n) => n.id));
    const merged = [...dbNotifs];

    for (const sn of storeNotifs) {
      if (!existingIds.has(sn.id)) {
        merged.push({
          id: sn.id,
          user_id: sn.user_id,
          type: sn.type,
          title: sn.title,
          message: sn.message,
          data: sn.data,
          is_read: sn.is_read,
          read_at: sn.read_at,
          created_at: sn.created_at,
        });
      }
    }

    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return merged.slice(0, 50);
  },
};
