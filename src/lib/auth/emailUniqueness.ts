import { staffStore } from "@/services/staffStore";
import { donorStore } from "@/services/donorStore";
import { createClient } from "@/lib/supabase/server";

export type EmailUniquenessScope = "donor" | "staff" | "organization" | "admin" | "global";

export interface EmailUniquenessOptions {
  organizationId?: string;
  excludeUserId?: string;
  candidateName?: string;
}

export interface ScopedEmailUniquenessResult {
  isUnique: boolean;
  error?: string;
  conflictType?: "staff" | "donor" | "organization" | "profile" | "identity_mismatch" | "invalid";
  isExistingCentralUser?: boolean;
  existingUserId?: string;
  existingUserFullName?: string;
  existingUserRole?: string;
  identityVerified?: boolean;
}

/**
 * Normalizes full name by lowercasing, stripping medical/professional titles and punctuation.
 */
export function normalizeName(name?: string | null): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/\b(dr|doctor|nurse|prof|professor|mr|mrs|ms|cmo|md|rn|technician|lead|head)\b\.?/gi, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Verifies whether candidate name matches an existing account name
 * to guarantee we never link unrelated people just because an email was typed.
 */
export function verifyPersonIdentity(
  candidateFullName: string,
  existingFullName?: string | null
): {
  verified: boolean;
  confidence: "high" | "moderate" | "unverified";
  reason?: string;
} {
  if (!existingFullName || !existingFullName.trim()) {
    return { verified: true, confidence: "moderate" };
  }

  const cleanCandidate = normalizeName(candidateFullName);
  const cleanExisting = normalizeName(existingFullName);

  if (!cleanCandidate) {
    return { verified: true, confidence: "moderate" };
  }

  // Exact match after title/punctuation normalization
  if (cleanCandidate === cleanExisting) {
    return { verified: true, confidence: "high" };
  }

  const candParts = cleanCandidate.split(" ").filter((p) => p.length >= 2);
  const existParts = cleanExisting.split(" ").filter((p) => p.length >= 2);

  // Overlap of component name tokens (first name, surname, other names)
  const shared = candParts.filter((p) => existParts.includes(p));

  if (shared.length >= 2 || (candParts.length === 1 && shared.length === 1)) {
    return { verified: true, confidence: "high" };
  }

  if (shared.length === 1 && (candParts.length <= 2 || existParts.length <= 2)) {
    return { verified: true, confidence: "moderate" };
  }

  return {
    verified: false,
    confidence: "unverified",
    reason: `The name provided ('${candidateFullName}') does not sufficiently match the existing account name ('${existingFullName}'). Identity verification failed.`,
  };
}

/**
 * Validates table-level email uniqueness and identifies existing central user accounts
 * for safe identity linking across ORBINOVA roles.
 *
 * Rules:
 * 1. Scope 'donor': Checks donorStore and donor_profiles.
 *    - Rejects if email is already in the donor table.
 *    - Allows if email is in staffStore or profiles (enables identity linking without duplicate login).
 * 2. Scope 'staff': Checks staff within options.organizationId.
 *    - Rejects if email is already registered in the same institution.
 *    - Allows if email is registered as a voluntary donor or in another institution.
 * 3. Scope 'organization': Checks organizations table.
 *    - Rejects if institutional contact email is duplicate.
 */
