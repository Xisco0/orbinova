-- ==============================================================================
-- 1. ADD FRANCIS BAMIRIN DIRECTLY AS VERIFIED DOCTOR AT LUTH
-- ==============================================================================

DO $$
DECLARE
  v_hospital_org_id UUID := 'a1111111-1111-1111-1111-111111111111'; -- LUTH
  v_user_id UUID := 'd1111111-0000-0000-0000-000000000045';
  v_email TEXT := 'francisbamirin45@gmail.com';
  v_full_name TEXT := 'Dr. Francis Bamirin';
  v_password TEXT := 'StaffPassword2026!';
BEGIN

  -- 1. Insert into auth.users (Pre-confirmed email, encrypted password)
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at
  )
  VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    v_email,
    crypt(v_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', v_full_name, 'role', 'hospital'),
    false,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    encrypted_password = crypt(v_password, gen_salt('bf')),
    email_confirmed_at = now(),
    updated_at = now();

  -- 2. Insert into auth.identities
  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (
    v_user_id,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email',
    v_user_id::text,
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider, provider_id) DO UPDATE SET
    identity_data = EXCLUDED.identity_data,
    updated_at = now();

  -- 3. Upsert into public.profiles
  INSERT INTO public.profiles (id, full_name, email, phone, role, is_active, created_at, updated_at)
  VALUES (
    v_user_id,
    v_full_name,
    v_email,
    '+2348012345678',
    'hospital',
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = 'hospital',
    is_active = true,
    updated_at = now();

  -- 4. Upsert into public.organization_members
  INSERT INTO public.organization_members (organization_id, user_id, member_role, is_active, created_at, updated_at)
  VALUES (
    v_hospital_org_id,
    v_user_id,
    'doctor',
    true,
    now(),
    now()
  )
  ON CONFLICT (organization_id, user_id) DO UPDATE SET
    member_role = 'doctor',
    is_active = true,
    updated_at = now();

END $$;

-- ==============================================================================
-- 2. AUTOMATIC POSTGRES RPC FUNCTION TO ADD STAFF DIRECTLY WITHOUT RLS/RATE LIMIT
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.add_facility_staff_member(
  p_org_id uuid,
  p_full_name text,
  p_email text,
  p_phone text,
  p_member_role text,
  p_password text DEFAULT 'StaffPassword2026!'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
  v_encrypted_pw text;
BEGIN
  -- Look for existing auth user
  SELECT id INTO v_user_id FROM auth.users WHERE email = lower(trim(p_email)) LIMIT 1;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    v_encrypted_pw := crypt(p_password, gen_salt('bf'));

    -- 1. Create in auth.users with pre-confirmed email
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      lower(trim(p_email)),
      v_encrypted_pw,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', p_full_name, 'role', 'hospital'),
      false,
      now(),
      now()
    );

    -- 2. Create in auth.identities
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
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
  ELSE
    -- If user already exists, update password and confirm email
    UPDATE auth.users 
    SET encrypted_password = crypt(p_password, gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        updated_at = now()
    WHERE id = v_user_id;
  END IF;

  -- 3. Upsert into public.profiles
  INSERT INTO public.profiles (id, full_name, email, phone, role, is_active, created_at, updated_at)
  VALUES (v_user_id, p_full_name, lower(trim(p_email)), p_phone, 'hospital', true, now(), now())
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    is_active = true,
    updated_at = now();

  -- 4. Upsert into public.organization_members
  INSERT INTO public.organization_members (organization_id, user_id, member_role, is_active, created_at, updated_at)
  VALUES (p_org_id, v_user_id, p_member_role, true, now(), now())
  ON CONFLICT (organization_id, user_id) DO UPDATE SET
    member_role = EXCLUDED.member_role,
    is_active = true,
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', lower(trim(p_email)),
    'full_name', p_full_name,
    'member_role', p_member_role
  );
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.add_facility_staff_member TO authenticated, anon;
