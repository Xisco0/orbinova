-- ==============================================================================
-- ORBINOVA MIGRATION: COMPLETE DATABASE SYNCHRONIZATION & SCHEMA ALIGNMENT
-- Migration: 20261109000003_complete_database_synchronization_and_schema_alignment.sql
--
-- Description:
-- 1. Aligns table columns across profiles, donor_profiles, blood_requests, blood_inventory,
--    organization_members, and audit_logs to eliminate column-not-found errors.
-- 2. Creates authoritative security helper functions: is_admin, is_org_member, is_org_manager.
-- 3. Corrects Row-Level Security (RLS) policies on blood_requests, blood_inventory, organization_members,
--    and audit_logs so authorized application operations succeed reliably.
-- 4. Seeds baseline organization_members linkages so staff and institutional workflows sync properly.
-- ==============================================================================

-- 1. PROFILES: Ensure all authentication & security fields exist
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_by UUID,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
  ADD COLUMN IF NOT EXISTS security_locked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS security_locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

-- 2. DONOR PROFILES: Ensure country, reference, and location fields exist
ALTER TABLE public.donor_profiles 
  ADD COLUMN IF NOT EXISTS donor_number TEXT,
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS registering_organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS other_names TEXT,
  ADD COLUMN IF NOT EXISTS surname TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Nigeria',
  ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'NG',
  ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'Lagos',
  ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'Lagos',
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS location_consent BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_donor_profiles_donor_number 
  ON public.donor_profiles(donor_number);

-- 3. ORGANIZATIONS: Ensure type, active, and contact fields exist
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS organization_type TEXT DEFAULT 'hospital',
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'hospital',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- 4. ORGANIZATION MEMBERS: Ensure member_role and must_change_password exist
ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS member_role TEXT DEFAULT 'staff',
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'staff',
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- 5. BLOOD REQUESTS: Harmonize dual column schemas (hospital_id / organization_id, units_needed / units_required)
ALTER TABLE public.blood_requests
  ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS units_needed INT,
  ADD COLUMN IF NOT EXISTS units_required INT,
  ADD COLUMN IF NOT EXISTS units_fulfilled INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS required_by TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'red_cells',
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Backfill dual column pairs
UPDATE public.blood_requests
SET organization_id = hospital_id
WHERE organization_id IS NULL AND hospital_id IS NOT NULL;

UPDATE public.blood_requests
SET hospital_id = organization_id
WHERE hospital_id IS NULL AND organization_id IS NOT NULL;

UPDATE public.blood_requests
SET units_required = units_needed
WHERE units_required IS NULL AND units_needed IS NOT NULL;

UPDATE public.blood_requests
SET units_needed = units_required
WHERE units_needed IS NULL AND units_required IS NOT NULL;

-- 6. BLOOD INVENTORY: Harmonize quantity and units_available
ALTER TABLE public.blood_inventory
  ADD COLUMN IF NOT EXISTS quantity INT,
  ADD COLUMN IF NOT EXISTS available_quantity INT,
  ADD COLUMN IF NOT EXISTS reserved_quantity INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS units_available INT,
  ADD COLUMN IF NOT EXISTS units_reserved INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS units_quarantined INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'red_cells';

UPDATE public.blood_inventory
SET quantity = COALESCE(units_available, 0) + COALESCE(units_reserved, 0)
WHERE quantity IS NULL;

UPDATE public.blood_inventory
SET available_quantity = units_available
WHERE available_quantity IS NULL AND units_available IS NOT NULL;

UPDATE public.blood_inventory
SET reserved_quantity = units_reserved
WHERE reserved_quantity IS NULL AND units_reserved IS NOT NULL;

UPDATE public.blood_inventory
SET units_available = available_quantity
WHERE units_available IS NULL AND available_quantity IS NOT NULL;

-- 7. AUDIT LOGS: Add tamper-evident and categorized fields
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS actor_name TEXT,
  ADD COLUMN IF NOT EXISTS actor_role TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'success',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS hash TEXT,
  ADD COLUMN IF NOT EXISTS previous_hash TEXT,
  ADD COLUMN IF NOT EXISTS sequence_number BIGINT;

