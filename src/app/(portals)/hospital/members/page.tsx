import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { hospitalService } from "@/services/hospitalService";
import { PageHeader } from "@/components/ui";
import { MembersClient } from "./MembersClient";

export default async function HospitalMembersPage() {
  const user = await getCurrentUser("hospital");
  if (!user) redirect("/login");

  const context = await hospitalService.getHospitalContext(user.id);
  if (!context) redirect("/hospital");

  // Route Guard: Staff & Members management restricted to Hospital Owner & Hospital Administrator
  if (!context.isOwner && !context.isManager) {
    redirect("/hospital/dashboard");
  }

  // Fetch all authorized staff belonging to this hospital facility
  let members = await hospitalService.getMembers(context.organization.id);

  // Requirement: Subordinate staff profiles must not see the owner's details
  if (!context.isOwner) {
    members = members.filter((m) => {
      const isOwnerRole = (m as any).member_role === "owner" || (m as any).role === "owner";
      const isFacilityOwnerEmail =
        m.profile?.email === "hospital@orbinova.com" ||
        m.profile?.email === context.organization.email;
      return !isOwnerRole && !isFacilityOwnerEmail;
    });
  }

  // Extract current logged-in user's profile details
  const currentMember = members.find(
    (m) => m.user_id === user.id || m.profile?.email === user.email
  );

  const currentUserRole = currentMember
    ? ((currentMember as any).member_role || (currentMember as any).role || (context.membership as any)?.member_role)
    : (context.isOwner ? "owner" : (context.membership as any)?.member_role || "hospital");

  const currentUserData = {
    id: user.id,
    userId: user.id,
    email: user.email || "",
    fullName: currentMember?.profile?.full_name || user.profile?.full_name || "Facility Administrator",
    phone: currentMember?.profile?.phone || user.profile?.phone || null,
    avatarUrl: currentMember?.profile?.avatar_url || user.profile?.avatar_url || null,
    role: currentUserRole,
    isActive: user.profile?.is_active ?? true,
    organizationName: context.organization.name,
    organizationType: context.organization.organization_type,
  };

  // Requirement: Remove currently logged-in user from the staff roster table list
  const rosterMembers = members.filter(
    (m) => m.user_id !== user.id && m.profile?.email !== user.email
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Facility Staff & Member Roster"
        description={`Authorized staff management and onboarding for ${context.organization.name}`}
      />

      <MembersClient
        members={rosterMembers}
        currentUser={currentUserData}
        isOwner={context.isOwner}
        isManager={context.isManager}
        currentUserId={user.id}
        organizationId={context.organization.id}
        organizationType={context.organization.organization_type}
        organizationName={context.organization.name}
      />
    </div>
  );
}
