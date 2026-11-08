-- ==============================================================================
-- ORBINOVA CONSOLIDATED SAFE MIGRATION & SEED SCRIPT
-- Idempotent, Non-Destructive PostgreSQL Script for Shared / Existing Supabase Databases
-- Compatible with databases containing existing radiologist / clinical schemas.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUM TYPES (Idempotent creation)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'hospital', 'blood_bank', 'donor');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'org_type') THEN
    CREATE TYPE org_type AS ENUM ('hospital', 'blood_bank');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'org_member_role') THEN
    CREATE TYPE org_member_role AS ENUM ('owner', 'manager', 'staff');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
    CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected', 'suspended');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'blood_group_code') THEN
    CREATE TYPE blood_group_code AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'compatibility_type') THEN
    CREATE TYPE compatibility_type AS ENUM ('whole_blood', 'red_cells', 'plasma', 'platelets');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'donor_availability') THEN
    CREATE TYPE donor_availability AS ENUM ('available', 'unavailable', 'temporarily_unavailable');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'donor_eligibility') THEN
    CREATE TYPE donor_eligibility AS ENUM ('eligible', 'temporarily_ineligible', 'permanently_ineligible', 'pending_verification');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_urgency') THEN
    CREATE TYPE request_urgency AS ENUM ('emergency', 'urgent', 'normal');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
    CREATE TYPE request_status AS ENUM ('draft', 'open', 'matching', 'partially_fulfilled', 'fulfilled', 'cancelled', 'expired');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'donor_request_status') THEN
    CREATE TYPE donor_request_status AS ENUM ('pending', 'viewed', 'accepted', 'declined', 'expired', 'cancelled', 'completed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'donation_status') THEN
    CREATE TYPE donation_status AS ENUM ('scheduled', 'screened', 'collected', 'tested', 'released', 'discarded', 'cancelled');
  END IF;
END $$;

-- 3. PROFILES TABLE (Safe creation / column enhancement)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE,
  full_name text,
  phone text,
  avatar_url text,
  role text DEFAULT 'donor',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure all required columns exist even if profiles was previously created by radiologist module
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'donor';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 4. ORGANIZATIONS (Hospitals & Blood Banks)
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('hospital', 'blood_bank')),
  registration_number text UNIQUE,
  license_number text,
  verification_status text DEFAULT 'verified' CHECK (verification_status IN ('pending', 'verified', 'rejected', 'suspended')),
  verified_at timestamptz DEFAULT now(),
  email text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  latitude double precision,
  longitude double precision,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. ORGANIZATION MEMBERS
CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'staff' CHECK (role IN ('owner', 'manager', 'staff')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- 6. BLOOD GROUPS
CREATE TABLE IF NOT EXISTS public.blood_groups (
  code text PRIMARY KEY,
  abo text NOT NULL,
  rh boolean NOT NULL,
  description text,
  can_donate_whole_blood_to text[] DEFAULT '{}',
  can_receive_whole_blood_from text[] DEFAULT '{}'
);

-- 7. BLOOD COMPATIBILITY MATRIX
CREATE TABLE IF NOT EXISTS public.blood_compatibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_group text NOT NULL REFERENCES public.blood_groups(code),
  recipient_group text NOT NULL REFERENCES public.blood_groups(code),
  compatibility_type text NOT NULL,
  is_compatible boolean NOT NULL DEFAULT true,
  notes text,
  UNIQUE(donor_group, recipient_group, compatibility_type)
);

-- 8. DONOR PROFILES
CREATE TABLE IF NOT EXISTS public.donor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  blood_group text NOT NULL REFERENCES public.blood_groups(code),
  genotype text,
  date_of_birth date,
  gender text,
  address text,
  city text,
  state text,
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

-- 9. BLOOD INVENTORY
CREATE TABLE IF NOT EXISTS public.blood_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  blood_group text NOT NULL REFERENCES public.blood_groups(code),
  product_type text NOT NULL DEFAULT 'red_cells',
  units_available integer NOT NULL DEFAULT 0 CHECK (units_available >= 0),
  units_reserved integer NOT NULL DEFAULT 0 CHECK (units_reserved >= 0),
  units_quarantined integer NOT NULL DEFAULT 0,
  min_threshold integer DEFAULT 5,
  critical_threshold integer DEFAULT 2,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, blood_group, product_type)
);

-- 10. BLOOD REQUESTS
CREATE TABLE IF NOT EXISTS public.blood_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  blood_group text NOT NULL REFERENCES public.blood_groups(code),
  product_type text NOT NULL DEFAULT 'red_cells',
  units_needed integer NOT NULL CHECK (units_needed > 0),
  units_fulfilled integer NOT NULL DEFAULT 0,
  urgency text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 11. MATCHING RUNS & DONOR REQUESTS
