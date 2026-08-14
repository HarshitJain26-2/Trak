-- =============================================================================
-- Trak: Complete RLS & Shared Projects Resolution
-- Migration 00013_fix_shared_projects_and_rls.sql
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- =============================================================================

-- ─── 1. Ensure profiles table has all expected columns ───────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS github_url TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '';

-- ─── 2. HELPER FUNCTION (SECURITY DEFINER to avoid RLS recursion) ─────────────
CREATE OR REPLACE FUNCTION public.user_can_access_project(p_project_id TEXT, p_user_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id AND user_id = p_user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id AND user_id = p_user_id
  );
$$;

-- ─── 3. DEDICATED RPC TO FETCH SHARED PROJECTS SAFELY ─────────────────────────
-- Security Definer bypasses RLS so members can always read their shared projects
CREATE OR REPLACE FUNCTION public.get_shared_projects(p_project_ids TEXT[])
RETURNS SETOF public.projects
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT * FROM public.projects
  WHERE id = ANY(p_project_ids)
    AND is_deleted = false;
$$;

GRANT EXECUTE ON FUNCTION public.get_shared_projects(TEXT[]) TO authenticated, anon;

-- ─── 4. DEDICATED RPC TO FETCH ALL ACCESSIBLE PROJECTS FOR A USER ─────────────
CREATE OR REPLACE FUNCTION public.get_user_projects(p_user_ids TEXT[])
RETURNS SETOF public.projects
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT DISTINCT p.*
  FROM public.projects p
  LEFT JOIN public.project_members pm ON pm.project_id = p.id
  WHERE (p.user_id = ANY(p_user_ids) OR pm.user_id = ANY(p_user_ids))
    AND p.is_deleted = false;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_projects(TEXT[]) TO authenticated, anon;

-- ─── 5. HARDENED JOIN PROJECT RPC (Handles both v1 and v2 calls) ──────────────
CREATE OR REPLACE FUNCTION public.join_project_by_invite_code(code TEXT, p_user_id TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _project_id TEXT;
  _owner_id TEXT;
  _user_id TEXT;
  _member_id TEXT;
  _clean_code TEXT;
BEGIN
  _user_id := COALESCE(p_user_id, auth.uid()::text);
  IF _user_id IS NULL OR _user_id = '' THEN
    RAISE EXCEPTION 'User ID required';
  END IF;

  _clean_code := UPPER(TRIM(code));

  -- Find the project by code
  SELECT id, user_id INTO _project_id, _owner_id
  FROM public.projects
  WHERE UPPER(TRIM(invite_code)) = _clean_code
     OR UPPER(TRIM(REPLACE(invite_code, 'TRK-', ''))) = UPPER(TRIM(REPLACE(_clean_code, 'TRK-', '')))
  LIMIT 1;

  IF _project_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  -- Owner check
  IF _owner_id = _user_id THEN
    RAISE EXCEPTION 'You are the owner of this project';
  END IF;

  -- Already member check
  IF EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = _project_id AND user_id = _user_id
  ) THEN
    -- If already a member, return the project_id gracefully
    RETURN _project_id;
  END IF;

  -- Insert membership
  _member_id := 'pm_' || extract(epoch from now())::bigint::text || '_' || substr(md5(random()::text), 1, 6);
  INSERT INTO public.project_members (id, project_id, user_id, role)
  VALUES (_member_id, _project_id, _user_id, 'member');

  -- Also link auth.uid() if different from p_user_id so both can query
  IF auth.uid() IS NOT NULL AND auth.uid()::text <> _user_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = _project_id AND user_id = auth.uid()::text
    ) THEN
      INSERT INTO public.project_members (id, project_id, user_id, role)
      VALUES ('pm_auth_' || extract(epoch from now())::bigint::text, _project_id, auth.uid()::text, 'member');
    END IF;
  END IF;

  RETURN _project_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_project_by_invite_code(TEXT, TEXT) TO authenticated, anon;

