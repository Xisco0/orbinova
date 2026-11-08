-- ==============================================================================
-- SMARTDONOR ALL-IN-ONE DATABASE SETUP SCRIPT (CLEAN & COMPLETE)
-- Paste and Run this entire script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/wyeyahgkkmlwrcuvnoae/sql
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Drop Legacy / Prototype Tables (clean slate for production schema)
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.donations CASCADE;
DROP TABLE IF EXISTS public.donor_requests CASCADE;
DROP TABLE IF EXISTS public.matching_runs CASCADE;
DROP TABLE IF EXISTS public.blood_requests CASCADE;
DROP TABLE IF EXISTS public.blood_inventory_transactions CASCADE;
DROP TABLE IF EXISTS public.blood_inventory CASCADE;
DROP TABLE IF EXISTS public.donor_availability_history CASCADE;
DROP TABLE IF EXISTS public.donor_profiles CASCADE;
DROP TABLE IF EXISTS public.blood_compatibility CASCADE;
DROP TABLE IF EXISTS public.blood_groups CASCADE;
DROP TABLE IF EXISTS public.organization_members CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 3. Custom Enum Types
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
    CREATE TYPE donation_status AS ENUM ('scheduled', 'completed', 'cancelled', 'rejected');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventory_tx_type') THEN
    CREATE TYPE inventory_tx_type AS ENUM (
      'donation_received',
      'blood_issued',
      'blood_reserved',
      'reservation_released',
      'expired_unit',
      'manual_adjustment',
      'transfer'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE notification_type AS ENUM (
      'blood_request',
      'donor_request',
      'request_accepted',
      'request_declined',
      'donation_reminder',
      'verification',
      'inventory_warning',
      'system_notification'
    );
  END IF;
END $$;

-- 4. Production Tables

-- 4.1 Profiles (Linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'donor',
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.2 Organizations (Hospitals & Blood Banks)
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  organization_type org_type NOT NULL DEFAULT 'hospital',
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT NOT NULL DEFAULT 'Nigeria',
  latitude DOUBLE PRECISION CHECK (latitude IS NULL OR (latitude >= -90.0 AND latitude <= 90.0)),
  longitude DOUBLE PRECISION CHECK (longitude IS NULL OR (longitude >= -180.0 AND longitude <= 180.0)),
  license_number TEXT,
  verification_status verification_status NOT NULL DEFAULT 'pending',
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.3 Organization Members
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  member_role org_member_role NOT NULL DEFAULT 'staff',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- 4.4 Blood Groups Reference Table
CREATE TABLE public.blood_groups (
  code blood_group_code PRIMARY KEY,
  name TEXT NOT NULL,
  antigen_a BOOLEAN NOT NULL,
  antigen_b BOOLEAN NOT NULL,
  rh_factor BOOLEAN NOT NULL,
  description TEXT,
  rarity_rank INT CHECK (rarity_rank >= 1 AND rarity_rank <= 8),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.5 Blood Compatibility Matrix
CREATE TABLE public.blood_compatibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_blood_group blood_group_code NOT NULL REFERENCES public.blood_groups(code) ON DELETE CASCADE,
  recipient_blood_group blood_group_code NOT NULL REFERENCES public.blood_groups(code) ON DELETE CASCADE,
  is_compatible BOOLEAN NOT NULL DEFAULT FALSE,
  compatibility_type compatibility_type NOT NULL DEFAULT 'whole_blood',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(donor_blood_group, recipient_blood_group, compatibility_type)
);

-- 4.6 Donor Profiles
CREATE TABLE public.donor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  blood_group blood_group_code NOT NULL REFERENCES public.blood_groups(code),
  date_of_birth DATE CHECK (date_of_birth IS NULL OR date_of_birth <= CURRENT_DATE - INTERVAL '16 years'),
  gender TEXT CHECK (gender IS NULL OR gender IN ('male', 'female', 'other')),
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT NOT NULL DEFAULT 'Nigeria',
  latitude DOUBLE PRECISION CHECK (latitude IS NULL OR (latitude >= -90.0 AND latitude <= 90.0)),
  longitude DOUBLE PRECISION CHECK (longitude IS NULL OR (longitude >= -180.0 AND longitude <= 180.0)),
  availability_status donor_availability NOT NULL DEFAULT 'available',
  eligibility_status donor_eligibility NOT NULL DEFAULT 'pending_verification',
  last_donation_date DATE CHECK (last_donation_date IS NULL OR last_donation_date <= CURRENT_DATE),
  next_eligible_date DATE,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  preferred_contact_method TEXT DEFAULT 'sms',
  total_donations INT NOT NULL DEFAULT 0 CHECK (total_donations >= 0),
  verification_status verification_status NOT NULL DEFAULT 'pending',
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.7 Donor Availability History
CREATE TABLE public.donor_availability_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID NOT NULL REFERENCES public.donor_profiles(id) ON DELETE CASCADE,
  status donor_availability NOT NULL,
  notes TEXT,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.8 Blood Inventory
CREATE TABLE public.blood_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  blood_group blood_group_code NOT NULL REFERENCES public.blood_groups(code),
  quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reserved_quantity INT NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  available_quantity INT GENERATED ALWAYS AS (quantity - reserved_quantity) STORED CHECK (available_quantity >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, blood_group),
  CONSTRAINT chk_reserved_le_quantity CHECK (reserved_quantity <= quantity)
);

-- 4.9 Blood Inventory Transactions
CREATE TABLE public.blood_inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  blood_group blood_group_code NOT NULL REFERENCES public.blood_groups(code),
  transaction_type inventory_tx_type NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  reference_id UUID,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.10 Blood Requests
CREATE TABLE public.blood_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  blood_group blood_group_code NOT NULL REFERENCES public.blood_groups(code),
  units_required INT NOT NULL CHECK (units_required > 0),
  units_fulfilled INT NOT NULL DEFAULT 0 CHECK (units_fulfilled >= 0),
  urgency request_urgency NOT NULL DEFAULT 'normal',
  status request_status NOT NULL DEFAULT 'open',
  required_by TIMESTAMPTZ,
  notes TEXT,
  latitude DOUBLE PRECISION CHECK (latitude IS NULL OR (latitude >= -90.0 AND latitude <= 90.0)),
  longitude DOUBLE PRECISION CHECK (longitude IS NULL OR (longitude >= -180.0 AND longitude <= 180.0)),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_fulfilled_le_required CHECK (units_fulfilled <= units_required)
);

