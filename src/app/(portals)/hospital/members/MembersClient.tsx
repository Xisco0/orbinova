"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  UserPlus,
  Search,
  Building2,
  Clock,
  CheckCircle2,
  PauseCircle,
  UserCog,
  Edit3,
  Mail,
  Phone,
  Shield,
  UserCheck,
  KeyRound,
} from "lucide-react";
import {
  OrganizationMember,
  Profile,
  OrgType,
  GranularMemberRole,
} from "@/types/database";
import { updateMemberRoleAction, toggleMemberActiveAction } from "@/actions";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Button,
  Avatar,
} from "@/components/ui";
import { InviteStaffModal } from "@/components/shared/InviteStaffModal";
import { EditStaffModal } from "@/components/shared/EditStaffModal";
import { EditPersonalProfileModal } from "@/components/hospital/EditPersonalProfileModal";

export interface CurrentUserProfileData {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  role: string;
  isActive: boolean;
  organizationName: string;
  organizationType: OrgType;
}

interface MembersClientProps {
  members: (OrganizationMember & { profile: Profile })[];
  currentUser?: CurrentUserProfileData;
  isOwner: boolean;
  isManager: boolean;
  currentUserId: string;
  organizationId: string;
  organizationType: OrgType;
  organizationName?: string;
}

