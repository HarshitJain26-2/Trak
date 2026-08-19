-- =============================================================================
-- Trak: Complete Removal of Project Invites & Share Links
-- Migration 00017_remove_project_invites.sql
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- =============================================================================

-- ─── 1. DROP SECURE INVITE LINK RPC FUNCTIONS ────────────────────────────────
DROP FUNCTION IF EXISTS public.update_project_invite_settings(TEXT, TEXT, TIMESTAMPTZ, INT);
DROP FUNCTION IF EXISTS public.join_project_with_invite(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.join_project_with_invite(TEXT);
DROP FUNCTION IF EXISTS public.create_project_invite(TEXT, TEXT, TIMESTAMPTZ, INT);
DROP FUNCTION IF EXISTS public.revoke_project_invite(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.get_project_active_invite(TEXT);
DROP FUNCTION IF EXISTS public.validate_project_invite(TEXT);

-- ─── 2. DROP LEGACY INVITE CODE RPC FUNCTIONS ────────────────────────────────
DROP FUNCTION IF EXISTS public.join_project_by_invite_code_v2(TEXT);
DROP FUNCTION IF EXISTS public.join_project_by_invite_code(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.regenerate_invite_code(TEXT, TEXT);

-- ─── 3. REMOVE REALTIME SUBSCRIPTION FOR INVITES ──────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'project_invites'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.project_invites;
  END IF;
END $$;

-- ─── 4. DROP PROJECT INVITES TABLE & POLICIES ─────────────────────────────────
DROP TABLE IF EXISTS public.project_invites CASCADE;

-- ─── 5. REMOVE LEGACY INVITE CODE COLUMN FROM PROJECTS TABLE ──────────────────
ALTER TABLE IF EXISTS public.projects DROP COLUMN IF EXISTS invite_code;
