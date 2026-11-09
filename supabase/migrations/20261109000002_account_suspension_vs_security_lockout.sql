-- Migration: 20261109000002_account_suspension_vs_security_lockout.sql
-- Description: Separates administrative account suspension from automated failed-login security lockouts.

DO $$
BEGIN
    -- Ensure is_active exists on public.profiles
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
    END IF;

    -- 1. Add is_suspended column to public.profiles if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'is_suspended'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN is_suspended BOOLEAN DEFAULT FALSE;
    END IF;

    -- 2. Add suspended_at timestamp
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'suspended_at'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN suspended_at TIMESTAMPTZ;
    END IF;

    -- 3. Add suspended_by uuid
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'suspended_by'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN suspended_by UUID;
    END IF;

    -- 4. Add suspension_reason text
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'suspension_reason'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN suspension_reason TEXT;
    END IF;

    -- 5. Add security_locked column to public.profiles if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'security_locked'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN security_locked BOOLEAN DEFAULT FALSE;
    END IF;

    -- 6. Add security_locked_at timestamp
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'security_locked_at'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN security_locked_at TIMESTAMPTZ;
    END IF;
END $$;

-- 7. Create indexes for high-performance lookup
CREATE INDEX IF NOT EXISTS idx_profiles_is_suspended ON public.profiles(is_suspended) WHERE is_suspended = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_security_locked ON public.profiles(security_locked) WHERE security_locked = TRUE;

-- 8. Backfill existing inactive profiles as suspended if not already set
UPDATE public.profiles
SET is_suspended = TRUE
WHERE is_active = FALSE AND is_suspended IS NOT TRUE;
