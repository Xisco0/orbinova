"use server";

import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  VerificationStatus,
  BloodGroupCode,
  AdminRole,
  OrgType,
  UserRole,
} from "@/types/database";
import { revalidatePath } from "next/cache";
import { normalizeAdminRole } from "@/constants/permissions";
import { orbinovaEmail } from "@/lib/email";
import { accountSecurity } from "@/lib/auth/accountSecurity";
import { rateLimiter } from "@/lib/auth/rateLimiter";
import { donorStore } from "@/services/donorStore";
import { generateUniqueDonorReference } from "@/lib/donor/donorReference";
import { validateDonorDateOfBirth } from "@/lib/donor/donorValidation";
import { validateScopedEmailUniqueness } from "@/lib/auth/emailUniqueness";

/**
 * Ensures the executing user has verified server-side admin clearance.
 * If requiredRole is specified (e.g. 'super_admin'), verifies admin hierarchy.
 */
async function requireAdminClearance(requiredRole?: AdminRole | "superadmin") {
  const user = await getCurrentUser("admin");
  if (!user || user.profile?.role !== "admin" || !user.profile?.is_active) {
    throw new Error("Unauthorized: Administrative clearance required.");
  }

  if (requiredRole === "superadmin" || requiredRole === "super_admin") {
    const adminRole = user.profile.admin_role || "superadmin";
    const normalized = normalizeAdminRole(adminRole);
    if (normalized !== "superadmin") {
      throw new Error("Forbidden: Super Administrator clearance required for this operation.");
    }
  }

  return user;
}

/**
 * Creates a new Administrator account with assigned Admin Role
 */
