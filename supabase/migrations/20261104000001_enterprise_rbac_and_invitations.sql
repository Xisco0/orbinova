-- ==============================================================================
-- ORBINOVA ENTERPRISE RBAC & INSTITUTIONAL INVITATION SYSTEM
-- Phase 5 Migration: Non-destructive column enhancement & invitations table
-- ==============================================================================

-- 1. Ensure member_role column exists in organization_members
ALTER TABLE public.organization_members 
ADD COLUMN IF NOT EXISTS member_role text DEFAULT 'staff';

-- Index for fast member role & active lookup
CREATE INDEX IF NOT EXISTS idx_org_members_user_org_active 
ON public.organization_members (user_id, organization_id, is_active);

-- 2. Create organization_invitations table for cryptographic staff onboarding
CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  member_role text NOT NULL DEFAULT 'staff',
  token_hash text NOT NULL UNIQUE,
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);

-- Index for fast token lookups and organization roster management
CREATE INDEX IF NOT EXISTS idx_org_invitations_token ON public.organization_invitations(token_hash);
CREATE INDEX IF NOT EXISTS idx_org_invitations_org_email ON public.organization_invitations(organization_id, email);
CREATE INDEX IF NOT EXISTS idx_org_invitations_status ON public.organization_invitations(status);

-- 3. Enable Row-Level Security on organization_invitations
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- Read policy: Organization members can read invitations for their own facility
DROP POLICY IF EXISTS "Members can view own org invitations" ON public.organization_invitations;
CREATE POLICY "Members can view own org invitations"
ON public.organization_invitations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_invitations.organization_id
    AND om.user_id = auth.uid()
    AND om.is_active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'admin'
  )
);

-- Insert policy: Only organization owners/managers can invite staff
DROP POLICY IF EXISTS "Owners and managers can create invitations" ON public.organization_invitations;
CREATE POLICY "Owners and managers can create invitations"
ON public.organization_invitations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_invitations.organization_id
    AND om.user_id = auth.uid()
    AND om.is_active = true
    AND (om.role IN ('owner', 'manager') OR om.member_role IN ('owner', 'manager'))
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'admin'
  )
);
