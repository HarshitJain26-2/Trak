-- =============================================================================
-- Trak: Collaborative Feature Tracking — Migration (No Auth Required)
-- Run this in the Supabase SQL Editor
-- =============================================================================

-- 1. New table: project_members (maps users ↔ projects)
CREATE TABLE IF NOT EXISTS public.project_members (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',  -- 'owner' | 'member'
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- 2. Add invite_code to projects (short shareable code)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- 3. Add completed_by to milestones (who marked it done)
ALTER TABLE public.milestones
  ADD COLUMN IF NOT EXISTS completed_by TEXT;  -- stores user's display name

-- 4. Add added_by to milestones (who created the feature)
ALTER TABLE public.milestones
  ADD COLUMN IF NOT EXISTS added_by TEXT;

-- =============================================================================
-- 5. Open RLS policies for all tables — Allows full CRUD without auth requirement
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow public access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public access profiles" ON public.profiles;

DROP POLICY IF EXISTS "Allow public access to projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view own or shared projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own or shared projects" ON public.projects;
DROP POLICY IF EXISTS "Public access projects" ON public.projects;

DROP POLICY IF EXISTS "Allow public access to milestones" ON public.milestones;
DROP POLICY IF EXISTS "Users can view own milestones" ON public.milestones;
DROP POLICY IF EXISTS "Users can insert own milestones" ON public.milestones;
DROP POLICY IF EXISTS "Users can update own milestones" ON public.milestones;
DROP POLICY IF EXISTS "Users can delete own milestones" ON public.milestones;
DROP POLICY IF EXISTS "Users can view project milestones" ON public.milestones;
DROP POLICY IF EXISTS "Users can insert project milestones" ON public.milestones;
DROP POLICY IF EXISTS "Users can update project milestones" ON public.milestones;
DROP POLICY IF EXISTS "Owner can delete project milestones" ON public.milestones;
DROP POLICY IF EXISTS "Public access milestones" ON public.milestones;

DROP POLICY IF EXISTS "Members can view project members" ON public.project_members;
DROP POLICY IF EXISTS "Users can join projects" ON public.project_members;
DROP POLICY IF EXISTS "Users can leave or owners can remove" ON public.project_members;
DROP POLICY IF EXISTS "Authenticated users can view project members" ON public.project_members;
DROP POLICY IF EXISTS "Users can insert project members" ON public.project_members;
DROP POLICY IF EXISTS "Users can delete own project membership" ON public.project_members;
DROP POLICY IF EXISTS "Public access project_members" ON public.project_members;

-- Create open public policies
CREATE POLICY "Public access profiles" ON public.profiles FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public access projects" ON public.projects FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public access milestones" ON public.milestones FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public access project_members" ON public.project_members FOR ALL TO public USING (true) WITH CHECK (true);

-- =============================================================================
-- 6. RPC functions for invite code flow (No Auth Required)
-- =============================================================================

-- RPC: Lookup a project by invite code (returns minimal info)
CREATE OR REPLACE FUNCTION public.lookup_project_by_invite_code(code TEXT)
RETURNS TABLE(project_id TEXT, project_name TEXT, owner_name TEXT)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT
    p.id AS project_id,
    p.name AS project_name,
    COALESCE(pr.name, 'Developer') AS owner_name
  FROM public.projects p
  LEFT JOIN public.profiles pr ON pr.id = p.user_id::text
  WHERE p.invite_code = code
  LIMIT 1;
$$;

-- RPC: Join a project by invite code (Supports unauthenticated device users)
CREATE OR REPLACE FUNCTION public.join_project_by_invite_code(code TEXT, p_user_id UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  _project_id TEXT;
  _user_id UUID;
  _member_id TEXT;
BEGIN
  _user_id := COALESCE(p_user_id, auth.uid());
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'User ID required';
  END IF;

  -- Find the project
  SELECT id INTO _project_id
  FROM public.projects
  WHERE invite_code = code;

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
