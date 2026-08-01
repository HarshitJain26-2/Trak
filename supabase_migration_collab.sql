-- =============================================================================
-- Trak: Collaborative Feature Tracking — Migration
-- Run this in the Supabase SQL Editor
-- =============================================================================

-- 1. New table: project_members (maps users ↔ projects)
CREATE TABLE IF NOT EXISTS public.project_members (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
-- 5. Enable RLS on project_members
-- =============================================================================
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 6. Update RLS policies for PROJECTS — allow members to view/update
-- =============================================================================

-- Drop existing project policies
DROP POLICY IF EXISTS "Users can view own projects"   ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;

-- SELECT: owner OR member
CREATE POLICY "Users can view own or shared projects" ON public.projects
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = id AND pm.user_id = auth.uid()
    )
  );

-- INSERT: only the owner
CREATE POLICY "Users can insert own projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: owner OR member
CREATE POLICY "Users can update own or shared projects" ON public.projects
  FOR UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = id AND pm.user_id = auth.uid()
    )
  );

-- DELETE: owner only
CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- 7. RLS for project_members
-- =============================================================================

-- SELECT: anyone who is the owner of the project or is a member
CREATE POLICY "Members can view project members" ON public.project_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- INSERT: owner can add members, or user can add self (for join-by-code)
CREATE POLICY "Users can join projects" ON public.project_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

-- DELETE: owner can remove members, or member can remove self (leave)
CREATE POLICY "Users can leave or owners can remove" ON public.project_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

-- =============================================================================
-- 8. Update RLS policies for MILESTONES — allow members to CRUD
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own milestones"   ON public.milestones;
DROP POLICY IF EXISTS "Users can insert own milestones" ON public.milestones;
DROP POLICY IF EXISTS "Users can update own milestones" ON public.milestones;
DROP POLICY IF EXISTS "Users can delete own milestones" ON public.milestones;

-- SELECT: owner or member of the parent project
CREATE POLICY "Users can view project milestones" ON public.milestones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND (
        p.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
        )
      )
    )
  );

-- INSERT
CREATE POLICY "Users can insert project milestones" ON public.milestones
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND (
        p.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
        )
      )
    )
  );

-- UPDATE
CREATE POLICY "Users can update project milestones" ON public.milestones
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND (
        p.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
        )
      )
    )
  );

-- DELETE: only owner can delete milestones
CREATE POLICY "Owner can delete project milestones" ON public.milestones
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

-- =============================================================================
-- 9. RPC functions for invite code flow
-- =============================================================================

-- RPC: Lookup a project by invite code (returns minimal info)
CREATE OR REPLACE FUNCTION public.lookup_project_by_invite_code(code TEXT)
RETURNS TABLE(project_id TEXT, project_name TEXT, owner_name TEXT)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT
    p.id AS project_id,
    p.name AS project_name,
    COALESCE(pr.name, 'Unknown') AS owner_name
  FROM public.projects p
  LEFT JOIN public.profiles pr ON pr.id = p.user_id::text
  WHERE p.invite_code = code
  LIMIT 1;
$$;

-- RPC: Join a project by invite code
CREATE OR REPLACE FUNCTION public.join_project_by_invite_code(code TEXT)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  _project_id TEXT;
  _user_id UUID;
  _member_id TEXT;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
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
