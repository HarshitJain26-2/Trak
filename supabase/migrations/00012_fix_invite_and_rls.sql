-- =============================================================================
-- Trak: Security Hardening & Invite Code Flow Fix
-- Migration 00012_fix_invite_and_rls.sql
-- =============================================================================

-- ─── 1. REFRESH NON-RECURSIVE RLS HELPER FUNCTION ────────────────────────────
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

-- ─── 2. RE-ENABLE RLS ON ALL TABLES ──────────────────────────────────────────
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Drop prior policies for idempotent re-execution
DROP POLICY IF EXISTS "rls_profiles_select"  ON public.profiles;
DROP POLICY IF EXISTS "rls_profiles_insert"  ON public.profiles;
DROP POLICY IF EXISTS "rls_profiles_update"  ON public.profiles;

DROP POLICY IF EXISTS "rls_projects_select"  ON public.projects;
DROP POLICY IF EXISTS "rls_projects_insert"  ON public.projects;
DROP POLICY IF EXISTS "rls_projects_update"  ON public.projects;
DROP POLICY IF EXISTS "rls_projects_delete"  ON public.projects;

DROP POLICY IF EXISTS "rls_milestones_select" ON public.milestones;
DROP POLICY IF EXISTS "rls_milestones_insert" ON public.milestones;
DROP POLICY IF EXISTS "rls_milestones_update" ON public.milestones;
DROP POLICY IF EXISTS "rls_milestones_delete" ON public.milestones;

DROP POLICY IF EXISTS "rls_pm_select" ON public.project_members;
DROP POLICY IF EXISTS "rls_pm_insert" ON public.project_members;
DROP POLICY IF EXISTS "rls_pm_delete" ON public.project_members;

-- ─── 3. PROFILES POLICIES ───────────────────────────────────────────────────
CREATE POLICY "rls_profiles_select"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "rls_profiles_insert"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = id);

CREATE POLICY "rls_profiles_update"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

-- ─── 4. PROJECTS POLICIES ───────────────────────────────────────────────────
CREATE POLICY "rls_projects_select"
  ON public.projects FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()::text
    OR public.user_can_access_project(id, auth.uid()::text)
  );

CREATE POLICY "rls_projects_insert"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "rls_projects_update"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()::text
    OR public.user_can_access_project(id, auth.uid()::text)
  );

CREATE POLICY "rls_projects_delete"
  ON public.projects FOR DELETE
  TO authenticated
  USING (user_id = auth.uid()::text);

-- ─── 5. MILESTONES POLICIES ─────────────────────────────────────────────────
CREATE POLICY "rls_milestones_select"
  ON public.milestones FOR SELECT
  TO authenticated
  USING (
    public.user_can_access_project(project_id, auth.uid()::text)
  );

CREATE POLICY "rls_milestones_insert"
  ON public.milestones FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_can_access_project(project_id, auth.uid()::text)
  );

CREATE POLICY "rls_milestones_update"
  ON public.milestones FOR UPDATE
  TO authenticated
  USING (
    public.user_can_access_project(project_id, auth.uid()::text)
  );

CREATE POLICY "rls_milestones_delete"
  ON public.milestones FOR DELETE
  TO authenticated
  USING (
    public.user_can_access_project(project_id, auth.uid()::text)
  );

-- ─── 6. PROJECT_MEMBERS POLICIES ────────────────────────────────────────────
-- NO general INSERT policy! Membership insertion is strictly controlled via RPC.
CREATE POLICY "rls_pm_select"
  ON public.project_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()::text
    OR public.user_can_access_project(project_id, auth.uid()::text)
  );

CREATE POLICY "rls_pm_delete"
  ON public.project_members FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()::text
    )
  );

-- ─── 7. HARDENED SECURE INVITE CODE RPC ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.join_project_by_invite_code_v2(p_code TEXT)
RETURNS TABLE(project_id TEXT, project_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id TEXT;
  _project_id TEXT;
  _project_name TEXT;
  _owner_id TEXT;
  _clean_code TEXT;
  _member_id TEXT;
BEGIN
  _user_id := auth.uid()::text;
  IF _user_id IS NULL OR _user_id = '' THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  _clean_code := TRIM(UPPER(p_code));
  IF _clean_code IS NULL OR _clean_code = '' THEN
    RAISE EXCEPTION 'INVALID_CODE';
  END IF;

  -- Find project by invite code (case-insensitive & trimmed)
  SELECT id, name, user_id INTO _project_id, _project_name, _owner_id
  FROM public.projects
  WHERE TRIM(UPPER(invite_code)) = _clean_code
  LIMIT 1;

  IF _project_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_CODE';
  END IF;

  -- Check if owner
  IF _owner_id = _user_id THEN
    RAISE EXCEPTION 'OWNER_CANNOT_JOIN';
  END IF;

  -- Check if already member
  IF EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = _project_id AND user_id = _user_id
  ) THEN
    RAISE EXCEPTION 'ALREADY_MEMBER';
  END IF;

  -- Insert membership
  _member_id := 'pm_' || extract(epoch from now())::bigint::text || '_' || substr(md5(random()::text), 1, 6);
  INSERT INTO public.project_members (id, project_id, user_id, role)
  VALUES (_member_id, _project_id, _user_id, 'member');

  RETURN QUERY SELECT _project_id, _project_name;
END;
$$;

-- Restrict execution to authenticated users only
REVOKE EXECUTE ON FUNCTION public.join_project_by_invite_code_v2(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_project_by_invite_code_v2(TEXT) TO authenticated;
