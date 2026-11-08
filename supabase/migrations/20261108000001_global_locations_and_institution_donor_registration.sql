-- ============================================================================
-- ORBINOVA MIGRATION: GLOBAL LOCATIONS & INSTITUTION-BASED DONOR REGISTRATION
-- Supports global addresses, coordinates, registering institution relationships,
-- location consent, and location change audit history.
-- ============================================================================

-- 1. Extend organizations table with postal_code and coordinate validation
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- 2. Extend donor_profiles table with international location, consent, names, and registering institution
ALTER TABLE public.donor_profiles
  ADD COLUMN IF NOT EXISTS registering_organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS other_names TEXT,
  ADD COLUMN IF NOT EXISTS surname TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS location_consent BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Create indexes for tenant scoping and geospatial queries
CREATE INDEX IF NOT EXISTS idx_donor_profiles_registering_org 
  ON public.donor_profiles(registering_organization_id);

CREATE INDEX IF NOT EXISTS idx_donor_profiles_location 
  ON public.donor_profiles(country, state, city);

CREATE INDEX IF NOT EXISTS idx_donor_profiles_coords 
  ON public.donor_profiles(latitude, longitude) 
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 3. Create donor_location_history table for auditing location modifications
CREATE TABLE IF NOT EXISTS public.donor_location_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID NOT NULL REFERENCES public.donor_profiles(id) ON DELETE CASCADE,
  country TEXT NOT NULL,
  state TEXT,
  city TEXT,
  district TEXT,
  postal_code TEXT,
  latitude DOUBLE PRECISION CHECK (latitude IS NULL OR (latitude >= -90.0 AND latitude <= 90.0)),
  longitude DOUBLE PRECISION CHECK (longitude IS NULL OR (longitude >= -180.0 AND longitude <= 180.0)),
  location_consent BOOLEAN NOT NULL DEFAULT TRUE,
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donor_location_history_donor 
  ON public.donor_location_history(donor_id, created_at DESC);
