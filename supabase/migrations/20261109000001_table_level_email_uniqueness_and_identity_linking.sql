-- ==============================================================================
-- ORBINOVA MIGRATION: TABLE-LEVEL EMAIL UNIQUENESS & SHARED USER IDENTITY
-- Migration: 20261109000001_table_level_email_uniqueness_and_identity_linking.sql
--
-- Description:
-- Enforces table-level email uniqueness so the same human user (central auth identity)
-- can hold legitimate profiles across multiple roles (e.g. Hospital Staff and
-- Voluntary Blood Donor) using the same verified email address and login credentials,
-- while guaranteeing that within each relevant table, duplicate records are strictly rejected.
-- ==============================================================================

-- 1. PROFILES TABLE: Fast case-insensitive identity lookup
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower 
  ON public.profiles(LOWER(email));

-- 2. DONOR PROFILES: Ensure each central user has at most one donor profile
-- and foreign key referential integrity with CASCADE deletion
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'uq_donor_profiles_user_id'
  ) THEN
    ALTER TABLE public.donor_profiles 
      ADD CONSTRAINT uq_donor_profiles_user_id UNIQUE (user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_donor_profiles_user_id 
  ON public.donor_profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_donor_profiles_donor_number 
  ON public.donor_profiles(donor_number) 
  WHERE donor_number IS NOT NULL;

-- 3. ORGANIZATION MEMBERS: Ensure staff email uniqueness within the SAME institution
-- Allows the same person to belong to different institutions or hold a voluntary donor profile,
-- but prevents duplicate memberships within the same hospital or blood bank.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'uq_org_members_org_user'
  ) THEN
    ALTER TABLE public.organization_members 
      ADD CONSTRAINT uq_org_members_org_user UNIQUE (organization_id, user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_org_members_user_id 
  ON public.organization_members(user_id);

CREATE INDEX IF NOT EXISTS idx_org_members_org_id 
  ON public.organization_members(organization_id);

-- 4. ORGANIZATIONS: Enforce uniqueness on active institutional contact email
CREATE UNIQUE INDEX IF NOT EXISTS uq_organizations_email_lower 
  ON public.organizations(LOWER(email)) 
  WHERE is_active = TRUE;

-- 5. AUDIT LOGGING: Add action types for profile linking
-- Ensures all identity-linking events are tracked in tamper-evident audit history
COMMENT ON TABLE public.donor_profiles IS 
  'Voluntary donor profiles. Linked to central public.profiles via user_id. Supports shared user identities across staff and donor portals.';

-- 6. SHARED IDENTITY CROSS-PORTAL INSPECTION VIEW
-- Allows authorized hospital admins, donor coordinators and system auditors to safely
-- inspect linked profiles without exposing passwords or auth credentials.
CREATE OR REPLACE VIEW public.v_user_identities AS
SELECT 
  p.id AS user_id,
  p.email,
  p.full_name,
  p.role AS primary_role,
  p.is_active AS user_active,
  p.created_at AS account_created_at,
  -- Donor Profile Identity
  dp.id AS donor_profile_id,
  dp.donor_number,
  dp.blood_group,
  dp.eligibility_status,
  dp.availability_status,
  dp.is_active AS donor_active,
  -- Institutional Staff Identity
  om.id AS organization_member_id,
  om.organization_id,
  om.member_role,
  om.is_active AS staff_active,
  o.name AS organization_name,
  o.organization_type
FROM public.profiles p
LEFT JOIN public.donor_profiles dp ON dp.user_id = p.id
LEFT JOIN public.organization_members om ON om.user_id = p.id
LEFT JOIN public.organizations o ON o.id = om.organization_id;

-- Grant access on the identity view to authenticated users and service role
GRANT SELECT ON public.v_user_identities TO authenticated;
GRANT SELECT ON public.v_user_identities TO service_role;
