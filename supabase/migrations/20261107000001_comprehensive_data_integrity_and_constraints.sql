-- ==============================================================================
-- ORBINOVA MIGRATION: COMPREHENSIVE DATA INTEGRITY, CONSTRAINTS & AUDIT TRAIL
-- Migration: 20261107000001_comprehensive_data_integrity_and_constraints.sql
-- ==============================================================================

-- 1. Create Blood Reservations Table (with strict constraints & foreign keys)
CREATE TABLE IF NOT EXISTS public.blood_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blood_request_id UUID NOT NULL REFERENCES public.blood_requests(id) ON DELETE RESTRICT,
  requesting_hospital_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  source_organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  blood_group blood_group_code NOT NULL REFERENCES public.blood_groups(code),
  component_type compatibility_type NOT NULL DEFAULT 'whole_blood',
  quantity INT NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (
    status IN ('reserved', 'preparing', 'issued', 'in_transit', 'received', 'delivered', 'cancelled', 'expired')
  ),
  expires_at TIMESTAMPTZ NOT NULL,
  reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  issued_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  transporter_details TEXT,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  idempotency_key TEXT UNIQUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing for multi-tenant query performance & referential queries
CREATE INDEX IF NOT EXISTS idx_blood_reservations_req_hosp 
  ON public.blood_reservations(requesting_hospital_id, status);

CREATE INDEX IF NOT EXISTS idx_blood_reservations_source_org 
  ON public.blood_reservations(source_organization_id, status);

CREATE INDEX IF NOT EXISTS idx_blood_reservations_request 
  ON public.blood_reservations(blood_request_id);

CREATE INDEX IF NOT EXISTS idx_blood_reservations_idempotency 
  ON public.blood_reservations(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 2. Create Physical Blood Units Table (DIN / Barcode Tracking)
CREATE TABLE IF NOT EXISTS public.blood_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_number TEXT NOT NULL UNIQUE, -- Donation Identification Number (DIN)
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  blood_group blood_group_code NOT NULL REFERENCES public.blood_groups(code),
  rh_factor TEXT NOT NULL CHECK (rh_factor IN ('+', '-')),
  component_type compatibility_type NOT NULL DEFAULT 'whole_blood',
  collection_date TIMESTAMPTZ NOT NULL,
  expiry_date TIMESTAMPTZ NOT NULL,
  testing_status TEXT NOT NULL DEFAULT 'untested' CHECK (
    testing_status IN ('untested', 'tested_safe', 'quarantined', 'discarded')
  ),
  status TEXT NOT NULL DEFAULT 'available' CHECK (
    status IN ('available', 'reserved', 'issued', 'transfused', 'expired', 'discarded')
  ),
  storage_location TEXT,
  current_reservation_id UUID REFERENCES public.blood_reservations(id) ON DELETE SET NULL,
  donation_id UUID REFERENCES public.donations(id) ON DELETE SET NULL,
  donor_id UUID REFERENCES public.donor_profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_unit_expiry_after_collection CHECK (expiry_date > collection_date)
);

CREATE INDEX IF NOT EXISTS idx_blood_units_org_bg_status 
  ON public.blood_units(organization_id, blood_group, status, testing_status);

CREATE INDEX IF NOT EXISTS idx_blood_units_din 
  ON public.blood_units(unit_number);

CREATE INDEX IF NOT EXISTS idx_blood_units_reservation 
  ON public.blood_units(current_reservation_id) WHERE current_reservation_id IS NOT NULL;

-- 3. Enhance organization_members Uniqueness
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

-- 4. Audit Log Checksum & Mutex Constraint Verification
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'audit_logs' 
      AND column_name = 'checksum'
  ) THEN
    ALTER TABLE public.audit_logs ADD COLUMN checksum TEXT;
  END IF;
END $$;

-- 5. Safe Trigger to Auto-maintain updated_at timestamp
CREATE OR REPLACE FUNCTION public.maintain_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_blood_reservations_updated_at ON public.blood_reservations;
CREATE TRIGGER trg_blood_reservations_updated_at
  BEFORE UPDATE ON public.blood_reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.maintain_updated_at_column();

DROP TRIGGER IF EXISTS trg_blood_units_updated_at ON public.blood_units;
CREATE TRIGGER trg_blood_units_updated_at
  BEFORE UPDATE ON public.blood_units
  FOR EACH ROW
  EXECUTE FUNCTION public.maintain_updated_at_column();
