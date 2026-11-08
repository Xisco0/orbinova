import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const DEMO_USERS = [
  {
    email: "superadmin@orbinova.com",
    password: "SuperAdminPassword2026!",
    fullName: "ORBINOVA Super Admin",
    role: "admin",
    phone: "+2348011223344",
  },
  {
    email: "hospital@orbinova.com",
    password: "HospitalPassword2026!",
    fullName: "Lagos University Teaching Hospital (LUTH)",
    role: "hospital",
    phone: "+2348022334455",
  },
  {
    email: "bloodbank@orbinova.com",
    password: "BloodBankPassword2026!",
    fullName: "Lagos Island Central Blood Bank",
    role: "blood_bank",
    phone: "+2348033445566",
  },
  {
    email: "donor@orbinova.com",
    password: "DonorPassword2026!",
    fullName: "Emeka Obi (O- Universal Donor)",
    role: "donor",
    phone: "+2348055667788",
  },
];

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Supabase credentials missing in .env.local" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const results: Record<string, any>[] = [];

  try {
    // 1. Fetch existing auth users
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error("Supabase admin.listUsers error:", listError);
      return NextResponse.json(
        {
          error: listError.message || "Failed to list users from Supabase Auth Admin",
          status: (listError as any).status || 500,
          rawError: String(listError),
        },
        { status: 500 }
      );
    }

    const existingUsers = listData.users || [];

    for (const demo of DEMO_USERS) {
      let userId: string | null = null;
      let actionTaken = "";

      const match = existingUsers.find((u) => u.email === demo.email);

      if (match) {
        // Update user password and confirm email via official GoTrue Admin API
        const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
          match.id,
          {
            password: demo.password,
            email_confirm: true,
            user_metadata: {
              full_name: demo.fullName,
              role: demo.role,
              phone: demo.phone,
            },
          }
        );

        if (updateError) {
          results.push({ email: demo.email, error: updateError.message });
          continue;
        }

        userId = match.id;
        actionTaken = "password_updated_and_confirmed";
      } else {
        // Create user via official GoTrue Admin API
        const { data: createData, error: createError } = await supabase.auth.admin.createUser({
          email: demo.email,
          password: demo.password,
          email_confirm: true,
          user_metadata: {
            full_name: demo.fullName,
            role: demo.role,
            phone: demo.phone,
          },
        });

        if (createError) {
          results.push({ email: demo.email, error: createError.message });
          continue;
        }

        userId = createData.user.id;
        actionTaken = "created_and_confirmed";
      }

      // 2. Ensure Profile in public.profiles
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: userId,
          full_name: demo.fullName,
          email: demo.email,
          phone: demo.phone,
          role: demo.role as any,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      // 3. Ensure Organizations & Members
      if (demo.role === "hospital") {
        const { data: orgData } = await supabase
          .from("organizations")
          .upsert(
            {
              id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
              name: "Lagos State University Teaching Hospital (LASUTH)",
              organization_type: "hospital",
              email: "info@lasuth.org.ng",
              phone: "+23412345678",
              address: "1-5 Oba Akinjobi Way, GRA",
              city: "Ikeja",
              state: "Lagos",
              country: "Nigeria",
              latitude: 6.5954,
              longitude: 3.3488,
              license_number: "HEFAMAA-HOSP-2024-0019",
              verification_status: "verified",
              is_active: true,
            },
            { onConflict: "id" }
          )
          .select("id")
          .single();

        if (orgData) {
          await supabase.from("organization_members").upsert(
            {
              organization_id: orgData.id,
              user_id: userId,
              member_role: "owner",
              is_active: true,
            },
            { onConflict: "organization_id,user_id" }
          );
        }
      }

      if (demo.role === "blood_bank") {
        const { data: orgData } = await supabase
          .from("organizations")
          .upsert(
            {
              id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
              name: "Lagos State Blood Transfusion Service (LSBTS)",
              organization_type: "blood_bank",
              email: "bloodtransfusion@lagosstate.gov.ng",
              phone: "+23418765432",
              address: "General Hospital Complex, Broad Street",
              city: "Lagos Island",
              state: "Lagos",
              country: "Nigeria",
              latitude: 6.4531,
              longitude: 3.3958,
              license_number: "LSBTS-BB-2024-0003",
              verification_status: "verified",
              is_active: true,
            },
            { onConflict: "id" }
          )
          .select("id")
          .single();

        if (orgData) {
          await supabase.from("organization_members").upsert(
            {
              organization_id: orgData.id,
              user_id: userId,
              member_role: "owner",
              is_active: true,
            },
            { onConflict: "organization_id,user_id" }
          );
        }
      }

      if (demo.role === "donor") {
        await supabase.from("donor_profiles").upsert(
          {
            user_id: userId,
            blood_group: "O+",
            date_of_birth: "1996-05-14",
            gender: "male",
            address: "12 Allen Avenue",
            city: "Ikeja",
            state: "Lagos",
            country: "Nigeria",
            latitude: 6.6018,
            longitude: 3.3515,
            availability_status: "available",
            eligibility_status: "eligible",
            last_donation_date: new Date(Date.now() - 120 * 86400000).toISOString().split("T")[0],
            next_eligible_date: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
            emergency_contact_name: "Amaka Okafor",
            emergency_contact_phone: "+2348099887766",
            preferred_contact_method: "sms",
            total_donations: 4,
            verification_status: "verified",
            is_active: true,
          },
          { onConflict: "user_id" }
        );
      }

      results.push({
        email: demo.email,
        role: demo.role,
        action: actionTaken,
        userId,
        status: "READY_FOR_LOGIN",
        profileError: profileError?.message || null,
      });
    }

    return NextResponse.json({
      success: true,
      message: "All 4 demo accounts have been provisioned & confirmed in Supabase Auth!",
      accounts: results,
      credentials: {
        admin: { email: "superadmin@orbinova.com", password: "SuperAdminPassword2026!" },
        hospital: { email: "hospital@orbinova.com", password: "HospitalPassword2026!" },
        blood_bank: { email: "bloodbank@orbinova.com", password: "BloodBankPassword2026!" },
        donor: { email: "donor@orbinova.com", password: "DonorPassword2026!" },
      },
    });
  } catch (err: any) {
    console.error("Unhandled error in /api/seed-auth:", err);
    return NextResponse.json(
      {
        error: err?.message || String(err) || "Unknown server error",
        stack: err?.stack || null,
        type: typeof err,
      },
      { status: 500 }
    );
  }
}

