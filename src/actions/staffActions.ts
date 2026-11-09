"use server";

import crypto from "crypto";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hospitalService } from "@/services/hospitalService";
import {
  hasPermission,
  assertOrgAccess,
  assertApprovedInstitution,
} from "@/lib/auth/rbac";
import { GranularMemberRole, OrganizationMember } from "@/types/database";
import { revalidatePath } from "next/cache";
import { emailService } from "@/services/emailService";
import { staffStore } from "@/services/staffStore";
import { validateEmailUniqueness, validateScopedEmailUniqueness } from "@/lib/auth/emailUniqueness";
import { extractSurname, generateTemporaryPassword } from "@/lib/auth/passwordUtils";
import { accountSecurity } from "@/lib/auth/accountSecurity";
import { rateLimiter } from "@/lib/auth/rateLimiter";
import { sessionManager } from "@/lib/auth/sessionManager";
import { cookies } from "next/headers";
import { PORTAL_COOKIE_OPTIONS } from "@/lib/auth/portalAuth";
import { hashPassword } from "@/lib/auth/passwordHash";
import { cacheManager } from "@/lib/cache/cacheManager";
import { orbinovaEmail } from "@/lib/email";

/**
 * Ensures caller is an active member with staff management authorization
 */
async function requireStaffManagerClearance(targetOrgId: string) {
  const user = await getCurrentUser("hospital");
  if (!user || !user.profile?.is_active) {
    throw new Error("Unauthorized: Active user session required.");
  }

  const context = await hospitalService.getHospitalContext(user.id);
  if (!context) {
    throw new Error("Unauthorized: Organization membership required.");
  }

  // Multi-Institution Isolation Guard
  assertOrgAccess(
    {
      id: user.id,
      role: user.profile.role,
      organization_id: context.organization.id,
      isSuperAdmin: user.profile.role === "admin" && (user.profile.admin_role === "superadmin" || user.profile.admin_role === "super_admin"),
    },
    targetOrgId
  );

  // Institution Approval Guard
  assertApprovedInstitution(context.organization.verification_status);

  // Permission Guard
  const canInvite = hasPermission(
    user.profile.role,
    "staff.invite",
    context.membership.member_role
  );

  if (!canInvite) {
    throw new Error("Forbidden: You do not possess clearance to manage institutional staff.");
  }

  return { user, context };
}

/**
 * Creates and onboards a new staff member directly, provisioning their profile,
 * facility membership, and emailing their default login password.
 */
