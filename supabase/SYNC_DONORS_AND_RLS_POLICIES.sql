-- ==============================================================================
-- ORBINOVA — CONSOLIDATED DONOR PROFILES & DONATIONS SETUP FOR SUPABASE
-- 
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Select your project
-- 3. Click "SQL Editor" in the left sidebar
-- 4. Click "+ New Query", paste this entire script, and click "RUN" (green button)
-- ==============================================================================

-- 1. ENSURE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. DROP STRICT AUTH FOREIGN KEY CONSTRAINT ON PROFILES
-- This allows facility clinicians to register walk-in voluntary donors without requiring an auth login account.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 3. ENSURE DONOR_PROFILES TABLE EXISTS
CREATE TABLE IF NOT EXISTS public.donor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  blood_group text NOT NULL,
  genotype text,
  date_of_birth date,
  gender text,
  address text,
  city text DEFAULT 'Lagos',
  state text DEFAULT 'Lagos',
  latitude double precision,
  longitude double precision,
  availability_status text DEFAULT 'available',
  eligibility_status text DEFAULT 'eligible',
  last_donation_date date,
  total_donations integer DEFAULT 0,
  verified_by uuid REFERENCES public.organizations(id),
  verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. CREATE DONATIONS TABLE IF NOT EXISTS
CREATE TABLE IF NOT EXISTS public.donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id uuid REFERENCES public.donor_profiles(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  blood_request_id uuid,
  donor_request_id uuid,
  blood_group text NOT NULL,
  units_donated integer NOT NULL DEFAULT 1 CHECK (units_donated > 0),
  donation_date timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'completed',
  notes text,
  recorded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. ROW-LEVEL SECURITY (RLS) POLICIES FOR PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on profiles" ON public.profiles;
CREATE POLICY "Allow public read on profiles" ON public.profiles 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on profiles" ON public.profiles;
CREATE POLICY "Allow public insert on profiles" ON public.profiles 
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on profiles" ON public.profiles;
CREATE POLICY "Allow public update on profiles" ON public.profiles 
  FOR UPDATE USING (true);

-- 6. ROW-LEVEL SECURITY (RLS) POLICIES FOR DONOR PROFILES
ALTER TABLE public.donor_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on donor_profiles" ON public.donor_profiles;
CREATE POLICY "Allow public read on donor_profiles" ON public.donor_profiles 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on donor_profiles" ON public.donor_profiles;
CREATE POLICY "Allow public insert on donor_profiles" ON public.donor_profiles 
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on donor_profiles" ON public.donor_profiles;
CREATE POLICY "Allow public update on donor_profiles" ON public.donor_profiles 
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete on donor_profiles" ON public.donor_profiles;
CREATE POLICY "Allow public delete on donor_profiles" ON public.donor_profiles 
  FOR DELETE USING (true);

-- 7. ROW-LEVEL SECURITY (RLS) POLICIES FOR DONATIONS
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on donations" ON public.donations;
CREATE POLICY "Allow public read on donations" ON public.donations 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on donations" ON public.donations;
CREATE POLICY "Allow public insert on donations" ON public.donations 
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on donations" ON public.donations;
CREATE POLICY "Allow public update on donations" ON public.donations 
  FOR UPDATE USING (true);

-- 8. SEED AUTH ACCOUNTS (Allows these donors to also log into the Donor Portal)
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, last_sign_in_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES 
  ('00000000-0000-0000-0000-000000000000', 'd0000004-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'donor@orbinova.com', crypt('DonorPassword2026!', gen_salt('bf')), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"role":"donor","full_name":"Volunteer Hero Donor"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'd0000005-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'amina.yusuf@gmail.com', crypt('DonorPassword2026!', gen_salt('bf')), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"role":"donor","full_name":"Amina Yusuf"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'd0000006-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'chinedu.eze@gmail.com', crypt('DonorPassword2026!', gen_salt('bf')), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"role":"donor","full_name":"Chinedu Eze"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'dc100a9c-26c6-480d-a296-ee69deaf4270', 'authenticated', 'authenticated', 'bams@gmail.com', crypt('DonorPassword2026!', gen_salt('bf')), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"role":"donor","full_name":"Francis Bamirin"}'::jsonb, now(), now())
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data;

-- 9. SEED PROFILES FOR VOLUNTARY DONORS
INSERT INTO public.profiles (id, email, full_name, phone, role, is_active)
VALUES
  ('d0000004-0000-0000-0000-000000000004', 'donor@orbinova.com', 'Volunteer Hero Donor', '0144326123', 'donor', true),
  ('d0000005-0000-0000-0000-000000000005', 'amina.yusuf@gmail.com', 'Amina Yusuf', '09028836536', 'donor', true),
  ('d0000006-0000-0000-0000-000000000006', 'chinedu.eze@gmail.com', 'Chinedu Eze', '08034567890', 'donor', true),
  ('dc100a9c-26c6-480d-a296-ee69deaf4270', 'bams@gmail.com', 'Francis Bamirin', '09028836536', 'donor', true)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  role = 'donor',
  is_active = true,
  updated_at = now();

-- 10. SEED DONOR_PROFILES RECORDS
INSERT INTO public.donor_profiles (id, user_id, blood_group, city, state, availability_status, eligibility_status)
VALUES
  ('d1000004-0000-0000-0000-000000000004', 'd0000004-0000-0000-0000-000000000004', 'O+', 'Ikeja', 'Lagos', 'available', 'eligible'),
  ('d1000005-0000-0000-0000-000000000005', 'd0000005-0000-0000-0000-000000000005', 'AB-', 'Lagos', 'Lagos', 'available', 'eligible'),
  ('d1000006-0000-0000-0000-000000000006', 'd0000006-0000-0000-0000-000000000006', 'B-', 'Lagos', 'Lagos', 'available', 'temporarily_ineligible'),
  ('ac1a3dbe-b201-4ae4-b4c7-b0b70373017e', 'dc100a9c-26c6-480d-a296-ee69deaf4270', 'O+', 'Alagbado', 'Lagos', 'available', 'eligible')
ON CONFLICT (user_id) DO UPDATE SET
  blood_group = EXCLUDED.blood_group,
  city = EXCLUDED.city,
  eligibility_status = EXCLUDED.eligibility_status,
  availability_status = EXCLUDED.availability_status,
  updated_at = now();

-- 11. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';

SELECT 'ORBINOVA Tables, Donor Profiles & RLS Policies successfully configured in Supabase!' as result;
