-- ==============================================================================
-- SmartDonor Migration: Provision Demo Users & Initial Organizations
-- ==============================================================================

DO $$
DECLARE
  v_admin_id UUID := '11111111-1111-1111-1111-111111111111';
  v_hospital_user_id UUID := '22222222-2222-2222-2222-222222222222';
  v_blood_bank_user_id UUID := '33333333-3333-3333-3333-333333333333';
  v_donor_user_id UUID := '44444444-4444-4444-4444-444444444444';
  v_hospital_org_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_blood_bank_org_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
BEGIN

  -- 1. Auth Users
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at)
  VALUES
    (v_admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@smartdonor.ng', crypt('AdminPassword123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"SmartDonor Super Admin","role":"admin"}'::jsonb, FALSE, NOW(), NOW()),
    (v_hospital_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'lasuth@smartdonor.ng', crypt('HospitalPassword123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Dr. Babatunde Alabi (LASUTH)","role":"hospital"}'::jsonb, FALSE, NOW(), NOW()),
    (v_blood_bank_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'lagosbloodbank@smartdonor.ng', crypt('BloodBankPassword123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Ngozi Eze (Lagos Blood Bank)","role":"blood_bank"}'::jsonb, FALSE, NOW(), NOW()),
    (v_donor_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'donor@smartdonor.ng', crypt('DonorPassword123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Emeka Okafor","role":"donor"}'::jsonb, FALSE, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET encrypted_password = EXCLUDED.encrypted_password, email_confirmed_at = NOW();

  -- 1.1 Auth Identities (Required by Supabase GoTrue Auth)
  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES
    (v_admin_id, v_admin_id, format('{"sub":"%s","email":"%s"}', v_admin_id, 'admin@smartdonor.ng')::jsonb, 'email', v_admin_id, NOW(), NOW(), NOW()),
    (v_hospital_user_id, v_hospital_user_id, format('{"sub":"%s","email":"%s"}', v_hospital_user_id, 'lasuth@smartdonor.ng')::jsonb, 'email', v_hospital_user_id, NOW(), NOW(), NOW()),
    (v_blood_bank_user_id, v_blood_bank_user_id, format('{"sub":"%s","email":"%s"}', v_blood_bank_user_id, 'lagosbloodbank@smartdonor.ng')::jsonb, 'email', v_blood_bank_user_id, NOW(), NOW(), NOW()),
    (v_donor_user_id, v_donor_user_id, format('{"sub":"%s","email":"%s"}', v_donor_user_id, 'donor@smartdonor.ng')::jsonb, 'email', v_donor_user_id, NOW(), NOW(), NOW())
  ON CONFLICT (provider, provider_id) DO UPDATE SET identity_data = EXCLUDED.identity_data, updated_at = NOW();

  -- 2. Public Profiles
  INSERT INTO public.profiles (id, full_name, email, phone, role, is_active)
  VALUES
    (v_admin_id, 'SmartDonor Super Admin', 'admin@smartdonor.ng', '+2348011223344', 'admin', TRUE),
    (v_hospital_user_id, 'Dr. Babatunde Alabi', 'lasuth@smartdonor.ng', '+2348022334455', 'hospital', TRUE),
    (v_blood_bank_user_id, 'Ngozi Eze', 'lagosbloodbank@smartdonor.ng', '+2348033445566', 'blood_bank', TRUE),
    (v_donor_user_id, 'Emeka Okafor', 'donor@smartdonor.ng', '+2348055667788', 'donor', TRUE)
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, is_active = TRUE;

  -- 3. Organizations
  INSERT INTO public.organizations (id, name, organization_type, email, phone, address, city, state, country, latitude, longitude, license_number, verification_status, verified_at, is_active)
  VALUES
    (v_hospital_org_id, 'Lagos State University Teaching Hospital (LASUTH)', 'hospital', 'info@lasuth.org.ng', '+23412345678', '1-5 Oba Akinjobi Way, GRA', 'Ikeja', 'Lagos', 'Nigeria', 6.5954, 3.3488, 'HEFAMAA-HOSP-2024-0019', 'verified', NOW(), TRUE),
    (v_blood_bank_org_id, 'Lagos State Blood Transfusion Service (LSBTS)', 'blood_bank', 'bloodtransfusion@lagosstate.gov.ng', '+23418765432', 'General Hospital Complex, Broad Street', 'Lagos Island', 'Lagos', 'Nigeria', 6.4531, 3.3958, 'LSBTS-BB-2024-0003', 'verified', NOW(), TRUE)
  ON CONFLICT (id) DO UPDATE SET verification_status = 'verified', is_active = TRUE;

  -- 4. Organization Members
  INSERT INTO public.organization_members (organization_id, user_id, member_role, is_active)
  VALUES
    (v_hospital_org_id, v_hospital_user_id, 'owner', TRUE),
    (v_blood_bank_org_id, v_blood_bank_user_id, 'owner', TRUE)
  ON CONFLICT (organization_id, user_id) DO UPDATE SET member_role = 'owner', is_active = TRUE;

  -- 5. Donor Profile
  INSERT INTO public.donor_profiles (user_id, blood_group, date_of_birth, gender, address, city, state, country, latitude, longitude, availability_status, eligibility_status, last_donation_date, next_eligible_date, emergency_contact_name, emergency_contact_phone, preferred_contact_method, total_donations, verification_status, is_active)
  VALUES
    (v_donor_user_id, 'O+', '1996-05-14', 'male', '12 Allen Avenue', 'Ikeja', 'Lagos', 'Nigeria', 6.6018, 3.3515, 'available', 'eligible', CURRENT_DATE - INTERVAL '120 days', CURRENT_DATE - INTERVAL '30 days', 'Amaka Okafor', '+2348099887766', 'sms', 4, 'verified', TRUE)
  ON CONFLICT (user_id) DO UPDATE SET blood_group = 'O+', availability_status = 'available', eligibility_status = 'eligible', verification_status = 'verified', is_active = TRUE;

END $$;