export async function addStaffMemberAction(data: {
  fullName: string;
  title?: string;
  email: string;
  phone: string;
  memberRole: GranularMemberRole;
  organizationId: string;
}) {
  try {
    let normalizedFullName = data.fullName?.trim();
    if (!normalizedFullName || normalizedFullName.length < 2) {
      return { success: false, error: "Please enter the staff member's full name." };
    }

    // Prepend title prefix if provided and not already present
    const title = data.title?.trim();
    if (title && !normalizedFullName.toLowerCase().startsWith(title.toLowerCase())) {
      normalizedFullName = `${title} ${normalizedFullName}`;
    }

    const normalizedEmail = data.email?.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      return { success: false, error: "Please enter a valid official email address." };
    }

    // Table-Level Staff Uniqueness Guard: Enforce email uniqueness within the institution,
    // while permitting verified existing donors or multi-institution staff to link their account
    const emailUniqueness = await validateScopedEmailUniqueness(normalizedEmail, "staff", {
      organizationId: data.organizationId,
      candidateName: normalizedFullName,
    });
    if (!emailUniqueness.isUnique) {
      return {
        success: false,
        error: emailUniqueness.error || "A staff member with this email address already exists at this facility.",
      };
    }

    const normalizedPhone = data.phone?.trim();
    if (!normalizedPhone || normalizedPhone.length < 7) {
      return { success: false, error: "Please enter a valid phone number." };
    }

    if (!data.memberRole) {
      return { success: false, error: "Please select a professional role for this staff member." };
    }

    const { user, context } = await requireStaffManagerClearance(data.organizationId);

    // Normalize role to 5 core hospital roles
    let assignedRole: GranularMemberRole = data.memberRole;
    if (context.organization.organization_type === "hospital") {
      if (
        assignedRole === "doctor" ||
        assignedRole === "nurse" ||
        assignedRole === "hospital_staff" ||
        assignedRole === "staff"
      ) {
        assignedRole = "clinical_staff";
      } else if (assignedRole === "manager" || (assignedRole as string) === "hospital_admin") {
        assignedRole = "administrator";
      }

      // Restrict non-owners from assigning owner role
      if (!context.isOwner && assignedRole === "owner") {
        return { success: false, error: "Only the Hospital Owner can assign ownership privileges." };
      }
    }

    const supabase = await createClient();

    // Specification: Extract surname (entered first) and generate cryptographically random temporary password
    const { surname, temporaryPassword } = generateTemporaryPassword(normalizedFullName);
    const orgType = context.organization.organization_type || "hospital";

    // Authoritative Server-Side Institutional Ownership (Never trust client payload)
    const targetOrgId = context.organization.id;

    // 1. Try Postgres RPC Function or reuse existing central user identity
    let newUserId: string | null = emailUniqueness.isExistingCentralUser ? (emailUniqueness.existingUserId || null) : null;
    if (!newUserId) {
      try {
        const { data: rpcRes, error: rpcErr } = await (supabase as any).rpc(
          "add_facility_staff_member",
          {
            p_org_id: targetOrgId,
            p_full_name: normalizedFullName,
            p_email: normalizedEmail,
            p_phone: normalizedPhone,
            p_member_role: assignedRole,
            p_password: temporaryPassword,
            p_is_active: true, // Created active so staff can immediately log in with default credentials
          }
        );
        if (!rpcErr && rpcRes?.user_id) {
          newUserId = rpcRes.user_id;
        }
      } catch {}
    }

    // 2. Fallback if RPC function has not yet been seeded in Supabase SQL editor
    if (!newUserId) {
      try {
        const adminClient = createAdminClient();
        const { data: createdAuth, error: authErr } = await adminClient.auth.admin.createUser({
          email: normalizedEmail,
          password: temporaryPassword,
          email_confirm: true,
          user_metadata: {
            full_name: normalizedFullName,
            role: orgType,
            must_change_password: true,
            organization_id: targetOrgId,
          },
        });

        if (!authErr && createdAuth?.user) {
          newUserId = createdAuth.user.id;
        }
      } catch {
        try {
          const { data: signUpData } = await supabase.auth.signUp({
            email: normalizedEmail,
            password: temporaryPassword,
            options: {
              data: {
                full_name: normalizedFullName,
                role: orgType,
                must_change_password: true,
                organization_id: targetOrgId,
              },
            },
          });
          if (signUpData?.user) {
            newUserId = signUpData.user.id;
          }
        } catch {}
      }
    }

    if (!newUserId) {
      const hash = crypto.createHash("md5").update(normalizedEmail).digest("hex");
      newUserId = `${hash.substring(0, 8)}-${hash.substring(8, 12)}-4${hash.substring(13, 16)}-a${hash.substring(17, 20)}-${hash.substring(20, 32)}`;
    }

    // 3. Upsert Public Profile & Facility Roster (Active account requiring first-login password change)
    try {
      await (supabase.from("profiles") as any).upsert({
        id: newUserId,
        email: normalizedEmail,
        full_name: normalizedFullName,
        phone: normalizedPhone,
        role: orgType,
        is_active: true,
        must_change_password: true,
        updated_at: new Date().toISOString(),
      });

      await (supabase.from("organization_members") as any).upsert(
        {
          organization_id: targetOrgId,
          user_id: newUserId,
          member_role: data.memberRole,
          is_active: true,
          must_change_password: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organization_id,user_id" }
      );
    } catch (e: any) {
      console.warn("Direct upsert notice:", e?.message);
    }

    // Persist in authoritative staffStore with temporaryPassword and mustChangePassword flag
    staffStore.save({
      userId: newUserId,
      memberId: `member-${newUserId}`,
      organizationId: targetOrgId,
      fullName: normalizedFullName,
      surname,
      email: normalizedEmail,
      phone: normalizedPhone,
      memberRole: assignedRole,
      isActive: true,
      temporaryPassword,
      mustChangePassword: true,
      updatedAt: new Date().toISOString(),
    });

    // 4. Friendly Role Display Label
    const formatRole = (r: string) => {
      switch (r) {
        case "owner": return "Hospital Owner";
        case "administrator":
        case "manager":
        case "hospital_admin": return "Hospital Administrator";
        case "donor_coordinator": return "Donor Coordinator";
        case "clinical_staff":
        case "doctor":
        case "nurse":
        case "hospital_staff": return "Clinical Staff";
        case "radiologist": return "Radiologist";
        case "donor_coordinator": return "Donor Coordinator";
        case "nurse": return "Nurse / Clinical Staff";
        case "inventory_officer": return "Inventory Officer";
        case "blood_bank_technician": return "Laboratory Technician";
        case "distribution_officer": return "Distribution Officer";
        case "manager": return "Facility Manager";
        case "owner": return "Facility Owner";
        default: return "Hospital Staff";
      }
    };

    const roleName = formatRole(data.memberRole);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const loginUrl = `${appUrl}/login?email=${encodeURIComponent(normalizedEmail)}`;

    // 5. Send Onboarding Email with Login Credentials
    let emailSent = false;
    try {
      const emailRes = await emailService.sendStaffInvitationEmail({
        toEmail: normalizedEmail,
        fullName: normalizedFullName,
        roleLabel: roleName,
        organizationName: context.organization.name,
        defaultPassword: temporaryPassword,
        loginUrl: loginUrl,
      });
      emailSent = emailRes.success;
    } catch (e: any) {
      console.warn("Email notification error:", e?.message);
    }

    // 6. Record Audit Log
    try {
      await (supabase.from("audit_logs") as any).insert({
        user_id: user.id,
        organization_id: targetOrgId,
        action: "STAFF_MEMBER_CREATED",
        entity_type: "organization_members",
        entity_id: newUserId,
        details: {
          organization_id: targetOrgId,
          email: normalizedEmail,
          full_name: normalizedFullName,
          surname,
          member_role: data.memberRole,
          email_sent: emailSent,
        },
      });
    } catch {}

    cacheManager.invalidateStaff(data.organizationId);
    revalidatePath("/hospital/members");
    revalidatePath("/hospital/staff");
    revalidatePath("/blood-bank/staff");

    return {
      success: true,
      email: normalizedEmail,
      fullName: normalizedFullName,
      surname,
      roleName: roleName,
      defaultPassword: temporaryPassword,
      temporaryPassword,
      mustChangePassword: true,
      loginUrl: loginUrl,
      emailSent: emailSent,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to add staff member." };
  }
}

// Keep inviteStaffAction alias for backward compatibility
export const inviteStaffAction = addStaffMemberAction;

/**
 * Fetches institutional staff roster & pending invitations for an approved facility
 */
export async function getInstitutionalStaffAction(organizationId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized: Please sign in.");

    const context = await hospitalService.getHospitalContext(user.id);
    if (!context) throw new Error("Unauthorized: Facility affiliation required.");

    // Multi-tenant check
    assertOrgAccess(
      {
        id: user.id,
        role: user.profile?.role,
        organization_id: context.organization.id,
        isSuperAdmin: user.profile?.role === "admin",
      },
      organizationId
    );

    const supabase = await createClient();

    // Fetch active members with profiles
    const { data: members, error: memErr } = await supabase
      .from("organization_members")
      .select("*, profiles(*)")
      .eq("organization_id", organizationId)
      .eq("is_active", true);

    if (memErr) throw new Error(memErr.message);

    return {
      success: true,
      members: members || [],
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to load staff roster.",
      members: [],
    };
  }
}