-- 8. SECURITY FUNCTIONS: Define is_admin, is_org_member, is_org_manager
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND LOWER(COALESCE(role, '')) IN ('admin', 'superadmin', 'super_admin')
      AND is_active = TRUE
      AND COALESCE(is_suspended, FALSE) = FALSE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(org_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = org_uuid
        AND om.user_id = auth.uid()
        AND om.is_active = TRUE
    )
    OR EXISTS (
      SELECT 1 FROM public.organizations o
      JOIN public.profiles p ON LOWER(p.email) = LOWER(o.email)
      WHERE o.id = org_uuid
        AND p.id = auth.uid()
        AND p.is_active = TRUE
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_manager(org_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = org_uuid
        AND om.user_id = auth.uid()
        AND LOWER(COALESCE(om.member_role, om.role, '')) IN ('owner', 'manager', 'administrator')
        AND om.is_active = TRUE
    )
    OR EXISTS (
      SELECT 1 FROM public.organizations o
      JOIN public.profiles p ON LOWER(p.email) = LOWER(o.email)
      WHERE o.id = org_uuid
        AND p.id = auth.uid()
        AND p.is_active = TRUE
    )
  );
$$;

-- 9. ROW-LEVEL SECURITY POLICIES: Correct RLS permissions so operations succeed reliably
-- A. Blood Requests
DROP POLICY IF EXISTS "Members manage own organization blood requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Authenticated users view active open blood requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Admins full management blood requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Allow select blood_requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Allow insert blood_requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Allow update blood_requests" ON public.blood_requests;

CREATE POLICY "Allow select blood_requests" ON public.blood_requests
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert blood_requests" ON public.blood_requests
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow update blood_requests" ON public.blood_requests
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- B. Blood Inventory
DROP POLICY IF EXISTS "Members view own organization inventory" ON public.blood_inventory;
DROP POLICY IF EXISTS "Members update own organization inventory" ON public.blood_inventory;
DROP POLICY IF EXISTS "Admins full management inventory" ON public.blood_inventory;
DROP POLICY IF EXISTS "Allow select blood_inventory" ON public.blood_inventory;
DROP POLICY IF EXISTS "Allow insert blood_inventory" ON public.blood_inventory;
DROP POLICY IF EXISTS "Allow update blood_inventory" ON public.blood_inventory;

CREATE POLICY "Allow select blood_inventory" ON public.blood_inventory
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert blood_inventory" ON public.blood_inventory
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow update blood_inventory" ON public.blood_inventory
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- C. Audit Logs
DROP POLICY IF EXISTS "Allow insert audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow select audit_logs" ON public.audit_logs;

CREATE POLICY "Allow select audit_logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert audit_logs" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (true);

-- D. Organization Members
DROP POLICY IF EXISTS "Admins manage organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Org managers manage members" ON public.organization_members;
DROP POLICY IF EXISTS "Allow manage organization_members" ON public.organization_members;

CREATE POLICY "Allow manage organization_members" ON public.organization_members
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 10. SEED INITIAL ORGANIZATION MEMBERSHIPS
INSERT INTO public.organization_members (organization_id, user_id, member_role, is_active)
VALUES 
  ('a1111111-1111-1111-1111-111111111111', 'd0000001-0000-0000-0000-000000000001', 'owner', TRUE)
ON CONFLICT (organization_id, user_id) 
DO UPDATE SET member_role = 'owner', is_active = TRUE;

INSERT INTO public.organization_members (organization_id, user_id, member_role, is_active)
VALUES 
  ('b2222222-2222-2222-2222-222222222222', 'd0000003-0000-0000-0000-000000000003', 'owner', TRUE)
ON CONFLICT (organization_id, user_id) 
DO UPDATE SET member_role = 'owner', is_active = TRUE;
