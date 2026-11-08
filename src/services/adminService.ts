import { createClient, getCurrentUser } from "@/lib/supabase/server";
import {
  Profile,
  Organization,
  OrganizationMember,
  DonorProfile,
  BloodInventory,
  BloodInventoryTransaction,
  BloodRequest,
  Donation,
  Notification,
  AuditLog,
  MatchingRun,
  DonorRequest,
  UserRole,
  AdminRole,
  VerificationStatus,
  OrgType,
  RequestUrgency,
  RequestStatus,
  BloodGroupCode,
} from "@/types/database";

/**
 * Admin Service: High-performance data access layer for SmartDonor system administrators
 */
export const adminService = {
  /**
   * Aggregated operational metrics for Admin Dashboard
   */
  async getDashboardMetrics() {
    const supabase = await createClient();

    // Run parallel count and aggregation queries
    const [
      orgsCount,
      verifiedOrgsCount,
      pendingOrgsCount,
      suspendedOrgsCount,
      usersCount,
      activeUsersCount,
      donorsCount,
      staffCount,
      openRequestsCount,
      emergencyRequestsCount,
      completedDonationsCount,
      inventorySum,
      allRequestsRes,
      recentRequestsRes,
      recentDonationsRes,
      recentAuditLogsRes,
      pendingOrgsListRes,
    ] = await Promise.all([
      supabase.from("organizations").select("*", { count: "exact", head: true }),
      supabase.from("organizations").select("*", { count: "exact", head: true }).eq("verification_status", "verified"),
      supabase.from("organizations").select("*", { count: "exact", head: true }).eq("verification_status", "pending"),
      supabase.from("organizations").select("*", { count: "exact", head: true }).eq("verification_status", "suspended"),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "donor"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).in("role", ["hospital", "blood_bank"]),
      supabase.from("blood_requests").select("*", { count: "exact", head: true }).in("status", ["open", "matching", "partially_fulfilled"]),
      supabase.from("blood_requests").select("*", { count: "exact", head: true }).eq("urgency", "emergency").in("status", ["open", "matching", "partially_fulfilled"]),
      supabase.from("donations").select("*", { count: "exact", head: true }).eq("status", "completed"),
      supabase.from("blood_inventory").select("available_quantity, blood_group, quantity, reserved_quantity"),
      supabase.from("blood_requests").select("id, blood_group, units_required, units_fulfilled, status, urgency, created_at").order("created_at", { ascending: false }).limit(100),
      supabase.from("blood_requests").select("*, organizations(id, name, city, state, organization_type)").order("created_at", { ascending: false }).limit(8),
      supabase.from("donations").select("*, organizations(id, name, city, state), donor_profiles(blood_group, profiles:profiles!donor_profiles_user_id_fkey(full_name))").order("created_at", { ascending: false }).limit(8),
      supabase.from("audit_logs").select("*, profiles(full_name, email, role)").order("created_at", { ascending: false }).limit(8),
      supabase.from("organizations").select("id, name, organization_type, city, state, created_at").eq("verification_status", "pending").order("created_at", { ascending: false }).limit(5),
    ]);

    // Calculate total available units and check low-stock blood groups (threshold < 10 units)
    let totalAvailableUnits = 0;
    const stockByGroup: Record<string, number> = {
      "A+": 0, "A-": 0, "B+": 0, "B-": 0, "AB+": 0, "AB-": 0, "O+": 0, "O-": 0,
    };

    if (inventorySum.data) {
      for (const item of (inventorySum.data as any[])) {
        const avail = item.available_quantity || 0;
        totalAvailableUnits += avail;
        stockByGroup[item.blood_group] = (stockByGroup[item.blood_group] || 0) + avail;
      }
    }

    const lowStockGroups = Object.entries(stockByGroup)
      .filter(([_, qty]) => qty < 10)
      .map(([bg, qty]) => ({ bloodGroup: bg, available: qty }));

    const criticalStockGroups = Object.entries(stockByGroup)
      .filter(([_, qty]) => qty < 3)
      .map(([bg, qty]) => ({ bloodGroup: bg, available: qty }));

    // 1. Blood Group Demand from requests
    const demandByGroup: Record<string, number> = {
      "A+": 0, "A-": 0, "B+": 0, "B-": 0, "AB+": 0, "AB-": 0, "O+": 0, "O-": 0,
    };
    const statusCounts: Record<string, number> = {
      open: 0, matching: 0, partially_fulfilled: 0, fulfilled: 0, cancelled: 0, expired: 0,
    };

    const allRequests = (allRequestsRes.data as any[]) || [];
    for (const req of allRequests) {
      if (req.blood_group && demandByGroup[req.blood_group] !== undefined) {
        demandByGroup[req.blood_group] += req.units_required || 1;
      }
      if (req.status && statusCounts[req.status] !== undefined) {
        statusCounts[req.status] += 1;
      }
    }

    // 2. Aggregate 7-day request volume & donation volume
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const now = new Date();
    const last7Days: { label: string; dateStr: string; requests: number; donations: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const label = i === 0 ? "Today" : dayNames[d.getDay()];
      last7Days.push({ label, dateStr: iso, requests: 0, donations: 0 });
    }

    for (const req of allRequests) {
      const reqDate = (req.created_at || "").slice(0, 10);
      const day = last7Days.find((d) => d.dateStr === reqDate);
      if (day) day.requests += 1;
    }

    const allDonations = (recentDonationsRes.data as any[]) || [];
    for (const don of allDonations) {
      const donDate = (don.donation_date || don.created_at || "").slice(0, 10);
      const day = last7Days.find((d) => d.dateStr === donDate);
      if (day) day.donations += don.units_donated || 1;
    }

    // 3. Structured Critical Alerts List
    const alerts: Array<{
      id: string;
      type: "emergency" | "inventory" | "verification" | "donor";
      title: string;
      description: string;
      href: string;
      timestamp: string;
      urgencyLevel: "critical" | "warning" | "info";
    }> = [];

    // Emergency Requests
    const emergencyList = allRequests.filter((r) => r.urgency === "emergency" && ["open", "matching"].includes(r.status));
    if (emergencyList.length > 0) {
      alerts.push({
        id: "alert-emergencies",
        type: "emergency",
        title: `${emergencyList.length} Emergency Blood Request${emergencyList.length > 1 ? "s" : ""}`,
        description: `Immediate life-threatening transfusions awaiting fulfillment.`,
        href: "/admin/blood-requests?urgency=emergency",
        timestamp: "Live Priority",
        urgencyLevel: "critical",
      });
    }

    // Critical Inventory Alerts
    if (criticalStockGroups.length > 0) {
      alerts.push({
        id: "alert-critical-stock",
        type: "inventory",
        title: `Critical Reserve Deficit (${criticalStockGroups.map((g) => g.bloodGroup).join(", ")})`,
        description: `${criticalStockGroups.length} blood group${criticalStockGroups.length > 1 ? "s" : ""} below 3 reserve units.`,
        href: "/admin/inventory?status=critical",
        timestamp: "Immediate Action",
        urgencyLevel: "critical",
      });
    }

    // Pending Organization Verifications
    const pendingOrgs = (pendingOrgsListRes.data as any[]) || [];
    if (pendingOrgs.length > 0) {
      alerts.push({
        id: "alert-pending-orgs",
        type: "verification",
        title: `${pendingOrgs.length} Organization Verification${pendingOrgs.length > 1 ? "s" : ""}`,
        description: `${pendingOrgs[0]?.name || "Facility"} and others awaiting clinical certification.`,
        href: "/admin/organizations?status=pending",
        timestamp: "Review Required",
        urgencyLevel: "warning",
      });
    }

    // 4. Combined Recent Activity Stream
    const recentActivity: Array<{
      id: string;
      type: "request" | "donation" | "audit";
      title: string;
      description: string;
      timestamp: string;
    }> = [];

    const recentReqs = (recentRequestsRes.data as any[]) || [];
    recentReqs.slice(0, 3).forEach((r) => {
      recentActivity.push({
        id: `act-req-${r.id}`,
        type: "request",
        title: `New blood request created (${r.blood_group})`,
        description: `${r.organizations?.name || "Facility"} requested ${r.units_required} unit(s) • ${r.urgency?.toUpperCase()}`,
        timestamp: r.created_at,
      });
    });

    recentDonationsRes.data?.slice(0, 3).forEach((d: any) => {
      recentActivity.push({
        id: `act-don-${d.id}`,
        type: "donation",
        title: `Donation completed (${d.blood_group})`,
        description: `${d.donor_profiles?.profiles?.full_name || "Hero Donor"} provided ${d.units_donated} unit(s) to ${d.organizations?.name || "Facility"}`,
        timestamp: d.created_at,
      });
    });

    recentAuditLogsRes.data?.slice(0, 3).forEach((a: any) => {
      recentActivity.push({
        id: `act-aud-${a.id}`,
        type: "audit",
        title: `${a.action?.replace(/_/g, " ").toUpperCase()}`,
        description: `${a.profiles?.full_name || "System Operator"} • ${a.entity_type}`,
        timestamp: a.created_at,
      });
    });

    // Sort combined activities by timestamp descending
    recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      organizations: {
        total: orgsCount.count || 0,
        verified: verifiedOrgsCount.count || 0,
        pending: pendingOrgsCount.count || 0,
        suspended: suspendedOrgsCount.count || 0,
      },
      users: {
        total: usersCount.count || 0,
        active: activeUsersCount.count || 0,
        donors: donorsCount.count || 0,
        staff: staffCount.count || 0,
      },
      bloodOperations: {
        openRequests: openRequestsCount.count || 0,
        emergencyRequests: emergencyRequestsCount.count || 0,
        completedDonations: completedDonationsCount.count || 0,
      },
      inventory: {
        totalAvailableUnits,
        stockByGroup,
        lowStockCount: lowStockGroups.length,
        criticalStockCount: criticalStockGroups.length,
        lowStockGroups,
        criticalStockGroups,
      },
      analytics: {
        weeklyTrend: last7Days,
        demandByGroup,
        statusCounts,
      },
      alerts,
      recentActivity: recentActivity.slice(0, 6),
      recentRequests: (recentRequestsRes.data as any[]) || [],
      recentDonations: (recentDonationsRes.data as any[]) || [],
    };
  },

  /**
   * Organizations List with Filtering & Pagination
   */
  async getOrganizations(params?: {
    search?: string;
    type?: OrgType | "all";
    status?: VerificationStatus | "all";
    isActive?: boolean | "all";
    page?: number;
    pageSize?: number;
  }) {
    const supabase = await createClient();
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("organizations")
      .select("*, profiles!organizations_verified_by_fkey(full_name)", { count: "exact" });

    if (params?.search?.trim()) {
      const s = `%${params.search.trim()}%`;
      query = query.or(`name.ilike.${s},email.ilike.${s},city.ilike.${s},state.ilike.${s}`);
    }

    if (params?.type && params.type !== "all") {
      query = query.eq("organization_type", params.type);
    }

    if (params?.status && params.status !== "all") {
      query = query.eq("verification_status", params.status);
    }

    if (params?.isActive !== undefined && params.isActive !== "all") {
      query = query.eq("is_active", params.isActive);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    return {
      data: ((data as any[]) || []) as Organization[],
      totalCount: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
      error: error?.message,
    };
  },

  /**
   * Organization Details with Members and Stats
   */
  async getOrganizationById(id: string) {
    const supabase = await createClient();

    const [orgRes, membersRes, inventoryRes, requestsRes] = await Promise.all([
      supabase
        .from("organizations")
        .select("*, profiles!organizations_verified_by_fkey(full_name, email)")
        .eq("id", id)
        .single(),
      supabase
        .from("organization_members")
        .select("*, profiles(id, full_name, email, phone, role, is_active)")
        .eq("organization_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("blood_inventory")
        .select("*")
        .eq("organization_id", id)
        .order("blood_group", { ascending: true }),
      supabase
        .from("blood_requests")
        .select("*")
        .eq("organization_id", id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    return {
      organization: (orgRes.data as any) as Organization | null,
      members: (membersRes.data as any[]) || [],
      inventory: ((inventoryRes.data as any[]) || []) as BloodInventory[],
      recentRequests: ((requestsRes.data as any[]) || []) as BloodRequest[],
      error: orgRes.error?.message,
    };
  },

  /**
   * Users List with Filtering & Pagination
   * totalCount includes all system users; data excludes the currently authenticated account at DB level
   */
  async getUsers(params?: {
    search?: string;
    role?: UserRole | "all";
    isActive?: boolean | "all";
    excludeUserId?: string;
    excludeCurrent?: boolean;
    page?: number;
    pageSize?: number;
  }) {
    const supabase = await createClient();
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // 1. Total count query (counts all matching system users including current)
    let countQuery = supabase.from("profiles").select("*", { count: "exact", head: true });

    if (params?.search?.trim()) {
      const s = `%${params.search.trim()}%`;
      countQuery = countQuery.or(`full_name.ilike.${s},email.ilike.${s},phone.ilike.${s}`);
    }

    if (params?.role && params.role !== "all") {
      countQuery = countQuery.eq("role", params.role);
    }

    if (params?.isActive !== undefined && params.isActive !== "all") {
      countQuery = countQuery.eq("is_active", params.isActive);
    }

    // 2. Data query (excludes currently authenticated user at database level)
    let dataQuery = supabase.from("profiles").select("*");

    let excludeId = params?.excludeUserId;
    if (!excludeId && params?.excludeCurrent !== false) {
      const currentUser = await getCurrentUser();
      if (currentUser?.id) {
        excludeId = currentUser.id;
      }
    }

    if (excludeId) {
      dataQuery = dataQuery.neq("id", excludeId);
    }

    if (params?.search?.trim()) {
      const s = `%${params.search.trim()}%`;
      dataQuery = dataQuery.or(`full_name.ilike.${s},email.ilike.${s},phone.ilike.${s}`);
    }

    if (params?.role && params.role !== "all") {
      dataQuery = dataQuery.eq("role", params.role);
    }

    if (params?.isActive !== undefined && params.isActive !== "all") {
      dataQuery = dataQuery.eq("is_active", params.isActive);
    }

    const [{ count, error: countErr }, { data, error: dataErr }] = await Promise.all([
      countQuery,
      dataQuery.order("created_at", { ascending: false }).range(from, to),
    ]);

    return {
      data: ((data as any[]) || []) as Profile[],
      totalCount: count || 0,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
      error: dataErr?.message || countErr?.message,
    };
  },

  /**
   * User Details by ID with Linked Roles/Organizations
   */
  async getUserById(id: string) {
    const supabase = await createClient();

    const [userRes, orgMembershipRes, donorProfileRes, auditRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).single(),
      supabase
        .from("organization_members")
        .select("*, organizations(id, name, organization_type, city, state, verification_status)")
        .eq("user_id", id),
      supabase.from("donor_profiles").select("*").eq("user_id", id).maybeSingle(),
      supabase
        .from("audit_logs")
        .select("*")
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    return {
      user: (userRes.data as any) as Profile | null,
      memberships: (orgMembershipRes.data as any[]) || [],
      donorProfile: (donorProfileRes.data as any) as DonorProfile | null,
      recentAuditLogs: ((auditRes.data as any[]) || []) as AuditLog[],
      error: userRes.error?.message,
    };
  },

  /**
   * Dedicated Administrators List with Role Hierarchy & Permissions
   * totalCount includes all system admins; data excludes the currently authenticated admin at DB level
   */
  async getAdmins(params?: {
    search?: string;
    adminRole?: AdminRole | "all";
    isActive?: boolean | "all";
    excludeUserId?: string;
    excludeCurrent?: boolean;
    page?: number;
    pageSize?: number;
  }) {
    const supabase = await createClient();
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // 1. Total count query (counts all matching platform admins including current)
    let countQuery = supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");

    if (params?.search?.trim()) {
      const s = `%${params.search.trim()}%`;
      countQuery = countQuery.or(`full_name.ilike.${s},email.ilike.${s},phone.ilike.${s}`);
    }

    if (params?.adminRole && params.adminRole !== "all") {
      countQuery = countQuery.eq("admin_role", params.adminRole);
    }

    if (params?.isActive !== undefined && params.isActive !== "all") {
      countQuery = countQuery.eq("is_active", params.isActive);
    }

    // 2. Data query (excludes currently authenticated administrator at database level)
    let dataQuery = supabase
      .from("profiles")
      .select("*")
      .eq("role", "admin");

    let excludeId = params?.excludeUserId;
    if (!excludeId && params?.excludeCurrent !== false) {
      const currentUser = await getCurrentUser();
      if (currentUser?.id) {
        excludeId = currentUser.id;
      }
    }

    if (excludeId) {
      dataQuery = dataQuery.neq("id", excludeId);
    }

    if (params?.search?.trim()) {
      const s = `%${params.search.trim()}%`;
      dataQuery = dataQuery.or(`full_name.ilike.${s},email.ilike.${s},phone.ilike.${s}`);
    }

    if (params?.adminRole && params.adminRole !== "all") {
      dataQuery = dataQuery.eq("admin_role", params.adminRole);
    }

    if (params?.isActive !== undefined && params.isActive !== "all") {
      dataQuery = dataQuery.eq("is_active", params.isActive);
    }

    const [{ count, error: countErr }, { data, error: dataErr }] = await Promise.all([
      countQuery,
      dataQuery.order("created_at", { ascending: false }).range(from, to),
    ]);

    return {
      data: ((data as any[]) || []) as Profile[],
      totalCount: count || 0,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
      error: dataErr?.message || countErr?.message,
    };
  },

  /**
   * Donors List with Strict Role Isolation & Filtering
   * totalCount includes all system donors; data excludes the currently authenticated account at DB level
   */
  async getDonors(params?: {
    search?: string;
    bloodGroup?: BloodGroupCode | "all";
    availability?: string | "all";
    eligibility?: string | "all";
    status?: VerificationStatus | "all";
    state?: string;
    excludeUserId?: string;
    excludeCurrent?: boolean;
    page?: number;
    pageSize?: number;
  }) {
    const supabase = await createClient();
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // 1. Total count query (counts all matching platform donors including current)
    let countQuery = supabase
      .from("donor_profiles")
      .select("*, profiles:profiles!donor_profiles_user_id_fkey!inner(id, role)", { count: "exact", head: true })
      .eq("profiles.role", "donor");

    if (params?.search?.trim()) {
      const s = `%${params.search.trim()}%`;
      countQuery = countQuery.or(`city.ilike.${s},state.ilike.${s}`);
    }

    if (params?.bloodGroup && params.bloodGroup !== "all") {
      countQuery = countQuery.eq("blood_group", params.bloodGroup);
    }

    if (params?.availability && params.availability !== "all") {
      countQuery = countQuery.eq("availability_status", params.availability as any);
    }

    if (params?.eligibility && params.eligibility !== "all") {
      countQuery = countQuery.eq("eligibility_status", params.eligibility as any);
    }

    if (params?.status && params.status !== "all") {
      countQuery = countQuery.eq("verification_status", params.status);
    }

    if (params?.state?.trim()) {
      countQuery = countQuery.eq("state", params.state.trim());
    }

    // 2. Data query (excludes currently authenticated donor at database level)
    let dataQuery = supabase
      .from("donor_profiles")
      .select("*, profiles:profiles!donor_profiles_user_id_fkey!inner(id, full_name, email, role, is_active)")
      .eq("profiles.role", "donor");

    let excludeId = params?.excludeUserId;
    if (!excludeId && params?.excludeCurrent !== false) {
      const currentUser = await getCurrentUser();
      if (currentUser?.id) {
        excludeId = currentUser.id;
      }
    }

    if (excludeId) {
      dataQuery = dataQuery.neq("user_id", excludeId);
    }

    if (params?.search?.trim()) {
      const s = `%${params.search.trim()}%`;
      dataQuery = dataQuery.or(`city.ilike.${s},state.ilike.${s}`);
    }

    if (params?.bloodGroup && params.bloodGroup !== "all") {
      dataQuery = dataQuery.eq("blood_group", params.bloodGroup);
    }

    if (params?.availability && params.availability !== "all") {
      dataQuery = dataQuery.eq("availability_status", params.availability as any);
    }

    if (params?.eligibility && params.eligibility !== "all") {
      dataQuery = dataQuery.eq("eligibility_status", params.eligibility as any);
    }

    if (params?.status && params.status !== "all") {
      dataQuery = dataQuery.eq("verification_status", params.status);
    }

    if (params?.state?.trim()) {
      dataQuery = dataQuery.eq("state", params.state.trim());
    }

    const [{ count, error: countErr }, { data, error: dataErr }] = await Promise.all([
      countQuery,
      dataQuery.order("created_at", { ascending: false }).range(from, to),
    ]);

    return {
      data: (data as any[]) || [],
      totalCount: count || 0,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
      error: dataErr?.message || countErr?.message,
    };
  },


  /**
   * Donor Details with Donation History & Availability
   */
  async getDonorById(id: string) {
    const supabase = await createClient();

    // Check by donor_profiles.id first, or by user_id if not found
    let donorRes = await supabase
      .from("donor_profiles")
      .select("*, profiles:profiles!donor_profiles_user_id_fkey(id, full_name, email, phone, is_active, created_at)")
      .eq("id", id)
      .maybeSingle();

    if (!donorRes.data) {
      donorRes = await supabase
        .from("donor_profiles")
        .select("*, profiles:profiles!donor_profiles_user_id_fkey(id, full_name, email, phone, is_active, created_at)")
        .eq("user_id", id)
        .maybeSingle();
    }

    const donorId = (donorRes.data as any)?.id || id;

    const [donationsRes, availabilityRes] = await Promise.all([
      supabase
        .from("donations")
        .select("*, organizations(name, city, state)")
        .eq("donor_id", donorId)
        .order("donation_date", { ascending: false }),
      supabase
        .from("donor_availability_history")
        .select("*")
        .eq("donor_id", donorId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    return {
      donor: (donorRes.data as any),
      donations: (donationsRes.data as any[]) || [],
      availabilityHistory: (availabilityRes.data as any[]) || [],
      error: donorRes.error?.message,
    };
  },


  /**
   * Blood Requests List with Filters
   */
  async getBloodRequests(params?: {
    search?: string;
    bloodGroup?: BloodGroupCode | "all";
    urgency?: RequestUrgency | "all";
    status?: RequestStatus | "all";
    organizationId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const supabase = await createClient();
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("blood_requests")
      .select("*, organizations(id, name, city, state, organization_type), profiles!blood_requests_requested_by_fkey(full_name)", { count: "exact" });

    if (params?.bloodGroup && params.bloodGroup !== "all") {
      query = query.eq("blood_group", params.bloodGroup);
    }

    if (params?.urgency && params.urgency !== "all") {
      query = query.eq("urgency", params.urgency);
    }

    if (params?.status && params.status !== "all") {
      query = query.eq("status", params.status);
    }

    if (params?.organizationId) {
      query = query.eq("organization_id", params.organizationId);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    return {
      data: (data as any[]) || [],
      totalCount: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
      error: error?.message,
    };
  },

  /**
   * Blood Request Details with Matching Runs and Donor Requests
   */
  async getBloodRequestById(id: string) {
    const supabase = await createClient();

    const [requestRes, matchingRunsRes, donorRequestsRes] = await Promise.all([
      supabase
        .from("blood_requests")
        .select("*, organizations(id, name, email, phone, city, state, address), profiles!blood_requests_requested_by_fkey(full_name, email)")
        .eq("id", id)
        .single(),
      supabase
        .from("matching_runs")
        .select("*")
        .eq("blood_request_id", id)
        .order("executed_at", { ascending: false }),
      supabase
        .from("donor_requests")
        .select("*, donor_profiles(id, blood_group, city, state)")
        .eq("blood_request_id", id)
        .order("matching_score", { ascending: false }),
    ]);

    return {
      request: (requestRes.data as any),
      matchingRuns: ((matchingRunsRes.data as any[]) || []) as MatchingRun[],
      donorRequests: (donorRequestsRes.data as any[]) || [],
      error: requestRes.error?.message,
    };
  },

  /**
   * Global Blood Inventory with Organization Matrix
   */
  async getInventory(params?: {
    organizationId?: string;
    bloodGroup?: BloodGroupCode | "all";
    status?: "all" | "critical" | "low" | "healthy";
    page?: number;
    pageSize?: number;
  }) {
    const supabase = await createClient();
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("blood_inventory")
      .select("*, organizations(id, name, city, state, organization_type)", { count: "exact" });

    if (params?.organizationId) {
      query = query.eq("organization_id", params?.organizationId);
    }

    if (params?.bloodGroup && params.bloodGroup !== "all") {
      query = query.eq("blood_group", params.bloodGroup);
    }

    const { data, count, error } = await query
      .order("quantity", { ascending: true })
      .range(from, to);

    // Filter by stock health status if requested
    let filteredData = (data as any[]) || [];
    if (params?.status && params.status !== "all") {
      filteredData = filteredData.filter((item) => {
        const avail = item.available_quantity || 0;
        if (params.status === "critical") return avail < 3;
        if (params.status === "low") return avail >= 3 && avail < 10;
        if (params.status === "healthy") return avail >= 10;
        return true;
      });
    }

    return {
      data: filteredData,
      totalCount: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
      error: error?.message,
    };
  },

  /**
   * Inventory Transactions History
   */
  async getInventoryTransactions(params?: {
    organizationId?: string;
    limit?: number;
  }) {
    const supabase = await createClient();
    const limit = params?.limit || 25;

    let query = supabase
      .from("blood_inventory_transactions")
      .select("*, organizations(name), profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (params?.organizationId) {
      query = query.eq("organization_id", params.organizationId);
    }

    const { data, error } = await query;
    return {
      transactions: (data as any[]) || [],
      error: error?.message,
    };
  },

  /**
   * Platform Donations List
   */
  async getDonations(params?: {
    search?: string;
    bloodGroup?: BloodGroupCode | "all";
    status?: string | "all";
    organizationId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const supabase = await createClient();
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("donations")
      .select("*, organizations(id, name, city, state), donor_profiles(id, blood_group, city, state, profiles:profiles!donor_profiles_user_id_fkey(full_name)), profiles!donations_recorded_by_fkey(full_name)", { count: "exact" });


    if (params?.bloodGroup && params.bloodGroup !== "all") {
      query = query.eq("blood_group", params.bloodGroup);
    }

    if (params?.status && params.status !== "all") {
      query = query.eq("status", params.status as any);
    }

    if (params?.organizationId) {
      query = query.eq("organization_id", params.organizationId);
    }

    const { data, count, error } = await query
      .order("donation_date", { ascending: false })
      .range(from, to);

    return {
      data: (data as any[]) || [],
      totalCount: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
      error: error?.message,
    };
  },

  /**
   * Admin Notifications
   */
  async getNotifications(userId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    const unreadCount = ((data as any[]) || []).filter((n) => !n.is_read).length || 0;

    return {
      notifications: (((data as any[]) || []) as Notification[]),
      unreadCount,
      error: error?.message,
    };
  },

  /**
   * Audit Logs with Filtering
   */
  async getAuditLogs(params?: {
    search?: string;
    action?: string;
    entityType?: string;
    userId?: string;
    organizationId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const supabase = await createClient();
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 15;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("audit_logs")
      .select("*, profiles(full_name, email, role), organizations(name)", { count: "exact" });

    if (params?.action?.trim()) {
      query = query.ilike("action", `%${params.action.trim()}%`);
    }

    if (params?.entityType && params.entityType !== "all") {
      query = query.eq("entity_type", params.entityType);
    }

    if (params?.userId) {
      query = query.eq("user_id", params.userId);
    }

    if (params?.organizationId) {
      query = query.eq("organization_id", params.organizationId);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    return {
      data: (data as any[]) || [],
      totalCount: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
      error: error?.message,
    };
  },
};