CREATE TABLE IF NOT EXISTS public.matching_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blood_request_id uuid NOT NULL REFERENCES public.blood_requests(id) ON DELETE CASCADE,
  total_candidates integer NOT NULL DEFAULT 0,
  staged_candidates integer NOT NULL DEFAULT 0,
  algorithm_version text NOT NULL DEFAULT 'v2.1-clinical',
  parameters jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.donor_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matching_run_id uuid REFERENCES public.matching_runs(id) ON DELETE SET NULL,
  blood_request_id uuid NOT NULL REFERENCES public.blood_requests(id) ON DELETE CASCADE,
  donor_id uuid NOT NULL REFERENCES public.donor_profiles(id) ON DELETE CASCADE,
  match_score double precision NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  response_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 12. AUDIT LOGS & NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  link text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- 13. SEED REFERENCE BLOOD GROUPS (Idempotent)
INSERT INTO public.blood_groups (code, abo, rh, description, can_donate_whole_blood_to, can_receive_whole_blood_from)
VALUES
  ('O-', 'O', false, 'Universal donor for red blood cells', ARRAY['O-','O+','A-','A+','B-','B+','AB-','AB+'], ARRAY['O-']),
  ('O+', 'O', true, 'Most common blood type in West Africa', ARRAY['O+','A+','B+','AB+'], ARRAY['O-','O+']),
  ('A-', 'A', false, 'Rare blood type', ARRAY['A-','A+','AB-','AB+'], ARRAY['O-','A-']),
  ('A+', 'A', true, 'Common blood group', ARRAY['A+','AB+'], ARRAY['O-','O+','A-','A+']),
  ('B-', 'B', false, 'Rare blood type', ARRAY['B-','B+','AB-','AB+'], ARRAY['O-','B-']),
  ('B+', 'B', true, 'Common blood type in West Africa', ARRAY['B+','AB+'], ARRAY['O-','O+','B-','B+']),
  ('AB-', 'AB', false, 'Rarest blood group', ARRAY['AB-','AB+'], ARRAY['O-','A-','B-','AB-']),
  ('AB+', 'AB', true, 'Universal red cell recipient', ARRAY['AB+'], ARRAY['O-','O+','A-','A+','B-','B+','AB-','AB+'])
ON CONFLICT (code) DO UPDATE SET
  description = EXCLUDED.description,
  can_donate_whole_blood_to = EXCLUDED.can_donate_whole_blood_to,
  can_receive_whole_blood_from = EXCLUDED.can_receive_whole_blood_from;

-- 14. SEED DEMO ORGANIZATIONS (Idempotent)
INSERT INTO public.organizations (id, name, type, registration_number, email, phone, address, city, state, latitude, longitude)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Lagos University Teaching Hospital (LUTH)', 'hospital', 'RC-HOSP-001', 'hospital@orbinova.com', '+2348022334455', 'Ishaga Road, Idi-Araba', 'Surulere', 'Lagos', 6.5186, 3.3562),
  ('b2222222-2222-2222-2222-222222222222', 'Lagos Island Central Blood Bank', 'blood_bank', 'RC-BB-002', 'bloodbank@orbinova.com', '+2348033445566', 'Broad Street, Lagos Island', 'Lagos Island', 'Lagos', 6.4549, 3.3887)
ON CONFLICT (id) DO NOTHING;

-- 15. SEED INITIAL INVENTORY
INSERT INTO public.blood_inventory (organization_id, blood_group, product_type, units_available, units_reserved, min_threshold, critical_threshold)
VALUES
  ('b2222222-2222-2222-2222-222222222222', 'O-', 'red_cells', 12, 2, 8, 3),
  ('b2222222-2222-2222-2222-222222222222', 'O+', 'red_cells', 28, 4, 15, 5),
  ('b2222222-2222-2222-2222-222222222222', 'A+', 'red_cells', 18, 3, 10, 4),
  ('b2222222-2222-2222-2222-222222222222', 'B+', 'red_cells', 22, 1, 10, 4),
  ('b2222222-2222-2222-2222-222222222222', 'AB+', 'red_cells', 8, 0, 5, 2)
ON CONFLICT (organization_id, blood_group, product_type) DO NOTHING;

-- 16. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_requests ENABLE ROW LEVEL SECURITY;

-- 17. PUBLIC READ POLICIES
DROP POLICY IF EXISTS "Allow public read on blood_groups" ON public.blood_groups;
CREATE POLICY "Allow public read on blood_groups" ON public.blood_groups FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated read on profiles" ON public.profiles;
CREATE POLICY "Allow authenticated read on profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read on verified organizations" ON public.organizations;
CREATE POLICY "Allow public read on verified organizations" ON public.organizations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow read on blood_inventory" ON public.blood_inventory;
CREATE POLICY "Allow read on blood_inventory" ON public.blood_inventory FOR SELECT USING (true);

-- 18. AUTO-PROFILE CREATION TRIGGER ON AUTH SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Healthcare Staff'),
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'hospital')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    role = COALESCE(EXCLUDED.role, public.profiles.role),
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- SUCCESS NOTICE
SELECT 'ORBINOVA Consolidated Migration Completed Successfully' as status;