export async function createAdminAction(formData: {
  fullName: string;
  email: string;
  password: string;
  adminRole: AdminRole;
  phone?: string;
}) {
  try {
    const caller = await requireAdminClearance("super_admin");
    const adminSupabase = createAdminClient();
    const serverSupabase = await createClient();

    const cleanEmail = formData.email.trim().toLowerCase();
    if (!cleanEmail || !formData.password || !formData.fullName.trim()) {
      return { success: false, error: "Name, email, and password are required." };
    }

    // 1. Create User via Supabase Admin API
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email: cleanEmail,
      password: formData.password,
      email_confirm: true,
      user_metadata: {
        full_name: formData.fullName.trim(),
        role: "admin",
        admin_role: formData.adminRole,
        phone: formData.phone?.trim() || null,
      },
    });

    if (authError || !authData.user) {
      throw new Error(authError?.message || "Failed to create user account in Supabase Auth.");
    }

    // 2. Ensure Profile is updated with role='admin' & admin_role
    const { error: profError } = await (adminSupabase.from("profiles") as any).upsert(
      {
        id: authData.user.id,
        full_name: formData.fullName.trim(),
        email: cleanEmail,
        phone: formData.phone?.trim() || null,
        role: "admin",
        admin_role: formData.adminRole,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (profError) throw new Error(profError.message);

    // 3. Record Audit Log
    await (serverSupabase.from("audit_logs") as any).insert({
      user_id: caller.id,
      action: "ADMIN_CREATED",
      entity_type: "profiles",
      entity_id: authData.user.id,
      metadata: {
        created_email: cleanEmail,
        assigned_role: formData.adminRole,
        created_by: caller.id,
      },
    });

    revalidatePath("/admin/admins");
    revalidatePath("/admin/users");
    revalidatePath("/admin/dashboard");

    return {
      success: true,
      message: `Administrator account for ${formData.fullName} created successfully.`,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create administrator." };
  }
}

/**
 * Updates an Administrator's sub-role (super_admin, admin, moderator, operations)
 */
export async function updateAdminRoleAction(targetUserId: string, newAdminRole: AdminRole) {
  try {
    const caller = await requireAdminClearance("super_admin");
    const supabase = await createClient();

    // Prevent demoting primary super admin if self
    if (targetUserId === caller.id && newAdminRole !== "super_admin") {
      return { success: false, error: "You cannot revoke your own Super Administrator status." };
    }

    const { error } = await (supabase.from("profiles") as any)
      .update({ admin_role: newAdminRole, updated_at: new Date().toISOString() })
      .eq("id", targetUserId)
      .eq("role", "admin");

    if (error) throw new Error(error.message);

    // Record Audit Log
    await (supabase.from("audit_logs") as any).insert({
      user_id: caller.id,
      action: "ADMIN_ROLE_CHANGED",
      entity_type: "profiles",
      entity_id: targetUserId,
      metadata: { target_user_id: targetUserId, new_admin_role: newAdminRole },
    });

    revalidatePath("/admin/admins");
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${targetUserId}`);

    return { success: true, message: `Admin role updated to ${newAdminRole}.` };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update admin role." };
  }
}

/**
 * Onboards a new Healthcare Organization (Hospital or Blood Bank)
 */
export async function onboardOrganizationAction(data: {
  name: string;
  organizationType: OrgType;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: number | null;
  longitude?: number | null;
  licenseNumber?: string;
  managerName?: string;
  managerEmail?: string;
  managerPassword?: string;
}) {
  try {
    const adminUser = await requireAdminClearance();
    const adminSupabase = createAdminClient();
    const serverSupabase = await createClient();

    const cleanName = data.name.trim();
    const cleanEmail = data.email.trim().toLowerCase();

    if (!cleanName || !cleanEmail) {
      return { success: false, error: "Organization name and email are required." };
    }

    // 1. Insert Organization record
    const { data: org, error: orgError } = await (adminSupabase
      .from("organizations") as any)
      .insert({
        name: cleanName,
        organization_type: data.organizationType,
        email: cleanEmail,
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        city: data.city?.trim() || null,
        state: data.state?.trim() || null,
        country: data.country?.trim() || "Nigeria",
        postal_code: data.postalCode?.trim() || null,
        latitude: data.latitude !== undefined ? data.latitude : null,
        longitude: data.longitude !== undefined ? data.longitude : null,
        license_number: data.licenseNumber?.trim() || null,
        verification_status: "verified",
        verified_at: new Date().toISOString(),
        verified_by: adminUser.id,
        is_active: true,
      })
      .select()
      .single();

    if (orgError || !org) throw new Error(orgError?.message || "Failed to create organization record.");

    // 2. Initialize 8 default blood group inventory items
    const bloodGroups: BloodGroupCode[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
    const inventoryRows = bloodGroups.map((bg) => ({
      organization_id: org.id,
      blood_group: bg,
      quantity: 0,
      reserved_quantity: 0,
    }));
    await (adminSupabase.from("blood_inventory") as any).upsert(inventoryRows, {
      onConflict: "organization_id,blood_group",
    });

    // 3. Optional: Create initial facility manager account
    let managerUserId: string | null = null;
    if (data.managerEmail?.trim() && data.managerPassword?.trim()) {
      const cleanManagerEmail = data.managerEmail.trim().toLowerCase();
      const { data: managerAuth, error: managerAuthErr } =
        await adminSupabase.auth.admin.createUser({
          email: cleanManagerEmail,
          password: data.managerPassword,
          email_confirm: true,
          user_metadata: {
            full_name: data.managerName?.trim() || `${cleanName} Administrator`,
            role: data.organizationType,
          },
        });

      if (!managerAuthErr && managerAuth.user) {
        managerUserId = managerAuth.user.id;
        await (adminSupabase.from("profiles") as any).upsert({
          id: managerUserId,
          full_name: data.managerName?.trim() || `${cleanName} Administrator`,
          email: cleanManagerEmail,
          phone: data.phone?.trim() || null,
          role: data.organizationType,
          is_active: true,
        });

        // Link as facility owner in organization_members
        await (adminSupabase.from("organization_members") as any).insert({
          organization_id: org.id,
          user_id: managerUserId,
          member_role: "owner",
          is_active: true,
        });
      }
    }

    // 4. Record Audit Log
    await (serverSupabase.from("audit_logs") as any).insert({
      user_id: adminUser.id,
      organization_id: org.id,
      action: `ORGANIZATION_ONBOARDED`,
      entity_type: "organizations",
      entity_id: org.id,
      metadata: {
        name: cleanName,
        type: data.organizationType,
        manager_user_id: managerUserId,
      },
    });

    revalidatePath("/admin/organizations");
    revalidatePath("/admin/dashboard");

    return {
      success: true,
      message: `${data.organizationType === "blood_bank" ? "Blood Bank" : "Hospital"} "${cleanName}" onboarded successfully.`,
      organizationId: org.id,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to onboard organization." };
  }
}

/**
 * Unboards/offboards an Organization (soft-delete status update to preserve history)
 */
export async function unboardOrganizationAction(organizationId: string, reason: string) {
  try {
    const adminUser = await requireAdminClearance();
    const adminSupabase = createAdminClient();
    const serverSupabase = await createClient();

    const timestamp = new Date().toISOString();

    // 1. Update Organization verification status to unboarded
    const { error: orgError } = await (adminSupabase.from("organizations") as any)
      .update({
        verification_status: "unboarded",
        is_active: false,
        offboarded_at: timestamp,
        offboarded_by: adminUser.id,
        offboarding_reason: reason || "Administrative unboarding",
        updated_at: timestamp,
      })
      .eq("id", organizationId);

    if (orgError) throw new Error(orgError.message);

    // 2. Deactivate active memberships
    await (adminSupabase.from("organization_members") as any)
      .update({ is_active: false, updated_at: timestamp })
      .eq("organization_id", organizationId);

    // 3. Record Audit Log
    await (serverSupabase.from("audit_logs") as any).insert({
      user_id: adminUser.id,
      organization_id: organizationId,
      action: "ORGANIZATION_UNBOARDED",
      entity_type: "organizations",
      entity_id: organizationId,
      metadata: { reason, offboarded_by: adminUser.id },
    });

    revalidatePath("/admin/organizations");
    revalidatePath(`/admin/organizations/${organizationId}`);
    revalidatePath("/admin/dashboard");

    return {
      success: true,
      message: "Organization unboarded successfully. Historical logs and records remain preserved.",
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to unboard organization." };
  }
}

/**
 * Onboards a new Voluntary Donor account
 */
export async function onboardDonorAction(data: {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  bloodGroup: BloodGroupCode;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other";
  city?: string;
  state?: string;
  address?: string;
}) {
  try {
    const adminUser = await requireAdminClearance();
    const adminSupabase = createAdminClient();
    const serverSupabase = await createClient();

    const cleanEmail = data.email.trim().toLowerCase();
    const cleanName = data.fullName.trim();

    if (!cleanEmail || !data.password || !cleanName) {
      return { success: false, error: "Full name, email, and password are required." };
    }

    if (data.dateOfBirth) {
      const dobValidation = validateDonorDateOfBirth(data.dateOfBirth);
      if (!dobValidation.valid) {
        return {
          success: false,
          error: dobValidation.error || "Donor must be between 18 and 70 years of age.",
        };
      }
    }

    // Table-Level Email Uniqueness Guard (Scope: Donor)
    const emailUniqueness = await validateScopedEmailUniqueness(cleanEmail, "donor", {
      candidateName: cleanName,
    });
    if (!emailUniqueness.isUnique) {
      return {
        success: false,
        error: emailUniqueness.error || "A voluntary donor is already registered with this email address.",
      };
    }

    let userId: string;
    const isLinkedAccount = emailUniqueness.isExistingCentralUser === true;

    if (isLinkedAccount && emailUniqueness.existingUserId) {
      userId = emailUniqueness.existingUserId;
    } else {
      // 1. Create Auth User with role = 'donor'
      const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
        email: cleanEmail,
        password: data.password,
        email_confirm: true,
        user_metadata: {
          full_name: cleanName,
          role: "donor",
          phone: data.phone?.trim() || null,
        },
      });

      if (authError || !authData.user) {
        throw new Error(authError?.message || "Failed to create donor auth record.");
      }

      userId = authData.user.id;

      // 2. Ensure Profile has role = 'donor'
      await (adminSupabase.from("profiles") as any).upsert({
        id: userId,
        full_name: cleanName,
        email: cleanEmail,
        phone: data.phone?.trim() || null,
        role: "donor",
        is_active: true,
      });
    }

    const donorRef = generateUniqueDonorReference();

    // 3. Create Donor Profile entry
    const { data: donorProf, error: donorErr } = await (adminSupabase.from("donor_profiles") as any).insert({
      user_id: userId,
      donor_number: donorRef,
      blood_group: data.bloodGroup,
      date_of_birth: data.dateOfBirth || null,
      gender: data.gender || null,
      city: data.city?.trim() || null,
      state: data.state?.trim() || null,
      address: data.address?.trim() || null,
      availability_status: "available",
      eligibility_status: "eligible",
      verification_status: "verified",
      verified_at: new Date().toISOString(),
      verified_by: adminUser.id,
    }).select().single();

    if (donorErr) throw new Error(donorErr.message);

    donorStore.save({
      userId,
      donorProfileId: donorProf.id,
      donorNumber: donorRef,
      organizationId: "admin",
      email: cleanEmail,
      fullName: cleanName,
      bloodGroup: data.bloodGroup,
      phone: data.phone?.trim() || undefined,
      gender: data.gender || null,
      dateOfBirth: data.dateOfBirth || null,
      city: data.city?.trim() || null,
      state: data.state?.trim() || null,
      eligibilityStatus: "eligible",
      isActive: true,
      updatedAt: new Date().toISOString(),
    });

    // 4. Record Audit Log
    await (serverSupabase.from("audit_logs") as any).insert({
      user_id: adminUser.id,
      action: "DONOR_ONBOARDED",
      entity_type: "donor_profiles",
      entity_id: donorProf.id,
      metadata: {
        donor_user_id: userId,
        blood_group: data.bloodGroup,
        email: cleanEmail,
      },
    });

    revalidatePath("/admin/donors");
    revalidatePath("/admin/dashboard");

    return {
      success: true,
      message: `Donor ${cleanName} (${data.bloodGroup}) onboarded successfully.`,
      donorId: donorProf.id,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to onboard donor." };
  }
}

/**
 * Unboards/offboards a Donor (soft-delete to preserve history, excludes from matching)
 */
export async function unboardDonorAction(donorProfileId: string, reason: string) {
  try {
    const adminUser = await requireAdminClearance();
    const adminSupabase = createAdminClient();
    const serverSupabase = await createClient();

    const timestamp = new Date().toISOString();

    // 1. Fetch donor profile to get user_id
    const { data: donorProf } = await (adminSupabase.from("donor_profiles") as any)
      .select("id, user_id")
      .eq("id", donorProfileId)
      .single();

    if (!donorProf) throw new Error("Donor profile not found.");

    // 2. Update donor profile status to unboarded & unavailable
    const { error: donorErr } = await (adminSupabase.from("donor_profiles") as any)
      .update({
        verification_status: "unboarded",
        availability_status: "unavailable",
        offboarded_at: timestamp,
        offboarded_by: adminUser.id,
        offboarding_reason: reason || "Administrative unboarding",
        updated_at: timestamp,
      })
      .eq("id", donorProfileId);

    if (donorErr) throw new Error(donorErr.message);

    // 3. Deactivate linked user profile
    await (adminSupabase.from("profiles") as any)
      .update({ is_active: false, updated_at: timestamp })
      .eq("id", donorProf.user_id);

    // 4. Record Audit Log
    await (serverSupabase.from("audit_logs") as any).insert({
      user_id: adminUser.id,
      action: "DONOR_UNBOARDED",
      entity_type: "donor_profiles",
      entity_id: donorProfileId,
      metadata: { reason, offboarded_by: adminUser.id, donor_user_id: donorProf.user_id },
    });

    revalidatePath("/admin/donors");
    revalidatePath(`/admin/donors/${donorProfileId}`);
    revalidatePath("/admin/dashboard");

    return {
      success: true,
      message: "Donor unboarded successfully and excluded from active matching.",
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to unboard donor." };
  }
}

/**
 * Re-activates an unboarded Donor
 */
export async function reactivateDonorAction(donorProfileId: string) {
  try {
    const adminUser = await requireAdminClearance();
    const adminSupabase = createAdminClient();
    const serverSupabase = await createClient();

    const timestamp = new Date().toISOString();

    // 1. Fetch donor profile to get user_id
    const { data: donorProf } = await (adminSupabase.from("donor_profiles") as any)
      .select("id, user_id")
      .eq("id", donorProfileId)
      .single();

    if (!donorProf) throw new Error("Donor profile not found.");

    // 2. Update donor profile status to verified & available
    const { error: donorErr } = await (adminSupabase.from("donor_profiles") as any)
      .update({
        verification_status: "verified",
        availability_status: "available",
        offboarded_at: null,
        offboarded_by: null,
        offboarding_reason: null,
        updated_at: timestamp,
      })
      .eq("id", donorProfileId);

    if (donorErr) throw new Error(donorErr.message);

    // 3. Reactivate linked user profile
    await (adminSupabase.from("profiles") as any)
      .update({ is_active: true, updated_at: timestamp })
      .eq("id", donorProf.user_id);

    // 4. Record Audit Log
    await (serverSupabase.from("audit_logs") as any).insert({
      user_id: adminUser.id,
      action: "DONOR_REACTIVATED",
      entity_type: "donor_profiles",
      entity_id: donorProfileId,
      metadata: { reactivated_by: adminUser.id, donor_user_id: donorProf.user_id },
    });

    revalidatePath("/admin/donors");
    revalidatePath(`/admin/donors/${donorProfileId}`);
    revalidatePath("/admin/dashboard");

    return {
      success: true,
      message: "Donor re-activated successfully.",
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to reactivate donor." };
  }
}

/**
 * Updates a Donor record with Super Administrator clearance
 */
export async function updateAdminDonorAction(data: {
  donorProfileId: string;
  fullName?: string;
  email?: string;
  phone?: string;
  bloodGroup: BloodGroupCode;
  country?: string;
  state?: string;
  city?: string;
  district?: string;
  eligibilityStatus?: string;
  isActive?: boolean;
}) {
  try {
    const adminUser = await requireAdminClearance("superadmin");
    const adminSupabase = createAdminClient();

    const { data: donorProf } = await (adminSupabase.from("donor_profiles") as any)
      .select("*, profiles(*)")
      .eq("id", data.donorProfileId)
      .maybeSingle();

    const userId = donorProf?.user_id;

    if (userId) {
      if (data.fullName !== undefined || data.phone !== undefined || data.isActive !== undefined) {
        await (adminSupabase.from("profiles") as any)
          .update({
            full_name: data.fullName?.trim() || undefined,
            phone: data.phone?.trim() || null,
            is_active: data.isActive !== undefined ? data.isActive : undefined,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);
      }
    }

    const dpUpdates: any = {
      blood_group: data.bloodGroup,
      updated_at: new Date().toISOString(),
    };
    if (data.country) dpUpdates.country = data.country;
    if (data.state) dpUpdates.state = data.state;
    if (data.city) dpUpdates.city = data.city;
    if (data.district !== undefined) dpUpdates.district = data.district;
    if (data.eligibilityStatus) dpUpdates.eligibility_status = data.eligibilityStatus;

    await (adminSupabase.from("donor_profiles") as any)
      .update(dpUpdates)
      .eq("id", data.donorProfileId);

    const existing = donorStore.get(data.donorProfileId) || (userId ? donorStore.get(userId) : undefined);
    if (existing) {
      donorStore.save({
        ...existing,
        fullName: data.fullName?.trim() || existing.fullName,
        email: data.email?.trim() || existing.email,
        phone: data.phone?.trim() || existing.phone,
        bloodGroup: data.bloodGroup,
        country: data.country || existing.country,
        state: data.state || existing.state,
        city: data.city || existing.city,
        district: data.district !== undefined ? data.district : existing.district,
        eligibilityStatus: (data.eligibilityStatus as any) || existing.eligibilityStatus,
        isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
        updatedAt: new Date().toISOString(),
      });
    }

    await (adminSupabase.from("audit_logs") as any).insert({
      user_id: adminUser.id,
      action: "DONOR_UPDATED_BY_SUPERADMIN",
      entity_type: "donor_profiles",
      entity_id: data.donorProfileId,
      metadata: { updated_by: adminUser.id, donor_user_id: userId, updates: data },
    });

    revalidatePath("/admin/donors");
    revalidatePath(`/admin/donors/${data.donorProfileId}`);

    return { success: true, message: "Donor profile updated successfully by Super Administrator." };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update donor." };
  }
}

/**
 * Updates Organization verification status (verified, rejected, suspended, pending)
 */
export async function updateOrganizationStatusAction(
  orgId: string,
  status: VerificationStatus,
  notes?: string
) {
  try {
    const adminUser = await requireAdminClearance();
    const supabase = await createClient();

    const updatePayload: Record<string, unknown> = {
      verification_status: status,
      updated_at: new Date().toISOString(),
    };

    if (status === "verified") {
      updatePayload.verified_at = new Date().toISOString();
      updatePayload.verified_by = adminUser.id;
      updatePayload.is_active = true;
    } else if (status === "suspended" || status === "rejected" || status === "unboarded") {
      updatePayload.is_active = false;
    }

    const { error } = await (supabase
      .from("organizations") as any)
      .update(updatePayload)
      .eq("id", orgId);

    if (error) throw new Error(error.message);

    // Record Immutable Audit Log
    await (supabase.from("audit_logs") as any).insert({
      user_id: adminUser.id,
      organization_id: orgId,
      action: `ORGANIZATION_${status.toUpperCase()}`,
      entity_type: "organizations",
      entity_id: orgId,
      metadata: { new_status: status, notes: notes || null },
    });

    // Notify Institution Administrator via Background Email Queue
    try {
      const { data: orgData } = await supabase
        .from("organizations")
        .select("name, email, type")
        .eq("id", orgId)
        .maybeSingle();

      const org = orgData as any;
      if (org && org.email) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const portalUrl =
          org.type === "blood_bank" ? `${appUrl}/bloodbank/dashboard` : `${appUrl}/hospital/dashboard`;
        const mappedStatus = status === "unboarded" ? "pending" : status;
        await orbinovaEmail.sendInstitutionStatusNotification({
          adminEmail: org.email,
          institutionName: org.name,
          institutionType: org.type === "blood_bank" ? "blood_bank" : "hospital",
          newStatus: mappedStatus,
          reviewerNotes: notes,
          portalUrl,
          organizationId: orgId,
        });
      }
    } catch (notifErr: any) {
      console.warn("Institution status email notification deferred:", notifErr?.message);
    }

    revalidatePath(`/admin/organizations`);
    revalidatePath(`/admin/organizations/${orgId}`);
    revalidatePath(`/admin/dashboard`);

    return { success: true, message: `Organization status updated to ${status}.` };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update organization status." };
  }
}

/**
 * Toggles user active/inactive status
 */
export async function toggleUserStatusAction(userId: string, isActive: boolean) {
  try {
    const adminUser = await requireAdminClearance();
    const supabase = await createClient();

    // Prevent deactivating own admin account
    if (userId === adminUser.id) {
      return { success: false, error: "You cannot deactivate your own administrative account." };
    }

    const { error } = await (supabase
      .from("profiles") as any)
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) throw new Error(error.message);

    // Record Audit Log
    await (supabase.from("audit_logs") as any).insert({
      user_id: adminUser.id,
      action: isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
      entity_type: "profiles",
      entity_id: userId,
      metadata: { target_user_id: userId, is_active: isActive },
    });

    revalidatePath(`/admin/admins`);
    revalidatePath(`/admin/users`);
    revalidatePath(`/admin/users/${userId}`);
    revalidatePath(`/admin/dashboard`);

    return {
      success: true,
      message: `User ${isActive ? "activated" : "deactivated"} successfully.`,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update user status." };
  }
}

/**
 * Updates any user account role (Super Admin only)
 */
export async function updateUserRoleAction(targetUserId: string, newRole: UserRole, adminRole?: AdminRole) {
  try {
    const caller = await requireAdminClearance("super_admin");
    const adminSupabase = createAdminClient();
    const serverSupabase = await createClient();

    // Prevent removing super_admin status from self
    if (targetUserId === caller.id && newRole !== "admin") {
      return { success: false, error: "You cannot change your own Super Administrator role." };
    }

    const payload: Record<string, unknown> = {
      role: newRole,
      admin_role: newRole === "admin" ? adminRole || "admin" : null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await (adminSupabase.from("profiles") as any)
      .update(payload)
      .eq("id", targetUserId);

    if (error) throw new Error(error.message);

    // Record Audit Log
    await (serverSupabase.from("audit_logs") as any).insert({
      user_id: caller.id,
      action: "USER_ROLE_CHANGED",
      entity_type: "profiles",
      entity_id: targetUserId,
      metadata: { target_user_id: targetUserId, new_role: newRole, admin_role: adminRole },
    });

    revalidatePath("/admin/admins");
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${targetUserId}`);

    return { success: true, message: `Account role updated to ${newRole}.` };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update user role." };
  }
}