export function MembersClient({
  members,
  currentUser,
  isOwner,
  isManager,
  currentUserId,
  organizationId,
  organizationType,
  organizationName = "Facility Roster",
}: MembersClientProps) {
  const router = useRouter();

  // Local state for personal profile
  const [myProfile, setMyProfile] = useState<CurrentUserProfileData>(
    currentUser || {
      id: currentUserId,
      userId: currentUserId,
      email: "hospital@orbinova.com",
      fullName: "Hospital Administrator",
      phone: null,
      avatarUrl: null,
      role: isOwner ? "owner" : "hospital",
      isActive: true,
      organizationName,
      organizationType,
    }
  );

  const [memberList, setMemberList] = useState<(OrganizationMember & { profile: Profile })[]>(members);
  const [loadingMemberId, setLoadingMemberId] = useState<string | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMyProfileModalOpen, setIsMyProfileModalOpen] = useState(false);
  const [selectedMemberForEdit, setSelectedMemberForEdit] = useState<(OrganizationMember & { profile: Profile }) | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");

  useEffect(() => {
    setMemberList(members);
  }, [members]);

  useEffect(() => {
    if (currentUser) {
      setMyProfile(currentUser);
    }
  }, [currentUser]);

  const handleOpenEdit = (m: (OrganizationMember & { profile: Profile })) => {
    setSelectedMemberForEdit(m);
    setIsEditModalOpen(true);
  };

  const handleMemberUpdated = (updated: {
    id: string;
    userId: string;
    fullName: string;
    phone?: string;
    memberRole: GranularMemberRole;
    isActive: boolean;
  }) => {
    setMemberList((prev) =>
      prev.map((m) => {
        if (m.id === updated.id || m.user_id === updated.userId) {
          return {
            ...m,
            member_role: updated.memberRole,
            role: updated.memberRole,
            is_active: updated.isActive,
            profile: {
              ...m.profile,
              full_name: updated.fullName,
              phone: updated.phone !== undefined ? updated.phone : m.profile?.phone,
              is_active: updated.isActive,
            },
          };
        }
        return m;
      })
    );
    router.refresh();
  };

  const handleMemberAdded = (newMember: {
    fullName: string;
    email: string;
    phone?: string;
    role: GranularMemberRole;
    isActive?: boolean;
  }) => {
    const tempId = `member-${Date.now()}`;
    const newRecord: OrganizationMember & { profile: Profile } = {
      id: tempId,
      organization_id: organizationId,
      user_id: tempId,
      member_role: newMember.role,
      is_active: newMember.isActive ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      profile: {
        id: tempId,
        email: newMember.email,
        full_name: newMember.fullName,
        phone: newMember.phone || null,
        role: organizationType,
        is_active: newMember.isActive ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Profile,
    };

    setMemberList((prev) => {
      const filtered = prev.filter(
        (p) => p.profile?.email?.toLowerCase() !== newMember.email.toLowerCase()
      );
      return [newRecord, ...filtered];
    });

    router.refresh();
  };

  const handleToggleActive = async (memberId: string, currentActive: boolean) => {
    setLoadingMemberId(memberId);
    const newActive = !currentActive;

    // Instant optimistic update in table
    setMemberList((prev) =>
      prev.map((m) => {
        const matches =
          m.id === memberId ||
          m.user_id === memberId ||
          `member-${m.user_id}` === memberId ||
          m.id === `member-${memberId}` ||
          (memberId.startsWith("member-") && m.user_id === memberId.replace("member-", ""));

        if (matches) {
          return {
            ...m,
            is_active: newActive,
            profile: {
              ...m.profile,
              is_active: newActive,
            },
          };
        }
        return m;
      })
    );

    const res = await toggleMemberActiveAction(memberId, newActive);
    setLoadingMemberId(null);

    if (!res.success) {
      // Revert if action failed
      setMemberList((prev) =>
        prev.map((m) => {
          const matches =
            m.id === memberId ||
            m.user_id === memberId ||
            `member-${m.user_id}` === memberId ||
            m.id === `member-${memberId}` ||
            (memberId.startsWith("member-") && m.user_id === memberId.replace("member-", ""));

          if (matches) {
            return {
              ...m,
              is_active: currentActive,
              profile: {
                ...m.profile,
                is_active: currentActive,
              },
            };
          }
          return m;
        })
      );
    }

    router.refresh();
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner":
        return "primary";
      case "manager":
        return "secondary";
      case "doctor":
        return "accent";
      case "radiologist":
        return "warning";
      case "donor_coordinator":
        return "blood";
      case "nurse":
        return "success";
      default:
        return "default";
    }
  };

  const formatRoleLabel = (role: string) => {
    switch (role) {
      case "owner":
        return "Hospital Owner";
      case "administrator":
      case "manager":
      case "hospital_admin":
        return "Hospital Administrator";
      case "donor_coordinator":
        return "Donor Coordinator";
      case "clinical_staff":
      case "doctor":
      case "nurse":
      case "hospital_staff":
      case "staff":
        return "Clinical Staff";
      case "radiologist":
        return "Radiologist";
      case "inventory_officer":
        return "Inventory Officer";
      case "blood_bank_technician":
        return "Laboratory Tech";
      case "distribution_officer":
        return "Distribution Officer";
      default:
        return "Clinical Staff";
    }
  };

  // Requirement: Strictly remove currently logged-in user from the staff table list
  const scopedMembers = memberList.filter((m) => {
    const isCurrentLoggedInUser =
      m.user_id === currentUserId ||
      (myProfile.email && m.profile?.email?.toLowerCase() === myProfile.email.toLowerCase());

    if (isCurrentLoggedInUser) return false;

    // Subordinate staff profiles must NEVER see the owner's details
    if (!isOwner) {
      const isOwnerRole = (m as any).member_role === "owner" || (m as any).role === "owner";
      const isFacilityOwnerEmail = m.profile?.email === "hospital@orbinova.com";
      if (isOwnerRole || isFacilityOwnerEmail) return false;
    }

    return true;
  });

  const activeCount = scopedMembers.filter((m) => m.is_active && m.profile?.is_active !== false).length;
  const suspendedCount = scopedMembers.filter((m) => !m.is_active || m.profile?.is_active === false).length;

  const filteredMembers = scopedMembers.filter((m) => {
    const q = searchQuery.toLowerCase().trim();
    const name = m.profile?.full_name?.toLowerCase() || "";
    const email = m.profile?.email?.toLowerCase() || "";
    const role = ((m as any).member_role || "").toLowerCase();
    const matchesSearch = !q || name.includes(q) || email.includes(q) || role.includes(q);

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && m.is_active && m.profile?.is_active !== false) ||
      (statusFilter === "suspended" && (!m.is_active || m.profile?.is_active === false));

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* =========================================================================
          TOP SECTION: MY PERSONAL PROFILE (Hospital / Facility Administrator)
          ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-primary-950 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-800 relative overflow-hidden">
        {/* Soft Ambient Radiance */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Left: User Avatar & Personal Details */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="relative shrink-0">
              <Avatar
                name={myProfile.fullName}
                src={myProfile.avatarUrl || undefined}
                size="lg"
                className="w-16 h-16 rounded-2xl border-2 border-white/20 shadow-lg text-lg font-bold bg-primary-600 text-white"
              />
              <span
                className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-slate-900 rounded-full shadow-xs"
                title="Account Active"
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-poppins font-bold text-lg sm:text-xl text-white tracking-tight truncate">
                  {myProfile.fullName}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-white text-[11px] font-bold font-inter tracking-wide uppercase">
                  (You)
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-primary-500/20 text-primary-300 border border-primary-500/30 text-xs font-semibold font-inter whitespace-nowrap">
                  {formatRoleLabel(myProfile.role)}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 text-[11px] font-semibold font-inter">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Active
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-300 font-inter">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{myProfile.email}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {myProfile.phone ? (
                    <span>{myProfile.phone}</span>
                  ) : (
                    <span className="text-slate-400 italic">No contact phone added</span>
                  )}
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-400">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-200">{myProfile.organizationName}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right: Personal Profile Update & Change Password Triggers */}
          <div className="shrink-0 flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsMyProfileModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-medium text-xs sm:text-sm font-inter transition-all border border-white/15 cursor-pointer shadow-sm hover:shadow flex-1 sm:flex-initial"
            >
              <UserCog className="w-4 h-4 text-primary-300" />
              <span>Edit My Profile</span>
            </button>

            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("open-change-password-modal"))}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-medium text-xs sm:text-sm font-inter transition-all border border-white/15 cursor-pointer shadow-sm hover:shadow flex-1 sm:flex-initial"
            >
              <KeyRound className="w-4 h-4 text-secondary-300" />
              <span>Change Password</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          STAFF ROSTER SECTION (EXCLUDES CURRENT USER)
          ========================================================================= */}
      <div className="space-y-4">
        {/* Top Action Bar & Tenant Scoping Context */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary-50 text-secondary-600 flex items-center justify-center font-bold shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-poppins font-bold text-sm text-slate-900">
                  Hospital Staff &amp; Clinical Personnel
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-50 text-secondary-700 text-[11px] font-semibold font-inter">
                  <Building2 className="w-3 h-3 text-secondary-600" />
                  {organizationName}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-inter">
                {scopedMembers.length} authorized healthcare specialists assigned to this hospital
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
            {/* Status Filter Tabs (Active & Suspended) */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-inter font-medium overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                  statusFilter === "all"
                    ? "bg-white text-dark shadow-2xs font-bold"
                    : "text-slate-600 hover:text-dark"
                }`}
              >
                All ({scopedMembers.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("active")}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                  statusFilter === "active"
                    ? "bg-white text-emerald-700 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-dark"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Active ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("suspended")}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                  statusFilter === "suspended"
                    ? "bg-white text-amber-700 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-dark"
                }`}
              >
                <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                Suspended ({suspendedCount})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-auto sm:min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-inter text-dark placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-secondary-500 focus:bg-white transition-all"
              />
            </div>

            {/* Invite Staff Button */}
            {isManager && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsInviteModalOpen(true)}
                className="text-xs flex items-center justify-center gap-1.5 shrink-0 w-full sm:w-auto whitespace-nowrap"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Staff Member</span>
              </Button>
            )}
          </div>
        </div>

        {/* Staff Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member</TableHead>
                <TableHead>Official Email</TableHead>
                <TableHead>Clinical / Facility Role</TableHead>
                <TableHead>Account Status</TableHead>
                <TableHead>Onboarded Date</TableHead>
                {isManager && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length > 0 ? (
                filteredMembers.map((m) => {
                  const currentRole = (m as any).member_role || (m as any).role || "doctor";
                  const isMemberActive = m.is_active && m.profile?.is_active !== false;

                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div
                          onClick={() => isManager && handleOpenEdit(m)}
                          className={`flex items-center gap-3 ${
                            isManager ? "cursor-pointer group select-none" : ""
                          }`}
                          title={isManager ? "Click to view or edit profile details" : undefined}
                        >
                          <Avatar
                            name={m.profile?.full_name || "Healthcare Staff"}
                            src={m.profile?.avatar_url || undefined}
                            size="sm"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-dark text-xs block group-hover:text-secondary-600 transition-colors">
                                {m.profile?.full_name || "Hospital Clinician"}
                              </span>
                              {isManager && (
                                <Edit3 className="w-3 h-3 text-slate-300 group-hover:text-secondary-500 transition-colors opacity-0 group-hover:opacity-100" />
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">
                              ID: {m.user_id.substring(0, 8)}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-slate-600 font-inter">
                        {m.profile?.email}
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        <Badge variant={getRoleBadgeVariant(currentRole) as any} size="sm" className="whitespace-nowrap">
                          {formatRoleLabel(currentRole)}
                        </Badge>
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        <Badge variant={isMemberActive ? "success" : "warning"} size="sm" className="whitespace-nowrap">
                          {isMemberActive ? "Active" : "Suspended"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-xs text-slate-500 font-inter whitespace-nowrap">
                        {new Date(m.created_at).toLocaleDateString("en-NG", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </TableCell>

                      {isManager && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(m)}
                              className="text-xs py-1 px-2.5 text-slate-600 hover:text-dark hover:bg-slate-100 cursor-pointer"
                              title="Edit profile details"
                            >
                              <UserCog className="w-3.5 h-3.5 mr-1 text-slate-500" />
                              <span>Edit</span>
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              disabled={loadingMemberId === m.id}
                              onClick={() => handleToggleActive(m.id, isMemberActive)}
                              className={`text-xs py-1 px-2.5 cursor-pointer ${
                                isMemberActive
                                  ? "text-amber-700 border-amber-200 hover:bg-amber-50"
                                  : "text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                              }`}
                            >
                              {loadingMemberId === m.id
                                ? "Updating..."
                                : isMemberActive
                                ? "Suspend"
                                : "Reactivate"}
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={isManager ? 6 : 5}
                    className="py-12 text-center text-slate-500 font-inter text-xs"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-slate-300" />
                      <p className="font-semibold text-slate-700">No staff members found</p>
                      <p className="text-slate-400">
                        {searchQuery
                          ? "Try adjusting your search criteria"
                          : "Invite authorized healthcare specialists to your facility"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* =========================================================================
          MODALS
          ========================================================================= */}
      {/* 1. Personal Profile Modal */}
      <EditPersonalProfileModal
        isOpen={isMyProfileModalOpen}
        onClose={() => setIsMyProfileModalOpen(false)}
        initialFullName={myProfile.fullName}
        initialPhone={myProfile.phone}
        email={myProfile.email}
        roleLabel={formatRoleLabel(myProfile.role)}
        organizationName={myProfile.organizationName}
        onSuccess={(updated) => {
          setMyProfile((prev) => ({
            ...prev,
            fullName: updated.fullName,
            phone: updated.phone || null,
          }));
          router.refresh();
        }}
      />

      {/* 2. Staff Member Profile Modal */}
      <EditStaffModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        member={selectedMemberForEdit}
        organizationId={organizationId}
        organizationType={organizationType}
        onSuccess={handleMemberUpdated}
      />

      {/* 3. Invite Staff Modal */}
      <InviteStaffModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        organizationId={organizationId}
        organizationType={organizationType}
        onSuccess={handleMemberAdded}
      />
    </div>
  );
}
