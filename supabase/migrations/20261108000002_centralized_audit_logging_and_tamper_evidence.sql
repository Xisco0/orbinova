-- ============================================================================
-- ORBINOVA ENTERPRISE CENTRALIZED AUDIT LOGGING & TAMPER-EVIDENCE
-- Migration: 20261108000002_centralized_audit_logging_and_tamper_evidence.sql
-- ============================================================================

-- 1. Ensure columns exist on public.audit_logs
DO $$
BEGIN
  -- Add checksum if not present
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'checksum'
  ) THEN
    ALTER TABLE public.audit_logs ADD COLUMN checksum TEXT;
  END IF;

  -- Add previous_hash for cryptographic hash chaining
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'previous_hash'
  ) THEN
    ALTER TABLE public.audit_logs ADD COLUMN previous_hash TEXT;
  END IF;

  -- Add hash for cryptographic verification
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'hash'
  ) THEN
    ALTER TABLE public.audit_logs ADD COLUMN hash TEXT;
  END IF;

  -- Add status column (success / failure)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.audit_logs ADD COLUMN status TEXT DEFAULT 'success';
  END IF;

  -- Add description column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'description'
  ) THEN
    ALTER TABLE public.audit_logs ADD COLUMN description TEXT;
  END IF;

  -- Add correlation_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'correlation_id'
  ) THEN
    ALTER TABLE public.audit_logs ADD COLUMN correlation_id TEXT;
  END IF;
END $$;

-- 2. Indices for performant multi-tenant filtered querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created 
  ON public.audit_logs(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created 
  ON public.audit_logs(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity 
  ON public.audit_logs(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_status 
  ON public.audit_logs(status, created_at DESC);

-- 3. Strict Append-Only Immutability Enforcement
-- Raises an exception if any user attempts to UPDATE or DELETE an audit log record
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'SECURITY_VIOLATION: Audit logs are immutable and append-only. Modification or deletion of audit records is strictly prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_audit_log_mutation ON public.audit_logs;
CREATE TRIGGER trg_prevent_audit_log_mutation
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();

-- 4. Multi-Tenant Row Level Security (RLS) Policies
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Platform Super Admin can view all audit records
DROP POLICY IF EXISTS "Super Admins view all audit logs" ON public.audit_logs;
CREATE POLICY "Super Admins view all audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Institutional Owners (Hospital Owner / Blood Bank Owner) can view ONLY their own institution's audit logs
DROP POLICY IF EXISTS "Institutional owners view own facility audit logs" ON public.audit_logs;
CREATE POLICY "Institutional owners view own facility audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    organization_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = audit_logs.organization_id
        AND om.user_id = auth.uid()
        AND om.member_role = 'owner'
        AND om.is_active = TRUE
    )
  );

-- Authenticated users or background workers can insert audit records (append-only)
DROP POLICY IF EXISTS "Authenticated users can insert audit records" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert audit records" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);