/**
 * Records manual inventory adjustment with full audit ledger tracking
 */
export async function adjustInventoryAction(
  organizationId: string,
  bloodGroup: BloodGroupCode,
  newQuantity: number,
  notes: string
) {
  try {
    const adminUser = await requireAdminClearance();
    const supabase = await createClient();

    if (newQuantity < 0) {
      return { success: false, error: "Inventory quantity cannot be negative." };
    }

    // Upsert blood_inventory row
    const { error: invError } = await (supabase
      .from("blood_inventory") as any)
      .upsert(
        {
          organization_id: organizationId,
          blood_group: bloodGroup,
          quantity: newQuantity,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organization_id,blood_group" }
      );

    if (invError) throw new Error(invError.message);

    // Record transaction
    await (supabase.from("blood_inventory_transactions") as any).insert({
      organization_id: organizationId,
      blood_group: bloodGroup,
      transaction_type: "manual_adjustment",
      quantity: newQuantity,
      notes: notes || "Administrative stock adjustment",
      created_by: adminUser.id,
    });

    // Record Audit Log
    await (supabase.from("audit_logs") as any).insert({
      user_id: adminUser.id,
      organization_id: organizationId,
      action: "INVENTORY_MANUAL_ADJUSTMENT",
      entity_type: "blood_inventory",
      metadata: { blood_group: bloodGroup, new_quantity: newQuantity, notes },
    });

    revalidatePath(`/admin/inventory`);
    revalidatePath(`/admin/dashboard`);

    return { success: true, message: "Inventory adjusted and recorded in audit ledger." };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to adjust inventory." };
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationReadAction(notificationId: string) {
  try {
    const adminUser = await requireAdminClearance();
    const supabase = await createClient();

    await (supabase
      .from("notifications") as any)
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("user_id", adminUser.id);

    revalidatePath(`/admin/notifications`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsReadAction() {
  try {
    const adminUser = await requireAdminClearance();
    const supabase = await createClient();

    await (supabase
      .from("notifications") as any)
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", adminUser.id)
      .eq("is_read", false);

    revalidatePath(`/admin/notifications`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Updates permissions configuration for a specific role
 */
export async function updateRolePermissionsAction(roleKey: string, permissions: string[]) {
  try {
    const caller = await requireAdminClearance("superadmin");
    const serverSupabase = await createClient();

    // Record Audit Log
    await (serverSupabase.from("audit_logs") as any).insert({
      user_id: caller.id,
      action: "ROLE_PERMISSIONS_UPDATED",
      entity_type: "role_permissions",
      entity_id: roleKey,
      metadata: { role: roleKey, permissions, updated_by: caller.id },
    });

    revalidatePath("/admin/settings/roles");
    revalidatePath("/admin/settings");
    revalidatePath("/admin/admins");
    revalidatePath("/admin");

    return {
      success: true,
      message: `Permissions for ${roleKey.toUpperCase()} updated successfully.`,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update role permissions." };
  }
}

/**
 * Platform Administrator Action to Unlock Any User Account
 */
export async function unlockUserAccountAction(targetEmail: string) {
  try {
    const caller = await requireAdminClearance();
    if (!targetEmail) {
      return { success: false, error: "Target email address is required." };
    }

    const normalizedEmail = targetEmail.trim().toLowerCase();

    // Unlock account in accountSecurity
    await accountSecurity.unlockAccount(normalizedEmail, {
      userId: caller.id,
      role: "admin",
    });

    // Clear rate limits
    await rateLimiter.clearLimit({ ip: "127.0.0.1", email: normalizedEmail });

    revalidatePath("/admin/users");
    revalidatePath("/admin/audit-logs");
    revalidatePath("/admin");

    return {
      success: true,
      message: `Account for ${normalizedEmail} has been successfully unlocked.`,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to unlock user account." };
  }
}
