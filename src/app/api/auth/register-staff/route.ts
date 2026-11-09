import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateScopedEmailUniqueness } from "@/lib/auth/emailUniqueness";

export const dynamic = "force-dynamic";

const DEFAULT_PASSWORDS: Record<string, string> = {
  hospital: "HospitalPassword2026!",
  admin: "SuperAdminPassword2026!",
  blood_bank: "BloodBankPassword2026!",
  donor: "DonorPassword2026!",
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, role, fullName, phone, organizationName } = body;

    if (!email || !role) {
      return NextResponse.json(
        { success: false, error: "Email and role are required." },
        { status: 400 }
      );
    }

    // Table-Level Email Uniqueness Guard (Scope: Staff)
    const emailUniqueness = await validateScopedEmailUniqueness(email, "staff");
    if (!emailUniqueness.isUnique) {
      return NextResponse.json(
        {
          success: false,
          error: emailUniqueness.error || "A staff member with this email address already exists.",
        },
        { status: 409 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://lrbncvcmhzsdnkushsrf.supabase.co";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_ZH8SuN_h4G4shc--xWhT-Q_L8aFSX7p";
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const defaultPassword = DEFAULT_PASSWORDS[role] || "OrbinovaHealthcare2026!";

    // If serviceRoleKey is available, create and auto-confirm user
    if (serviceRoleKey && serviceRoleKey !== "placeholder-service-role-key") {
      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: defaultPassword,
        email_confirm: true,
        user_metadata: {
          role,
          full_name: fullName || `${role.toUpperCase()} Staff`,
          phone: phone || "",
          organization_name: organizationName || "",
        },
      });

      if (createError) {
        return NextResponse.json(
          { success: false, error: createError.message },
          { status: 400 }
        );
      }

      // Upsert public profile
      await adminClient.from("profiles").upsert({
        id: createData.user.id,
        email,
        full_name: fullName || `${role.toUpperCase()} Staff`,
        phone: phone || "",
        role,
        is_active: true,
        updated_at: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: `Account created for ${email}. Default credentials assigned.`,
        email,
        role,
        defaultPassword,
        userId: createData.user.id,
      });
    }

    // Otherwise, dispatch public Supabase signup (triggers verification email to registered email)
    const publicClient = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await publicClient.auth.signUp({
      email,
      password: defaultPassword,
      options: {
        data: {
          role,
          full_name: fullName || `${role.toUpperCase()} Staff`,
          phone: phone || "",
          organization_name: organizationName || "",
        },
      },
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Registration successful. Default password set and confirmation email dispatched to ${email}.`,
      email,
      role,
      defaultPassword,
      userId: data.user?.id,
      confirmationDispatched: Boolean(data.user?.confirmation_sent_at),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to register staff" },
      { status: 500 }
    );
  }
}