-- 4.11 Matching Runs
CREATE TABLE public.matching_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blood_request_id UUID NOT NULL REFERENCES public.blood_requests(id) ON DELETE CASCADE,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  donors_considered INT NOT NULL DEFAULT 0 CHECK (donors_considered >= 0),
  donors_eligible INT NOT NULL DEFAULT 0 CHECK (donors_eligible >= 0),
  radius_km DOUBLE PRECISION NOT NULL DEFAULT 25.0 CHECK (radius_km > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.12 Donor Requests
CREATE TABLE public.donor_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blood_request_id UUID NOT NULL REFERENCES public.blood_requests(id) ON DELETE CASCADE,
  matching_run_id UUID REFERENCES public.matching_runs(id) ON DELETE SET NULL,
  donor_id UUID NOT NULL REFERENCES public.donor_profiles(id) ON DELETE CASCADE,
  matching_score NUMERIC(5, 4) NOT NULL CHECK (matching_score >= 0.0000 AND matching_score <= 1.0000),
  compatibility_score NUMERIC(5, 4) NOT NULL CHECK (compatibility_score >= 0.0000 AND compatibility_score <= 1.0000),
  distance_score NUMERIC(5, 4) NOT NULL CHECK (distance_score >= 0.0000 AND distance_score <= 1.0000),
  availability_score NUMERIC(5, 4) NOT NULL CHECK (availability_score >= 0.0000 AND availability_score <= 1.0000),
  urgency_score NUMERIC(5, 4) NOT NULL CHECK (urgency_score >= 0.0000 AND urgency_score <= 1.0000),
  distance_km NUMERIC(8, 2) CHECK (distance_km >= 0),
  status donor_request_status NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(blood_request_id, donor_id)
);