export async function validateScopedEmailUniqueness(
  email: string,
  scope: EmailUniquenessScope = "donor",
  options?: EmailUniquenessOptions
): Promise<ScopedEmailUniquenessResult> {
  const normalized = email?.trim().toLowerCase();

  // Basic email syntax validation
  if (!normalized || !normalized.includes("@") || !normalized.includes(".")) {
    return {
      isUnique: false,
      conflictType: "invalid",
      error: "Please enter a valid email address.",
    };
  }

  const excludeUserId = options?.excludeUserId;
  const organizationId = options?.organizationId;
  const candidateName = options?.candidateName;

  // =========================================================================
  // SCOPE: DONOR
  // =========================================================================
  if (scope === "donor") {
    // 1. Enforce strict uniqueness within the DONOR table (donorStore)
    const allDonors = Object.values(donorStore.getAll());
    const existingDonor = allDonors.find(
      (d) => d.email?.toLowerCase() === normalized && d.userId !== excludeUserId
    );
    if (existingDonor) {
      return {
        isUnique: false,
        conflictType: "donor",
        error: "This email address is already registered to a voluntary donor. Each donor record must have a unique email address.",
      };
    }

    // 2. Remote Supabase donor_profiles check
    try {
      const supabase = await createClient("hospital");
      const { data: dbDonor } = await (supabase.from("donor_profiles") as any)
        .select("id, user_id, profiles(id, email, full_name)")
        .limit(10);

      if (dbDonor && Array.isArray(dbDonor)) {
        const found = dbDonor.find((d: any) => {
          const prof = Array.isArray(d.profiles) ? d.profiles[0] : d.profiles;
          return prof?.email?.toLowerCase() === normalized && d.user_id !== excludeUserId;
        });
        if (found) {
          return {
            isUnique: false,
            conflictType: "donor",
            error: "This email address is already registered to a voluntary donor. Each donor record must have a unique email address.",
          };
        }
      }
    } catch {}

    // 3. Check for existing central user account (Staff, Admin, or User profile)
    // If found, this is an approved identity-linking candidate!
    const staff = staffStore.get(normalized);
    if (staff && staff.userId !== excludeUserId) {
      if (candidateName) {
        const verifyRes = verifyPersonIdentity(candidateName, staff.fullName);
        if (!verifyRes.verified) {
          return {
            isUnique: false,
            conflictType: "identity_mismatch",
            error: verifyRes.reason || "This email belongs to an existing account with different personal identity information.",
            isExistingCentralUser: true,
            existingUserId: staff.userId,
            existingUserFullName: staff.fullName,
          };
        }
      }
      return {
        isUnique: true,
        isExistingCentralUser: true,
        existingUserId: staff.userId,
        existingUserFullName: staff.fullName,
        existingUserRole: "hospital",
        identityVerified: true,
      };
    }

    try {
      const supabase = await createClient("hospital");
      const { data: profile } = await (supabase.from("profiles") as any)
        .select("id, email, full_name, role")
        .ilike("email", normalized)
        .maybeSingle();

      if (profile && profile.id !== excludeUserId) {
        if (candidateName) {
          const verifyRes = verifyPersonIdentity(candidateName, profile.full_name);
          if (!verifyRes.verified) {
            return {
              isUnique: false,
              conflictType: "identity_mismatch",
              error: verifyRes.reason || "This email belongs to an existing account with different personal identity information.",
              isExistingCentralUser: true,
              existingUserId: profile.id,
              existingUserFullName: profile.full_name,
            };
          }
        }
        return {
          isUnique: true,
          isExistingCentralUser: true,
          existingUserId: profile.id,
          existingUserFullName: profile.full_name,
          existingUserRole: profile.role,
          identityVerified: true,
        };
      }
    } catch {}

    return {
      isUnique: true,
      isExistingCentralUser: false,
    };
  }

  // =========================================================================
  // SCOPE: STAFF
  // =========================================================================
  if (scope === "staff") {
    // 1. Check if email already belongs to a staff member in the SAME organization
    const allStaff = Object.values(staffStore.getAll());
    const duplicateInSameOrg = allStaff.find(
      (s) =>
        s.email?.toLowerCase() === normalized &&
        s.userId !== excludeUserId &&
        (!organizationId || s.organizationId === organizationId)
    );
    if (duplicateInSameOrg) {
      return {
        isUnique: false,
        conflictType: "staff",
        error: "This email address is already registered to a staff member at this facility. Staff email addresses must be unique within the institution.",
      };
    }

    // 2. Check Supabase organization_members for this organization
    if (organizationId) {
      try {
        const supabase = await createClient("hospital");
        const { data: members } = await (supabase.from("organization_members") as any)
          .select("id, user_id, organization_id, profiles(email, full_name)")
          .eq("organization_id", organizationId);

        if (members && Array.isArray(members)) {
          const dup = members.find((m: any) => {
            const prof = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
            return prof?.email?.toLowerCase() === normalized && m.user_id !== excludeUserId;
          });
          if (dup) {
            return {
              isUnique: false,
              conflictType: "staff",
              error: "This email address is already registered to a staff member at this facility.",
            };
          }
        }
      } catch {}
    }

    // 3. If email exists in donorStore or another institution, it's allowed for identity linking
    const existingDonor = donorStore.get(normalized);
    if (existingDonor && existingDonor.userId !== excludeUserId) {
      return {
        isUnique: true,
        isExistingCentralUser: true,
        existingUserId: existingDonor.userId,
        existingUserFullName: existingDonor.fullName,
        existingUserRole: "donor",
      };
    }

    try {
      const supabase = await createClient("hospital");
      const { data: profile } = await (supabase.from("profiles") as any)
        .select("id, email, full_name, role")
        .ilike("email", normalized)
        .maybeSingle();

      if (profile && profile.id !== excludeUserId) {
        return {
          isUnique: true,
          isExistingCentralUser: true,
          existingUserId: profile.id,
          existingUserFullName: profile.full_name,
          existingUserRole: profile.role,
        };
      }
    } catch {}

    return {
      isUnique: true,
      isExistingCentralUser: false,
    };
  }

  // =========================================================================
  // SCOPE: ORGANIZATION
  // =========================================================================
  if (scope === "organization") {
    try {
      const supabase = await createClient("hospital");
      const { data: org } = await (supabase.from("organizations") as any)
        .select("id, name, email")
        .ilike("email", normalized)
        .maybeSingle();

      if (org && org.id !== excludeUserId) {
        return {
          isUnique: false,
          conflictType: "organization",
          error: `This official email address is already registered to ${org.name || "a healthcare institution"}.`,
        };
      }
    } catch {}

    return {
      isUnique: true,
    };
  }

  // =========================================================================
  // FALLBACK / GLOBAL CHECK
  // =========================================================================
  return validateScopedEmailUniqueness(email, "donor", options);
}

/**
 * Backward-compatible wrapper for existing call-sites
 */
export async function validateEmailUniqueness(
  email: string,
  excludeUserId?: string,
  scope: EmailUniquenessScope = "donor"
): Promise<ScopedEmailUniquenessResult> {
  return validateScopedEmailUniqueness(email, scope, { excludeUserId });
}
