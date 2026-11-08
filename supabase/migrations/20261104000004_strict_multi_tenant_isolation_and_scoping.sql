-- ==============================================================================
-- ORBINOVA MIGRATION: STRICT MULTI-TENANT ISOLATION, SCOPING & INDEXES
-- Migration: 20261104000004_strict_multi_tenant_isolation_and_scoping.sql
-- ==============================================================================

-- 1. High-Performance Multi-Tenant Composite Indexes
CREATE INDEX IF NOT EXISTS idx_org_members_tenant_active 
  ON public.organization_members(organization_id, is_active);

CREATE INDEX IF NOT EXISTS idx_blood_requests_tenant_status 
  ON public.blood_requests(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_blood_inventory_tenant 
  ON public.blood_inventory(organization_id);

CREATE INDEX IF NOT EXISTS idx_blood_inv_tx_tenant 
  ON public.blood_inventory_transactions(organization_id, created_at);

CREATE INDEX IF NOT EXISTS idx_donations_tenant 
  ON public.donations(organization_id, created_at);

CREATE INDEX IF NOT EXISTS idx_donor_requests_blood_req 
  ON public.donor_requests(blood_request_id, status);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant 
  ON public.audit_logs(organization_id, created_at);

-- 2. Enhance add_facility_staff_member RPC with configurable active state
CREATE OR REPLACE FUNCTION public.add_facility_staff_member(
  p_org_id uuid,
  p_full_name text,
  p_email text,
  p_phone text,
  p_member_role text,
  p_password text DEFAULT 'StaffPassword2026!',
  p_is_active boolean DEFAULT FALSE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
  v_existing_user_id uuid;
  v_org_type text;
BEGIN
  -- 1. Verify organization exists and is approved
  SELECT organization_type INTO v_org_type
  FROM public.organizations
  WHERE id = p_org_id;

  IF v_org_type IS NULL THEN
    RAISE EXCEPTION 'Target institution % does not exist.', p_org_id;
  END IF;

  -- 2. Check if auth user already exists for this email
  SELECT id INTO v_existing_user_id
  FROM auth.users
  WHERE email = lower(trim(p_email));

  IF v_existing_user_id IS NOT NULL THEN
    v_user_id := v_existing_user_id;
  ELSE
    v_user_id := gen_random_uuid();

    -- Create user in auth.users
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at
    )
    VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      lower(trim(p_email)),
      crypt(p_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', trim(p_full_name), 'role', v_org_type),
      false,
      now(),
      now()
    );

    -- Create identity in auth.identities
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    )
    VALUES (
      v_user_id,
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', lower(trim(p_email))),
      'email',
      v_user_id::text,
      now(),
      now(),
      now()
    );
  END IF;

  -- 3. Upsert into public.profiles (respecting p_is_active)
  INSERT INTO public.profiles (
    id, full_name, email, phone, role, is_active, created_at, updated_at
  )
  VALUES (
    v_user_id,
    trim(p_full_name),
    lower(trim(p_email)),
    trim(p_phone),
    v_org_type::user_role,
    p_is_active,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    updated_at = now();

  -- 4. Upsert into public.organization_members
  INSERT INTO public.organization_members (
    organization_id, user_id, member_role, is_active, created_at, updated_at
  )
  VALUES (
    p_org_id,
    v_user_id,
    p_member_role::org_member_role,
    p_is_active,
    now(),
    now()
  )
  ON CONFLICT (organization_id, user_id) DO UPDATE SET
    member_role = EXCLUDED.member_role,
    is_active = EXCLUDED.is_active,
    updated_at = now();

  -- 5. Record Audit Log
  INSERT INTO public.audit_logs (
    organization_id, action, entity_type, entity_id, metadata, created_at
  )
  VALUES (
    p_org_id,
    'STAFF_MEMBER_ONBOARDED',
    'organization_members',
    v_user_id,
    jsonb_build_object(
      'email', lower(trim(p_email)),
      'role', p_member_role,
      'is_active', p_is_active
    ),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', lower(trim(p_email)),
    'is_active', p_is_active
  );
END;
$$;

-- 3. Provision Multi-Tenant Verification Organizations
DO $$
BEGIN
  -- Hospital A: LUTH
  INSERT INTO public.organizations (
    id, name, organization_type, email, phone, address, city, state, country,
    license_number, verification_status, verified_at, is_active
  )
  VALUES (
    'a1111111-1111-1111-1111-111111111111',
    'Lagos University Teaching Hospital (LUTH)',
    'hospital',
    'admin@luth.health.gov.ng',
    '+23412345001',
    'Ishaga Road, Idi-Araba',
    'Surulere',
    'Lagos',
    'Nigeria',
    'RC-HOSP-001',
    'verified',
    now(),
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    verification_status = 'verified',
    is_active = true;

  -- Hospital B: Eko Hospital
  INSERT INTO public.organizations (
    id, name, organization_type, email, phone, address, city, state, country,
    license_number, verification_status, verified_at, is_active
  )
  VALUES (
    'a2222222-2222-2222-2222-222222222222',
    'Eko Hospital Victoria Island',
    'hospital',
    'info@ekohospital.com',
    '+23412345002',
    '31 Mobolaji Bank Anthony Way',
    'Ikeja',
    'Lagos',
    'Nigeria',
    'RC-HOSP-002',
    'verified',
    now(),
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    verification_status = 'verified',
    is_active = true;

  -- Blood Bank A: Lagos Island Central Blood Bank
  INSERT INTO public.organizations (
    id, name, organization_type, email, phone, address, city, state, country,
    license_number, verification_status, verified_at, is_active
  )
  VALUES (
    'b1111111-1111-1111-1111-111111111111',
    'Lagos Island Central Blood Bank',
    'blood_bank',
    'operations@lagosbloodbank.org',
    '+23412345003',
    'Campbell Street, Lagos Island',
    'Lagos Island',
    'Lagos',
    'Nigeria',
    'RC-BB-001',
    'verified',
    now(),
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    verification_status = 'verified',
    is_active = true;

  -- Blood Bank B: Ikeja Regional Blood Transfusion Center
  INSERT INTO public.organizations (
    id, name, organization_type, email, phone, address, city, state, country,
    license_number, verification_status, verified_at, is_active
  )
  VALUES (
    'b2222222-2222-2222-2222-222222222222',
    'Ikeja Regional Blood Transfusion Center',
    'blood_bank',
    'contact@ikejabloodcenter.org',
    '+23412345004',
    'Oba Akran Avenue',
    'Ikeja',
    'Lagos',
    'Nigeria',
    'RC-BB-002',
    'verified',
    now(),
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    verification_status = 'verified',
    is_active = true;

END $$;
