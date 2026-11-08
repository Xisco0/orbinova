-- ====================================================================
-- ORBINOVA MIGRATION: DONOR SCREENING APPOINTMENTS & MEDICAL ELIGIBILITY
-- Connects Hospital Portal & Donor Portal for Clinical Screening Coordination
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.donor_screenings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blood_request_id UUID NOT NULL REFERENCES public.blood_requests(id) ON DELETE CASCADE,
  donor_request_id UUID,
  donor_id UUID NOT NULL REFERENCES public.donor_profiles(id) ON DELETE CASCADE,
  donor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  hospital_name TEXT NOT NULL,
  hospital_address TEXT NOT NULL,
  screening_type TEXT NOT NULL CHECK (screening_type IN ('asap', 'scheduled')),
  scheduled_date DATE,
  scheduled_time TIME,
  instructions TEXT,
  status TEXT NOT NULL DEFAULT 'awaiting_donor_confirmation'
    CHECK (status IN (
      'screening_scheduled',
      'awaiting_donor_confirmation',
      'attendance_confirmed',
      'rescheduling_requested',
      'unable_to_attend',
      'screening_completed',
      'cancelled'
    )),
  donor_response_note TEXT,
  reschedule_reason TEXT,
  medical_eligibility TEXT DEFAULT 'pending'
    CHECK (medical_eligibility IN (
      'pending',
      'eligible',
      'temporarily_deferred',
      'permanently_deferred'
    )),
  screening_completed_at TIMESTAMPTZ,
  screened_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  medical_notes TEXT,
  deferral_reason TEXT,
  deferral_until DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performant filtering and tenant isolation
CREATE INDEX IF NOT EXISTS idx_donor_screenings_blood_request ON public.donor_screenings(blood_request_id);
CREATE INDEX IF NOT EXISTS idx_donor_screenings_hospital ON public.donor_screenings(hospital_id);
CREATE INDEX IF NOT EXISTS idx_donor_screenings_donor ON public.donor_screenings(donor_id);
CREATE INDEX IF NOT EXISTS idx_donor_screenings_donor_user ON public.donor_screenings(donor_user_id);
CREATE INDEX IF NOT EXISTS idx_donor_screenings_status ON public.donor_screenings(status);

-- Enable RLS
ALTER TABLE public.donor_screenings ENABLE ROW LEVEL SECURITY;

-- Hospital members can view screenings belonging to their institution
CREATE POLICY "Hospital members view own screenings"
  ON public.donor_screenings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = donor_screenings.hospital_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

-- Donors can view their own screening appointments
CREATE POLICY "Donors view own screenings"
  ON public.donor_screenings
  FOR SELECT
  TO authenticated
  USING (donor_user_id = auth.uid());