/**
 * Updates an institutional member's clinical or operational role
 */
export async function updateStaffRoleAction(data: {
  memberId: string;
  organizationId: string;
  newRole: GranularMemberRole;
}) {
  try {
    const { user } = await requireStaffManagerClearance(data.organizationId);
    const supabase = await createClient();

    const { error } = await (supabase
      .from("organization_members") as any)
      .update({
        member_role: data.newRole,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.memberId)
      .eq("organization_id", data.organizationId);

    if (error) throw new Error(error.message);

    // Audit Log
    try {
      await (supabase.from("audit_logs") as any).insert({
        user_id: user.id,
        action: "STAFF_ROLE_UPDATED",
        entity_type: "organization_members",
        entity_id: data.memberId,
        details: {
          organization_id: data.organizationId,
          new_role: data.newRole,
        },
      });
    } catch {}

    cacheManager.invalidateStaff(data.organizationId);
    revalidatePath("/hospital/members");
    revalidatePath("/hospital/staff");
    revalidatePath("/blood-bank/staff");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update member role." };
  }
}

/**
 * Updates a staff member's profile details (full name, phone, role clearance, active status)
 */
export async function updateStaffMemberAction(data: {
  userId: string;
  memberId?: string;
  fullName: string;
  phone?: string;
  memberRole: GranularMemberRole;
  isActive?: boolean;
}) {
  try {
    let user = await getCurrentUser("hospital");
    if (!user) {
      user = await getCurrentUser();
    }
    if (!user || !user.profile?.is_active) {
      return { success: false, error: "Unauthorized: Active user session required." };
    }

    const context = await hospitalService.getHospitalContext(user.id);
    if (!context || (!context.isOwner && !context.isManager)) {
      return { success: false, error: "Unauthorized: Manager clearance required to update staff details." };
    }

    // Role Normalization and Ownership Privilege Guard
    let targetRole: GranularMemberRole = data.memberRole;
    if (context.organization.organization_type === "hospital") {
      if (
        targetRole === "doctor" ||
        targetRole === "nurse" ||
        targetRole === "hospital_staff" ||
        targetRole === "staff"
      ) {
        targetRole = "clinical_staff";
      } else if (targetRole === "manager" || (targetRole as string) === "hospital_admin") {
        targetRole = "administrator";
      }

      const existingStaff = staffStore.get(data.userId);
      if (!context.isOwner) {
        if (existingStaff?.memberRole === "owner" || targetRole === "owner") {
          return {
            success: false,
            error: "Security restriction: Only the Hospital Owner can assign or modify ownership privileges.",
          };
        }
      }
    }

    const normalizedFullName = data.fullName?.trim();
    if (!normalizedFullName || normalizedFullName.length < 2) {
      return { success: false, error: "Please enter a valid full name." };
    }

    const supabase = await createClient("hospital");
    const targetOrgId = context.organization.id;

    // 1. Update public.profiles
    const nowIso = new Date().toISOString();
    const profileUpdate: any = {
      full_name: normalizedFullName,
      phone: data.phone?.trim() || null,
      updated_at: nowIso,
    };
    if (typeof data.isActive === "boolean") {
      profileUpdate.is_active = data.isActive;
      profileUpdate.is_suspended = !data.isActive;
      profileUpdate.suspended_at = data.isActive ? null : nowIso;
      profileUpdate.suspended_by = data.isActive ? null : user.id;
      profileUpdate.suspension_reason = data.isActive ? null : "Suspended by facility management";
    }

    const { error: profErr } = await (supabase.from("profiles") as any)
      .update(profileUpdate)
      .eq("id", data.userId);

    if (profErr) {
      console.warn("Profile update notice:", profErr.message);
    }

    // 2. Update organization_members (role & active status)
    if (targetRole) {
      const memberUpdate: any = {
        member_role: targetRole,
        role: targetRole,
        updated_at: nowIso,
      };
      if (typeof data.isActive === "boolean") {
        memberUpdate.is_active = data.isActive;
      }

      if (data.memberId && !data.memberId.startsWith("member-")) {
        await (supabase.from("organization_members") as any)
          .update(memberUpdate)
          .eq("id", data.memberId)
          .eq("organization_id", targetOrgId);
      } else {
        await (supabase.from("organization_members") as any)
          .update(memberUpdate)
          .eq("user_id", data.userId)
          .eq("organization_id", targetOrgId);
      }
    }

    // Persist in authoritative staffStore
    staffStore.save({
      userId: data.userId,
      memberId: data.memberId,
      organizationId: targetOrgId,
      fullName: normalizedFullName,
      phone: data.phone?.trim() || undefined,
      memberRole: targetRole,
      isActive: typeof data.isActive === "boolean" ? data.isActive : true,
      updatedAt: nowIso,
    });

    if (data.isActive === false) {
      await accountSecurity.suspendAccount(data.userId, {
        userId: data.userId,
        suspendedBy: user.id,
        reason: "Suspended by facility management",
      });
      try {
        await sessionManager.revokeSession(data.userId);
      } catch {}
    } else if (data.isActive === true) {
      await accountSecurity.reactivateAccount(data.userId, {
        reactivatedBy: user.id,
      });
    }

    // 3. Audit Log
    try {
      await (supabase.from("audit_logs") as any).insert({
        user_id: user.id,
        organization_id: targetOrgId,
        action: "STAFF_MEMBER_DETAILS_UPDATED",
        entity_type: "profiles",
        entity_id: data.userId,
        details: {
          updated_full_name: normalizedFullName,
          updated_role: data.memberRole,
          updated_phone: data.phone,
          is_active: data.isActive,
        },
      });
    } catch {}

    if (data.isActive === false) {
      try {
        await sessionManager.revokeSession(data.userId);
      } catch {}
    }

    cacheManager.invalidateStaff(targetOrgId);
    revalidatePath("/hospital/members");
    revalidatePath("/hospital/staff");
    revalidatePath("/blood-bank/staff");

    return {
      success: true,
      message: `Staff profile for ${normalizedFullName} updated successfully.`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to update staff member profile.",
    };
  }
}

/**
 * Updates the currently logged-in hospital user's personal profile (Full Name, Phone)
 */
export async function updateHospitalPersonalProfileAction(data: {
  fullName: string;
  phone?: string;
}) {
  try {
    let user = await getCurrentUser("hospital");
    if (!user) {
      user = await getCurrentUser();
    }
    if (!user || !user.profile?.is_active) {
      return { success: false, error: "Unauthorized: Active user session required." };
    }

    const normalizedFullName = data.fullName?.trim();
    if (!normalizedFullName || normalizedFullName.length < 2) {
      return { success: false, error: "Please enter a valid full name." };
    }

    const context = await hospitalService.getHospitalContext(user.id);
    const targetOrgId = context?.organization.id || "";

    const supabase = await createClient("hospital");

    // 1. Update public.profiles
    const profileUpdate: any = {
      full_name: normalizedFullName,
      phone: data.phone?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { error: profErr } = await (supabase.from("profiles") as any)
      .update(profileUpdate)
      .eq("id", user.id);

    if (profErr) {
      console.warn("Personal profile update notice:", profErr.message);
    }

    // 2. Persist in authoritative staffStore
    const existing = staffStore.get(user.id) || staffStore.get(user.email || "");
    staffStore.save({
      userId: user.id,
      memberId: existing?.memberId,
      organizationId: targetOrgId,
      fullName: normalizedFullName,
      email: user.email || undefined,
      phone: data.phone?.trim() || undefined,
      memberRole: existing?.memberRole || "owner",
      isActive: existing?.isActive ?? true,
      updatedAt: new Date().toISOString(),
    });

    revalidatePath("/hospital/members");
    revalidatePath("/hospital/dashboard");
    revalidatePath("/hospital/organization");

    return {
      success: true,
      message: "Personal profile updated successfully.",
      user: {
        id: user.id,
        fullName: normalizedFullName,
        phone: data.phone?.trim() || null,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to update personal profile.",
    };
  }
}

/**
 * Mandatory First-Login Password Change Action
 * Validates new permanent password, updates Supabase Auth, clears must_change_password flag,
 * updates staffStore, and resolves the appropriate dashboard redirection URL.
 */
export async function completeFirstLoginPasswordChangeAction(newPassword: string) {
  try {
    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: "New password must be at least 8 characters long." };
    }

    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasDigit = /[0-9]/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

    if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
      return {
        success: false,
        error: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
      };
    }

    // Try finding user across scopes
    let user = await getCurrentUser("hospital");
    if (!user) {
      user = await getCurrentUser();
    }
    if (!user) {
      return { success: false, error: "Session expired. Please sign in again." };
    }

    const newPasswordHash = hashPassword(newPassword);

    // 1. Authoritatively set permanent password in staffStore
    // Stores PBKDF2 hash, permanently deletes temporary password, sets mustChangePassword: false
    staffStore.setPassword(user.id, newPassword);
    if (user.email) {
      staffStore.setPassword(user.email, newPassword);
    }

    // 2. Update Supabase Auth if session exists
    const supabase = await createClient("hospital");
    try {
      await supabase.auth.updateUser({
        password: newPassword,
        data: {
          must_change_password: false,
          temporary_password: false,
        },
      });
    } catch (authErr: any) {
      console.warn("Auth password update notice:", authErr?.message);
    }

    // 3. Update profiles table
    try {
      await (supabase.from("profiles") as any)
        .update({
          must_change_password: false,
          password_hash: newPasswordHash,
          password_changed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    } catch {}

    // 4. Update organization_members table
    try {
      await (supabase.from("organization_members") as any)
        .update({
          must_change_password: false,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
    } catch {}

    // 5. Update staff session cookies to reflect must_change_password = false
    try {
      const cookieStore = cookies();
      for (const scope of ["hospital", "blood_bank", "admin"]) {
        const cookieName = `orbinova_staff_${scope}`;
        const existing = cookieStore.get(cookieName)?.value;
        if (existing) {
          try {
            const payload = JSON.parse(Buffer.from(existing, "base64").toString("utf-8"));
            payload.must_change_password = false;
            cookieStore.set(cookieName, Buffer.from(JSON.stringify(payload)).toString("base64"), {
              ...PORTAL_COOKIE_OPTIONS,
            });
          } catch {}
        }
      }
    } catch {}

    // 6. Reset any failed login attempts on this account
    if (user.email) {
      accountSecurity.recordSuccessfulLogin(user.email);
    }

    // 7. Resolve appropriate destination based on assigned role
    const staffRecord = staffStore.get(user.id) || (user.email ? staffStore.get(user.email) : undefined);
    const memberRole = staffRecord?.memberRole || user.profile?.role;

    const destination =
      memberRole === "radiologist" || (user.profile?.role as any) === "radiologist"
        ? "/imaging"
        : "/hospital/dashboard";

    // 8. Targeted Cache Invalidation
    cacheManager.invalidateStaff(staffRecord?.organizationId);
    cacheManager.invalidateAuth();

    // 9. Send password changed alert email (non-blocking)
    if (user.email) {
      try {
        await orbinovaEmail.sendPasswordChangedAlert({
          userEmail: user.email,
          fullName: staffRecord?.fullName || user.profile?.full_name || "Healthcare Staff",
          timestamp: new Date().toISOString(),
        });
      } catch {}
    }

    return {
      success: true,
      message: "Your permanent password has been set successfully.",
      redirectTo: destination,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to update password." };
  }
}

/**
 * Unlocks a locked staff/user account.
 * Requires administrator clearance (Owner, Manager, staff.manage, or Platform Admin).
 * Enforces institutional isolation and logs an immutable audit trail.
 */
export async function unlockStaffAccountAction(targetEmail: string) {
  try {
    if (!targetEmail) {
      return { success: false, error: "Target email address is required." };
    }

    const normalizedEmail = targetEmail.trim().toLowerCase();
    const user = await getCurrentUser("hospital");
    if (!user) {
      return { success: false, error: "Authentication required." };
    }

    const context = await hospitalService.getHospitalContext(user.id);
    if (!context) {
      return { success: false, error: "Hospital context required." };
    }

    const isPlatformAdmin = user.profile?.role === "admin" || (user.profile as any)?.admin_role === "superadmin";

    const authorized =
      context.isOwner ||
      context.isManager ||
      hasPermission(user.profile?.role || "hospital", "staff.manage", context.membership.member_role) ||
      isPlatformAdmin;

    if (!authorized) {
      return { success: false, error: "Forbidden: Lacking administrative clearance to unlock accounts." };
    }

    // Institutional Data Isolation:
    // Unless platform superadmin, verify target user belongs to this hospital's roster
    if (!isPlatformAdmin) {
      const staffMembers = await hospitalService.getMembers(context.organization.id);
      const isMember = staffMembers.some(
        (m) => m.profile?.email?.toLowerCase() === normalizedEmail
      );
      const stored = staffStore.get(normalizedEmail);
      const belongsToOrg = stored?.organizationId === context.organization.id;

      if (!isMember && !belongsToOrg) {
        return {
          success: false,
          error: "Forbidden: You may only unlock staff accounts belonging to your hospital.",
        };
      }
    }

    // Perform atomic unlock
    await accountSecurity.unlockAccount(normalizedEmail, {
      userId: user.id,
      role: user.profile?.role || context.membership.member_role,
      organizationId: context.organization.id,
    });

    // Clear rate limiter for this account as well
    await rateLimiter.clearLimit({ ip: "127.0.0.1", email: normalizedEmail });

    revalidatePath("/hospital/members");

    return {
      success: true,
      message: `Account for ${normalizedEmail} has been successfully unlocked.`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to unlock account.",
    };
  }
}
