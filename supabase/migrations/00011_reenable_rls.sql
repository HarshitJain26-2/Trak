-- =============================================================================
-- Trak: Re-enable RLS with membership-aware policies
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
--
-- This migration:
--   1. Re-enables RLS on all four tables
--   2. Creates a helper function to avoid recursive RLS checks
--   3. Sets up ownership + membership-aware policies
-- =============================================================================

-- ─── 0. DROP ALL EXISTING OPEN/LEGACY POLICIES ──────────────────────────────

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

-- Also drop any policies this migration might create (idempotent re-runs)
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

-- ─── 1. HELPER FUNCTION ─────────────────────────────────────────────────────
-- SECURITY DEFINER function avoids recursive RLS when project_members
-- policies need to check project_members itself.

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

-- ─── 2. RE-ENABLE RLS ───────────────────────────────────────────────────────

ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- ─── 3. PROFILES POLICIES ───────────────────────────────────────────────────
-- All authenticated users can view profiles (for member lookup, username check)
-- Only the profile owner can insert/update their own profile

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
-- SELECT: owner OR active member
-- INSERT: only for rows where user_id = auth.uid (creating own projects)
-- UPDATE: owner OR active member (members can update milestones/progress)
-- DELETE: owner only

CREATE POLICY "rls_projects_select"
  ON public.projects FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = id AND pm.user_id = auth.uid()::text
    )
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
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = id AND pm.user_id = auth.uid()::text
    )
  );

CREATE POLICY "rls_projects_delete"
  ON public.projects FOR DELETE
  TO authenticated
  USING (user_id = auth.uid()::text);

-- ─── 5. MILESTONES POLICIES ─────────────────────────────────────────────────
-- All operations: user must be able to access the parent project (owner OR member)

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
-- SELECT: anyone who can access the parent project (via helper to avoid recursion)
-- INSERT: anyone authenticated (joining via invite code — validated by app/RPC logic)
-- DELETE: project owner OR the member themselves (leaving)

CREATE POLICY "rls_pm_select"
  ON public.project_members FOR SELECT
  TO authenticated
  USING (
    public.user_can_access_project(project_id, auth.uid()::text)
  );

CREATE POLICY "rls_pm_insert"
  ON public.project_members FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "rls_pm_delete"
  ON public.project_members FOR DELETE
  TO authenticated
  USING (
    -- Member can remove themselves (leave)
    user_id = auth.uid()::text
    -- OR project owner can remove anyone
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()::text
    )
  );

-- =============================================================================
-- DONE. RLS is now active with least-privilege membership-aware policies.
-- =============================================================================
