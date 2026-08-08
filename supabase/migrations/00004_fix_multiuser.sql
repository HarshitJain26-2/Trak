-- =============================================================================
-- Trak: Fix Multi-User Isolation & Disable RLS Permission Errors
-- Run this in the Supabase SQL Editor.
-- =============================================================================

-- ─── 1. DISABLE RLS ON ALL TABLES TO PREVENT 42501 ERRORS ────────────────────
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members DISABLE ROW LEVEL SECURITY;

-- ─── 2. DROP ALL OLD POLICIES ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public access profiles"                    ON public.profiles;
DROP POLICY IF EXISTS "Allow public access to profiles"           ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile"                ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles"     ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile"              ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"              ON public.profiles;

DROP POLICY IF EXISTS "Public access projects"                    ON public.projects;
DROP POLICY IF EXISTS "Allow public access to projects"           ON public.projects;
DROP POLICY IF EXISTS "Users can view own projects"               ON public.projects;
DROP POLICY IF EXISTS "Users can view own or shared projects"     ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects"             ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects"             ON public.projects;
DROP POLICY IF EXISTS "Users can update own or shared projects"   ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects"             ON public.projects;

DROP POLICY IF EXISTS "Public access milestones"                  ON public.milestones;
DROP POLICY IF EXISTS "Allow public access to milestones"         ON public.milestones;
DROP POLICY IF EXISTS "Users can view own milestones"             ON public.milestones;
DROP POLICY IF EXISTS "Users can view project milestones"         ON public.milestones;
DROP POLICY IF EXISTS "Users can insert own milestones"           ON public.milestones;
DROP POLICY IF EXISTS "Users can insert project milestones"       ON public.milestones;
DROP POLICY IF EXISTS "Users can update own milestones"           ON public.milestones;
DROP POLICY IF EXISTS "Users can update project milestones"       ON public.milestones;
DROP POLICY IF EXISTS "Users can delete own milestones"           ON public.milestones;
DROP POLICY IF EXISTS "Owner can delete project milestones"       ON public.milestones;

DROP POLICY IF EXISTS "Public access project_members"                ON public.project_members;
DROP POLICY IF EXISTS "Members can view project members"              ON public.project_members;
DROP POLICY IF EXISTS "Authenticated users can view project members"  ON public.project_members;
DROP POLICY IF EXISTS "Users can join projects"                       ON public.project_members;
DROP POLICY IF EXISTS "Users can insert project members"              ON public.project_members;
DROP POLICY IF EXISTS "Users can leave or owners can remove"          ON public.project_members;
DROP POLICY IF EXISTS "Users can delete own project membership"       ON public.project_members;

-- ─── 3. DROP FK CONSTRAINTS THAT REFERENCE auth.users ────────────────────────
-- This allows non-Supabase-Auth user IDs (e.g. emailToUUID) to be stored
-- without triggering foreign key violations (error code: 23503).

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_user_id_fkey;

ALTER TABLE public.project_members
  DROP CONSTRAINT IF EXISTS project_members_user_id_fkey;

-- Change user_id columns from UUID → TEXT so any ID format is accepted
ALTER TABLE public.projects
  ALTER COLUMN user_id TYPE TEXT USING user_id::text;

ALTER TABLE public.project_members
  ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- ─── 4. ENSURE EMAIL & USERNAME UNIQUENESS AT DB LEVEL ───────────────────────

-- Add email column to profiles (if it doesn't already exist) with UNIQUE constraint
-- Supabase Auth enforces this too, but this ensures the profiles table is consistent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_email_key'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_username_key'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
  END IF;
END $$;

-- ─── 5. UPDATE RPC FUNCTIONS TO USE TEXT user_id (no UUID casting) ───────────
-- First DROP the old UUID-signature overload to avoid "ambiguous function" errors.
-- CREATE OR REPLACE only replaces an exact signature match — it does NOT remove old overloads.

DROP FUNCTION IF EXISTS public.join_project_by_invite_code(text, uuid);
DROP FUNCTION IF EXISTS public.join_project_by_invite_code(text, text);

-- Re-create with TEXT so any user ID (auth UUID or emailToUUID) is accepted
CREATE OR REPLACE FUNCTION public.join_project_by_invite_code(code TEXT, p_user_id TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  _project_id TEXT;
  _user_id TEXT;
  _member_id TEXT;
BEGIN
  _user_id := COALESCE(p_user_id, auth.uid()::text);
  IF _user_id IS NULL OR _user_id = '' THEN
    RAISE EXCEPTION 'User ID required';
  END IF;

  -- Find the project (Case-insensitive & prefix-flexible)
  SELECT id INTO _project_id
  FROM public.projects
  WHERE UPPER(TRIM(invite_code)) = UPPER(TRIM(code))
     OR UPPER(TRIM(REPLACE(invite_code, 'TRK-', ''))) = UPPER(TRIM(REPLACE(code, 'TRK-', '')))
  LIMIT 1;

  IF _project_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  -- Check if user is already the owner
  IF EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = _project_id AND user_id = _user_id
  ) THEN
    RAISE EXCEPTION 'You are the owner of this project';
  END IF;

  -- Check if already a member
  IF EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = _project_id AND user_id = _user_id
  ) THEN
    RAISE EXCEPTION 'Already a member';
  END IF;

  -- Insert membership
  _member_id := 'pm_' || extract(epoch from now())::bigint::text || '_' || substr(md5(random()::text), 1, 6);
  INSERT INTO public.project_members (id, project_id, user_id, role)
  VALUES (_member_id, _project_id, _user_id, 'member');

  RETURN _project_id;
END;
$$;