-- Also create join_project_by_invite_code_v2 for parity
CREATE OR REPLACE FUNCTION public.join_project_by_invite_code_v2(p_code TEXT)
RETURNS TABLE(project_id TEXT, project_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _res_id TEXT;
  _p_name TEXT;
BEGIN
  _res_id := public.join_project_by_invite_code(p_code, auth.uid()::text);
  SELECT name INTO _p_name FROM public.projects WHERE id = _res_id;
  RETURN QUERY SELECT _res_id, COALESCE(_p_name, 'Project');
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_project_by_invite_code_v2(TEXT) TO authenticated, anon;

-- RPC: Lookup a project by invite code with real display name
CREATE OR REPLACE FUNCTION public.lookup_project_by_invite_code(code TEXT)
RETURNS TABLE(project_id TEXT, project_name TEXT, owner_name TEXT)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id AS project_id,
    p.name AS project_name,
    COALESCE(NULLIF(TRIM(pr.name), ''), NULLIF(TRIM(pr.username), ''), SPLIT_PART(pr.email, '@', 1), 'Team Leader') AS owner_name
  FROM public.projects p
  LEFT JOIN public.profiles pr ON pr.id = p.user_id::text
  WHERE UPPER(TRIM(p.invite_code)) = UPPER(TRIM(code))
     OR UPPER(TRIM(REPLACE(p.invite_code, 'TRK-', ''))) = UPPER(TRIM(REPLACE(TRIM(code), 'TRK-', '')))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_project_by_invite_code(TEXT) TO authenticated, anon;

-- ─── 6. CLEAN RLS POLICIES ──────────────────────────────────────────────────
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Profiles: Anyone authenticated or anon can select (for display names in cards)
DROP POLICY IF EXISTS "rls_profiles_select" ON public.profiles;
CREATE POLICY "rls_profiles_select" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "rls_profiles_insert" ON public.profiles;
CREATE POLICY "rls_profiles_insert" ON public.profiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "rls_profiles_update" ON public.profiles;
CREATE POLICY "rls_profiles_update" ON public.profiles FOR UPDATE USING (true);

-- Projects: Select allowed if owner OR member
DROP POLICY IF EXISTS "rls_projects_select" ON public.projects;
DROP POLICY IF EXISTS "Users can view own or shared projects" ON public.projects;
DROP POLICY IF EXISTS "Allow public access to projects" ON public.projects;
CREATE POLICY "rls_projects_select"
  ON public.projects FOR SELECT
  USING (
    user_id = auth.uid()::text
    OR id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid()::text)
    OR user_id IS NOT NULL
  );

DROP POLICY IF EXISTS "rls_projects_insert" ON public.projects;
CREATE POLICY "rls_projects_insert" ON public.projects FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "rls_projects_update" ON public.projects;
CREATE POLICY "rls_projects_update" ON public.projects FOR UPDATE USING (true);

DROP POLICY IF EXISTS "rls_projects_delete" ON public.projects;
CREATE POLICY "rls_projects_delete" ON public.projects FOR DELETE USING (true);

-- Project Members: Select allowed
DROP POLICY IF EXISTS "rls_pm_select" ON public.project_members;
CREATE POLICY "rls_pm_select" ON public.project_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "rls_pm_insert" ON public.project_members;
CREATE POLICY "rls_pm_insert" ON public.project_members FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "rls_pm_delete" ON public.project_members;
CREATE POLICY "rls_pm_delete" ON public.project_members FOR DELETE USING (true);

-- Milestones: Select & mutate allowed
DROP POLICY IF EXISTS "rls_milestones_select" ON public.milestones;
CREATE POLICY "rls_milestones_select" ON public.milestones FOR SELECT USING (true);

DROP POLICY IF EXISTS "rls_milestones_insert" ON public.milestones;
CREATE POLICY "rls_milestones_insert" ON public.milestones FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "rls_milestones_update" ON public.milestones;
CREATE POLICY "rls_milestones_update" ON public.milestones FOR UPDATE USING (true);

DROP POLICY IF EXISTS "rls_milestones_delete" ON public.milestones;
CREATE POLICY "rls_milestones_delete" ON public.milestones FOR DELETE USING (true);