-- 4.13 Donations
CREATE TABLE public.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID NOT NULL REFERENCES public.donor_profiles(id) ON DELETE RESTRICT,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  blood_request_id UUID REFERENCES public.blood_requests(id) ON DELETE SET NULL,
  donor_request_id UUID REFERENCES public.donor_requests(id) ON DELETE SET NULL,
  blood_group blood_group_code NOT NULL REFERENCES public.blood_groups(code),
  units_donated INT NOT NULL DEFAULT 1 CHECK (units_donated > 0),
  donation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status donation_status NOT NULL DEFAULT 'completed',
  notes TEXT,
  recorded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.14 Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.15 Audit Logs
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Helper Security Functions
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = user_uuid;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(org_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members WHERE organization_id = org_uuid AND user_id = auth.uid() AND is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_manager(org_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members WHERE organization_id = org_uuid AND user_id = auth.uid() AND member_role IN ('owner', 'manager') AND is_active = TRUE
  );
$$;

-- 6. Auto Profile Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  assigned_role user_role := 'donor';
  meta_role text;
BEGIN
  meta_role := NEW.raw_user_meta_data->>'role';
  
  IF meta_role IS NOT NULL THEN
    IF meta_role IN ('admin', 'hospital', 'blood_bank', 'donor') THEN
      assigned_role := meta_role::user_role;
    END IF;
  END IF;

  INSERT INTO public.profiles (
    id, full_name, email, phone, role, is_active, created_at, updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, ''),
    NEW.raw_user_meta_data->>'phone',
    assigned_role,
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 7. Row Level Security Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_compatibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donor_availability_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matching_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donor_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Blood Groups & Compatibility RLS
CREATE POLICY "Anyone authenticated can view blood groups" ON public.blood_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage blood groups" ON public.blood_groups FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Anyone authenticated can view compatibility matrix" ON public.blood_compatibility FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage compatibility matrix" ON public.blood_compatibility FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Profiles RLS
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins full management profiles" ON public.profiles FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Organizations RLS
CREATE POLICY "Users view verified active organizations" ON public.organizations FOR SELECT TO authenticated USING (is_active = TRUE AND verification_status = 'verified');
CREATE POLICY "Members view own organization" ON public.organizations FOR SELECT USING (public.is_org_member(id));
CREATE POLICY "Managers update own organization" ON public.organizations FOR UPDATE USING (public.is_org_manager(id)) WITH CHECK (public.is_org_manager(id));
CREATE POLICY "Admins full management organizations" ON public.organizations FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Organization Members RLS
CREATE POLICY "Members view peers in same organization" ON public.organization_members FOR SELECT USING (user_id = auth.uid() OR public.is_org_member(organization_id));
CREATE POLICY "Managers manage members in own organization" ON public.organization_members FOR ALL USING (public.is_org_manager(organization_id)) WITH CHECK (public.is_org_manager(organization_id));
CREATE POLICY "Admins full management organization members" ON public.organization_members FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Donor Profiles RLS
CREATE POLICY "Donors view and manage own donor profile" ON public.donor_profiles FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Organizations view eligible candidate donors during matching" ON public.donor_profiles FOR SELECT TO authenticated USING (public.get_user_role(auth.uid()) IN ('hospital', 'blood_bank') AND availability_status = 'available' AND eligibility_status = 'eligible' AND verification_status = 'verified');
CREATE POLICY "Admins full management donor profiles" ON public.donor_profiles FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Blood Requests & Donor Requests RLS
CREATE POLICY "Authenticated users view active open blood requests" ON public.blood_requests FOR SELECT TO authenticated USING (status IN ('open', 'matching', 'partially_fulfilled'));
CREATE POLICY "Members manage own organization blood requests" ON public.blood_requests FOR ALL USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY "Admins full management blood requests" ON public.blood_requests FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Donors view and respond to their own requests" ON public.donor_requests FOR SELECT USING (donor_id IN (SELECT id FROM public.donor_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Donors update response status on own requests" ON public.donor_requests FOR UPDATE USING (donor_id IN (SELECT id FROM public.donor_profiles WHERE user_id = auth.uid())) WITH CHECK (donor_id IN (SELECT id FROM public.donor_profiles WHERE user_id = auth.uid()));

-- Inventory & Donations & Notifications RLS
CREATE POLICY "Members view own organization inventory" ON public.blood_inventory FOR SELECT USING (public.is_org_member(organization_id));
CREATE POLICY "Members update own organization inventory" ON public.blood_inventory FOR ALL USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY "Admins full management inventory" ON public.blood_inventory FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Donors view own donation records" ON public.donations FOR SELECT USING (donor_id IN (SELECT id FROM public.donor_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Organizations view and record donations at their facility" ON public.donations FOR ALL USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY "Admins full management donations" ON public.donations FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Users view and update their own notifications" ON public.notifications FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins full access notifications" ON public.notifications FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 8. Seed Reference Data (Blood Groups & Compatibility Matrix)
INSERT INTO public.blood_groups (code, name, antigen_a, antigen_b, rh_factor, description, rarity_rank)
VALUES
  ('O+', 'O Positive', FALSE, FALSE, TRUE, 'Universal red cell donor for positive blood types; common in Nigeria.', 1),
  ('O-', 'O Negative', FALSE, FALSE, FALSE, 'Universal red cell donor for all blood types; critical emergency reserve.', 7),
  ('A+', 'A Positive', TRUE, FALSE, TRUE, 'Can give red cells to A+ and AB+; can receive from A+, A-, O+, O-.', 2),
  ('A-', 'A Negative', TRUE, FALSE, FALSE, 'Can give red cells to A+, A-, AB+, AB-; can receive from A-, O-.', 6),
  ('B+', 'B Positive', FALSE, TRUE, TRUE, 'Can give red cells to B+ and AB+; can receive from B+, B-, O+, O-.', 3),
  ('B-', 'B Negative', FALSE, TRUE, FALSE, 'Can give red cells to B+, B-, AB+, AB-; can receive from B-, O-.', 8),
  ('AB+', 'AB Positive', TRUE, TRUE, TRUE, 'Universal red cell recipient; universal plasma donor.', 4),
  ('AB-', 'AB Negative', TRUE, TRUE, FALSE, 'Can give red cells to AB+, AB-; can receive from all negative types.', 5)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.blood_compatibility (donor_blood_group, recipient_blood_group, is_compatible, compatibility_type, notes)
VALUES
  ('O-', 'O-', TRUE, 'red_cells', 'Identical match'),
  ('O-', 'O+', TRUE, 'red_cells', 'Compatible match'),
  ('O-', 'A-', TRUE, 'red_cells', 'Compatible match'),
  ('O-', 'A+', TRUE, 'red_cells', 'Compatible match'),
  ('O-', 'B-', TRUE, 'red_cells', 'Compatible match'),
  ('O-', 'B+', TRUE, 'red_cells', 'Compatible match'),
  ('O-', 'AB-', TRUE, 'red_cells', 'Compatible match'),
  ('O-', 'AB+', TRUE, 'red_cells', 'Compatible match'),
  ('O+', 'O-', FALSE, 'red_cells', 'Rh incompatibility'),
  ('O+', 'O+', TRUE, 'red_cells', 'Identical match'),
  ('O+', 'A-', FALSE, 'red_cells', 'Rh incompatibility'),
  ('O+', 'A+', TRUE, 'red_cells', 'Compatible match'),
  ('O+', 'B-', FALSE, 'red_cells', 'Rh incompatibility'),
  ('O+', 'B+', TRUE, 'red_cells', 'Compatible match'),
  ('O+', 'AB-', FALSE, 'red_cells', 'Rh incompatibility'),
  ('O+', 'AB+', TRUE, 'red_cells', 'Compatible match'),
  ('A-', 'O-', FALSE, 'red_cells', 'Antigen mismatch'),
  ('A-', 'O+', FALSE, 'red_cells', 'Antigen mismatch'),
  ('A-', 'A-', TRUE, 'red_cells', 'Identical match'),
  ('A-', 'A+', TRUE, 'red_cells', 'Compatible match'),
  ('A-', 'B-', FALSE, 'red_cells', 'Antigen mismatch'),
  ('A-', 'B+', FALSE, 'red_cells', 'Antigen mismatch'),
  ('A-', 'AB-', TRUE, 'red_cells', 'Compatible match'),
  ('A-', 'AB+', TRUE, 'red_cells', 'Compatible match'),
  ('A+', 'O-', FALSE, 'red_cells', 'Antigen mismatch'),
  ('A+', 'O+', FALSE, 'red_cells', 'Antigen mismatch'),
  ('A+', 'A-', FALSE, 'red_cells', 'Rh incompatibility'),
  ('A+', 'A+', TRUE, 'red_cells', 'Identical match'),
  ('A+', 'B-', FALSE, 'red_cells', 'Antigen mismatch'),
  ('A+', 'B+', FALSE, 'red_cells', 'Antigen mismatch'),
  ('A+', 'AB-', FALSE, 'red_cells', 'Rh incompatibility'),
  ('A+', 'AB+', TRUE, 'red_cells', 'Compatible match'),
  ('B-', 'O-', FALSE, 'red_cells', 'Antigen mismatch'),
  ('B-', 'O+', FALSE, 'red_cells', 'Antigen mismatch'),
  ('B-', 'A-', FALSE, 'red_cells', 'Antigen mismatch'),
  ('B-', 'A+', FALSE, 'red_cells', 'Antigen mismatch'),
  ('B-', 'B-', TRUE, 'red_cells', 'Identical match'),
  ('B-', 'B+', TRUE, 'red_cells', 'Compatible match'),
  ('B-', 'AB-', TRUE, 'red_cells', 'Compatible match'),
  ('B-', 'AB+', TRUE, 'red_cells', 'Compatible match'),
  ('B+', 'O-', FALSE, 'red_cells', 'Antigen mismatch'),
  ('B+', 'O+', FALSE, 'red_cells', 'Antigen mismatch'),
  ('B+', 'A-', FALSE, 'red_cells', 'Antigen mismatch'),
  ('B+', 'A+', FALSE, 'red_cells', 'Antigen mismatch'),
  ('B+', 'B-', FALSE, 'red_cells', 'Rh incompatibility'),
  ('B+', 'B+', TRUE, 'red_cells', 'Identical match'),
  ('B+', 'AB-', FALSE, 'red_cells', 'Rh incompatibility'),
  ('B+', 'AB+', TRUE, 'red_cells', 'Compatible match'),
  ('AB-', 'O-', FALSE, 'red_cells', 'Antigen mismatch'),
  ('AB-', 'O+', FALSE, 'red_cells', 'Antigen mismatch'),
  ('AB-', 'A-', FALSE, 'red_cells', 'Antigen mismatch'),
  ('AB-', 'A+', FALSE, 'red_cells', 'Antigen mismatch'),
  ('AB-', 'B-', FALSE, 'red_cells', 'Antigen mismatch'),
  ('AB-', 'B+', FALSE, 'red_cells', 'Antigen mismatch'),
  ('AB-', 'AB-', TRUE, 'red_cells', 'Identical match'),
  ('AB-', 'AB+', TRUE, 'red_cells', 'Compatible match'),
  ('AB+', 'O-', FALSE, 'red_cells', 'Antigen mismatch'),
  ('AB+', 'O+', FALSE, 'red_cells', 'Antigen mismatch'),
  ('AB+', 'A-', FALSE, 'red_cells', 'Antigen mismatch'),
  ('AB+', 'A+', FALSE, 'red_cells', 'Antigen mismatch'),
  ('AB+', 'B-', FALSE, 'red_cells', 'Antigen mismatch'),
  ('AB+', 'B+', FALSE, 'red_cells', 'Antigen mismatch'),
  ('AB+', 'AB-', FALSE, 'red_cells', 'Rh incompatibility'),
  ('AB+', 'AB+', TRUE, 'red_cells', 'Identical match')
ON CONFLICT (donor_blood_group, recipient_blood_group, compatibility_type) DO NOTHING;

-- 9. Provision Demo Authentication Accounts
DO $$
DECLARE
  v_admin_id UUID := '11111111-1111-1111-1111-111111111111';
  v_hospital_user_id UUID := '22222222-2222-2222-2222-222222222222';
  v_blood_bank_user_id UUID := '33333333-3333-3333-3333-333333333333';
  v_donor_user_id UUID := '44444444-4444-4444-4444-444444444444';
  v_hospital_org_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_blood_bank_org_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
BEGIN

  -- Auth Users
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at)
  VALUES
    (v_admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@smartdonor.ng', crypt('AdminPassword123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"SmartDonor Super Admin","role":"admin"}'::jsonb, FALSE, NOW(), NOW()),
    (v_hospital_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'lasuth@smartdonor.ng', crypt('HospitalPassword123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Dr. Babatunde Alabi (LASUTH)","role":"hospital"}'::jsonb, FALSE, NOW(), NOW()),
    (v_blood_bank_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'lagosbloodbank@smartdonor.ng', crypt('BloodBankPassword123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Ngozi Eze (Lagos Blood Bank)","role":"blood_bank"}'::jsonb, FALSE, NOW(), NOW()),
    (v_donor_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'donor@smartdonor.ng', crypt('DonorPassword123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Emeka Okafor","role":"donor"}'::jsonb, FALSE, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET encrypted_password = EXCLUDED.encrypted_password, email_confirmed_at = NOW();

  -- Auth Identities (Required by Supabase GoTrue Auth for password login)
  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES
    (v_admin_id, v_admin_id, format('{"sub":"%s","email":"%s"}', v_admin_id, 'admin@smartdonor.ng')::jsonb, 'email', v_admin_id, NOW(), NOW(), NOW()),
    (v_hospital_user_id, v_hospital_user_id, format('{"sub":"%s","email":"%s"}', v_hospital_user_id, 'lasuth@smartdonor.ng')::jsonb, 'email', v_hospital_user_id, NOW(), NOW(), NOW()),
    (v_blood_bank_user_id, v_blood_bank_user_id, format('{"sub":"%s","email":"%s"}', v_blood_bank_user_id, 'lagosbloodbank@smartdonor.ng')::jsonb, 'email', v_blood_bank_user_id, NOW(), NOW(), NOW()),
    (v_donor_user_id, v_donor_user_id, format('{"sub":"%s","email":"%s"}', v_donor_user_id, 'donor@smartdonor.ng')::jsonb, 'email', v_donor_user_id, NOW(), NOW(), NOW())
  ON CONFLICT (provider, provider_id) DO UPDATE SET identity_data = EXCLUDED.identity_data, updated_at = NOW();

  -- Profiles
  INSERT INTO public.profiles (id, full_name, email, phone, role, is_active)
  VALUES
    (v_admin_id, 'SmartDonor Super Admin', 'admin@smartdonor.ng', '+2348011223344', 'admin', TRUE),
    (v_hospital_user_id, 'Dr. Babatunde Alabi', 'lasuth@smartdonor.ng', '+2348022334455', 'hospital', TRUE),
    (v_blood_bank_user_id, 'Ngozi Eze', 'lagosbloodbank@smartdonor.ng', '+2348033445566', 'blood_bank', TRUE),
    (v_donor_user_id, 'Emeka Okafor', 'donor@smartdonor.ng', '+2348055667788', 'donor', TRUE)
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, is_active = TRUE;

  -- Organizations
  INSERT INTO public.organizations (id, name, organization_type, email, phone, address, city, state, country, latitude, longitude, license_number, verification_status, verified_at, is_active)
  VALUES
    (v_hospital_org_id, 'Lagos State University Teaching Hospital (LASUTH)', 'hospital', 'info@lasuth.org.ng', '+23412345678', '1-5 Oba Akinjobi Way, GRA', 'Ikeja', 'Lagos', 'Nigeria', 6.5954, 3.3488, 'HEFAMAA-HOSP-2024-0019', 'verified', NOW(), TRUE),
    (v_blood_bank_org_id, 'Lagos State Blood Transfusion Service (LSBTS)', 'blood_bank', 'bloodtransfusion@lagosstate.gov.ng', '+23418765432', 'General Hospital Complex, Broad Street', 'Lagos Island', 'Lagos', 'Nigeria', 6.4531, 3.3958, 'LSBTS-BB-2024-0003', 'verified', NOW(), TRUE)
  ON CONFLICT (id) DO UPDATE SET verification_status = 'verified', is_active = TRUE;

  -- Organization Members
  INSERT INTO public.organization_members (organization_id, user_id, member_role, is_active)
  VALUES
    (v_hospital_org_id, v_hospital_user_id, 'owner', TRUE),
    (v_blood_bank_org_id, v_blood_bank_user_id, 'owner', TRUE)
  ON CONFLICT (organization_id, user_id) DO UPDATE SET member_role = 'owner', is_active = TRUE;

  -- Donor Profile
  INSERT INTO public.donor_profiles (user_id, blood_group, date_of_birth, gender, address, city, state, country, latitude, longitude, availability_status, eligibility_status, last_donation_date, next_eligible_date, emergency_contact_name, emergency_contact_phone, preferred_contact_method, total_donations, verification_status, is_active)
  VALUES
    (v_donor_user_id, 'O+', '1996-05-14', 'male', '12 Allen Avenue', 'Ikeja', 'Lagos', 'Nigeria', 6.6018, 3.3515, 'available', 'eligible', CURRENT_DATE - INTERVAL '120 days', CURRENT_DATE - INTERVAL '30 days', 'Amaka Okafor', '+2348099887766', 'sms', 4, 'verified', TRUE)
  ON CONFLICT (user_id) DO UPDATE SET blood_group = 'O+', availability_status = 'available', eligibility_status = 'eligible', verification_status = 'verified', is_active = TRUE;

END $$;
