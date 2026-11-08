-- ==============================================================================
-- ORBINOVA HOSPITAL STAFF ACCOUNTS SEED SCRIPT
-- Seeds authenticated clinical personnel accounts with pre-confirmed emails
-- ==============================================================================

DO $$
DECLARE
  v_hospital_org_id UUID := 'a1111111-1111-1111-1111-111111111111'; -- LUTH
  v_doctor_id UUID := 'd1111111-0000-0000-0000-000000000001';
  v_radiologist_id UUID := 'd1111111-0000-0000-0000-000000000002';
  v_coordinator_id UUID := 'd1111111-0000-0000-0000-000000000003';
  v_nurse_id UUID := 'd1111111-0000-0000-0000-000000000004';
BEGIN

  -- 1. AUTH USERS (with pre-confirmed email and default password)
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at
  )
  VALUES
    -- 1.1 Doctor: doctor@orbinova.com / DoctorPassword2026!
    (v_doctor_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'doctor@orbinova.com', crypt('DoctorPassword2026!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Dr. Tunde Fashola (Lead Clinician)","role":"hospital"}'::jsonb,
     false, now(), now()),

    -- 1.2 Radiologist: radiologist@orbinova.com / RadiologistPassword2026!
    (v_radiologist_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'radiologist@orbinova.com', crypt('RadiologistPassword2026!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Dr. Chioma Okonkwo (Head Radiologist)","role":"hospital"}'::jsonb,
     false, now(), now()),

    -- 1.3 Donor Coordinator: coordinator@orbinova.com / CoordinatorPassword2026!
    (v_coordinator_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'coordinator@orbinova.com', crypt('CoordinatorPassword2026!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Zainab Danjuma (Donor Coordinator)","role":"hospital"}'::jsonb,
     false, now(), now()),

    -- 1.4 Nurse: nurse@orbinova.com / NursePassword2026!
    (v_nurse_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'nurse@orbinova.com', crypt('NursePassword2026!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Nurse Funke Balogun (Clinical Nurse)","role":"hospital"}'::jsonb,
     false, now(), now())

  ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = now(),
    updated_at = now();

  -- 2. AUTH IDENTITIES (Required by Supabase GoTrue Auth)
  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES
    (v_doctor_id, v_doctor_id, format('{"sub":"%s","email":"%s"}', v_doctor_id, 'doctor@orbinova.com')::jsonb, 'email', v_doctor_id::text, now(), now(), now()),
    (v_radiologist_id, v_radiologist_id, format('{"sub":"%s","email":"%s"}', v_radiologist_id, 'radiologist@orbinova.com')::jsonb, 'email', v_radiologist_id::text, now(), now(), now()),
    (v_coordinator_id, v_coordinator_id, format('{"sub":"%s","email":"%s"}', v_coordinator_id, 'coordinator@orbinova.com')::jsonb, 'email', v_coordinator_id::text, now(), now(), now()),
    (v_nurse_id, v_nurse_id, format('{"sub":"%s","email":"%s"}', v_nurse_id, 'nurse@orbinova.com')::jsonb, 'email', v_nurse_id::text, now(), now(), now())
  ON CONFLICT (provider, provider_id) DO UPDATE SET
    identity_data = EXCLUDED.identity_data,
    updated_at = now();

  -- 3. PUBLIC PROFILES
  INSERT INTO public.profiles (id, full_name, email, phone, role, is_active, created_at, updated_at)
  VALUES
    (v_doctor_id, 'Dr. Tunde Fashola (Lead Clinician)', 'doctor@orbinova.com', '+2348031112233', 'hospital', true, now(), now()),
    (v_radiologist_id, 'Dr. Chioma Okonkwo (Head Radiologist)', 'radiologist@orbinova.com', '+2348032223344', 'hospital', true, now(), now()),
    (v_coordinator_id, 'Zainab Danjuma (Donor Coordinator)', 'coordinator@orbinova.com', '+2348033334455', 'hospital', true, now(), now()),
    (v_nurse_id, 'Nurse Funke Balogun (Clinical Nurse)', 'nurse@orbinova.com', '+2348034445566', 'hospital', true, now(), now())
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = 'hospital',
    is_active = true,
    updated_at = now();

  -- 4. ORGANIZATION MEMBERS (Linked to LUTH Hospital with granular member roles)
  INSERT INTO public.organization_members (organization_id, user_id, member_role, is_active, created_at, updated_at)
  VALUES
    (v_hospital_org_id, v_doctor_id, 'doctor', true, now(), now()),
    (v_hospital_org_id, v_radiologist_id, 'radiologist', true, now(), now()),
    (v_hospital_org_id, v_coordinator_id, 'donor_coordinator', true, now(), now()),
    (v_hospital_org_id, v_nurse_id, 'nurse', true, now(), now())
  ON CONFLICT (organization_id, user_id) DO UPDATE SET
    member_role = EXCLUDED.member_role,
    is_active = true,
    updated_at = now();

END $$;
