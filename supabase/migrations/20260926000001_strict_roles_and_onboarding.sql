-- ==============================================================================
-- SmartDonor Migration: Strict Roles, Admin Hierarchy, and Onboarding/Offboarding
-- ==============================================================================

-- 1. Add 'unboarded' to verification_status enum if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumtypid = 'public.verification_status'::regtype 
    AND enumlabel = 'unboarded'
  ) THEN
    ALTER TYPE public.verification_status ADD VALUE 'unboarded';
  END IF;
END $$;

-- 2. Add admin_role column to profiles if not present
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS admin_role TEXT DEFAULT NULL;

-- 3. Add constraint for valid admin_roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_admin_role_check'
  ) THEN
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_admin_role_check 
    CHECK (admin_role IS NULL OR admin_role IN ('super_admin', 'admin', 'moderator', 'operations'));
  END IF;
END $$;

-- 4. Ensure initial Super Admin accounts have admin_role = 'super_admin'
UPDATE public.profiles 
SET admin_role = 'super_admin'
WHERE role = 'admin' AND (admin_role IS NULL OR admin_role = '');

-- 5. Add index on profiles(role, is_active) for blazing fast role-isolated queries
CREATE INDEX IF NOT EXISTS idx_profiles_role_active 
ON public.profiles(role, is_active);

-- 6. Add index on donor_profiles(availability_status, eligibility_status, verification_status)
CREATE INDEX IF NOT EXISTS idx_donor_profiles_matching_status 
ON public.donor_profiles(availability_status, eligibility_status, verification_status);

-- 7. Add index on organizations(organization_type, verification_status, is_active)
CREATE INDEX IF NOT EXISTS idx_organizations_type_status 
ON public.organizations(organization_type, verification_status, is_active);

-- 8. Add unboarding/metadata notes column to organizations and donor_profiles if not present
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS offboarded_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS offboarded_by UUID REFERENCES auth.users(id) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS offboarding_reason TEXT DEFAULT NULL;

ALTER TABLE public.donor_profiles
ADD COLUMN IF NOT EXISTS offboarded_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS offboarded_by UUID REFERENCES auth.users(id) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS offboarding_reason TEXT DEFAULT NULL;
