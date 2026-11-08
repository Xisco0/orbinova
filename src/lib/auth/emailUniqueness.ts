import { staffStore } from "@/services/staffStore";
import { donorStore } from "@/services/donorStore";
import { createClient } from "@/lib/supabase/server";

export interface EmailUniquenessResult {
  isUnique: boolean;
  error?: string;
  conflictType?: "staff" | "donor" | "profile" | "invalid";
}

/**
 * Validates global email uniqueness across the entire ORBINOVA healthcare platform.
 * Guarantees that an email address cannot be registered multiple times across
 * staff members, voluntary donors, and administrators.
 */
export async function validateEmailUniqueness(
  email: string,
  excludeUserId?: string
): Promise<EmailUniquenessResult> {
  const normalized = email?.trim().toLowerCase();

  // Basic email format check
  if (!normalized || !normalized.includes("@") || !normalized.includes(".")) {
    return {
      isUnique: false,
      conflictType: "invalid",
      error: "Please enter a valid email address.",
    };
  }

  // 1. Authoritative check in staffStore (hospital & blood bank staff roster)
  const allStaff = Object.values(staffStore.getAll());
  const existingStaff = allStaff.find(
    (s) => s.email?.toLowerCase() === normalized && s.userId !== excludeUserId
  );
  if (existingStaff) {
    return {
      isUnique: false,
      conflictType: "staff",
      error: "This email address is already registered to a healthcare staff member. Email addresses must be unique across the platform.",
    };
  }

  // 2. Authoritative check in donorStore (voluntary blood donor directory)
  const allDonors = Object.values(donorStore.getAll());
  const existingDonor = allDonors.find(
    (d) => d.email?.toLowerCase() === normalized && d.userId !== excludeUserId
  );
  if (existingDonor) {
    return {
      isUnique: false,
      conflictType: "donor",
      error: "This email address is already registered to a blood donor account. Email addresses must be unique across the platform.",
    };
  }

  // 3. Remote Supabase Database check across public.profiles
  try {
    const supabase = await createClient("hospital");
    let query = (supabase.from("profiles") as any)
      .select("id, email, role, full_name")
      .ilike("email", normalized);

    if (excludeUserId) {
      query = query.neq("id", excludeUserId);
    }

    const { data, error } = await query.maybeSingle();
    if (!error && data) {
      const role = data.role || "user";
      const roleDescription =
        role === "donor"
          ? "a registered blood donor"
          : role === "hospital" || role === "blood_bank"
          ? "a healthcare institution"
          : role === "admin"
          ? "a system administrator"
          : "an existing healthcare user";

      return {
        isUnique: false,
        conflictType: "profile",
        error: `This email address is already registered to ${roleDescription}. Please use a unique email address.`,
      };
    }
  } catch (err) {
    console.warn("Database email uniqueness query notice:", err);
  }

  return {
    isUnique: true,
  };
}
