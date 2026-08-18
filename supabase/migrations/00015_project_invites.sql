-- =============================================================================
-- Trak: Secure Project Sharing via Invite Link
-- Migration 00015_project_invites.sql
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- =============================================================================

-- Enable pgcrypto extension for secure SHA-256 hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── 1. CREATE PROJECT_INVITES TABLE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_invites (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  uses INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 2. INDEXES FOR FAST LOOKUP ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_project_invites_token_hash ON public.project_invites(token_hash);
CREATE INDEX IF NOT EXISTS idx_project_invites_project_id ON public.project_invites(project_id);
CREATE INDEX IF NOT EXISTS idx_project_invites_is_active ON public.project_invites(is_active);

-- ─── 3. ROW LEVEL SECURITY ───────────────────────────────────────────────────
ALTER TABLE public.project_invites ENABLE ROW LEVEL SECURITY;

-- Allow project owners to view invites for their projects
DROP POLICY IF EXISTS "rls_project_invites_owner_select" ON public.project_invites;
CREATE POLICY "rls_project_invites_owner_select"
  ON public.project_invites FOR SELECT
  USING (
    created_by = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_invites.project_id
        AND (p.user_id = auth.uid()::text OR p.user_id::text = auth.uid()::text)
    )
  );

-- Allow project owners to insert invites for their projects
DROP POLICY IF EXISTS "rls_project_invites_owner_insert" ON public.project_invites;
CREATE POLICY "rls_project_invites_owner_insert"
  ON public.project_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_invites.project_id
        AND (p.user_id = auth.uid()::text OR p.user_id::text = auth.uid()::text)
    )
  );

-- Allow project owners to update invites (e.g. revoke)
DROP POLICY IF EXISTS "rls_project_invites_owner_update" ON public.project_invites;
CREATE POLICY "rls_project_invites_owner_update"
  ON public.project_invites FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_invites.project_id
        AND (p.user_id = auth.uid()::text OR p.user_id::text = auth.uid()::text)
    )
  );

-- Allow project owners to delete invites
DROP POLICY IF EXISTS "rls_project_invites_owner_delete" ON public.project_invites;
CREATE POLICY "rls_project_invites_owner_delete"
  ON public.project_invites FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_invites.project_id
        AND (p.user_id = auth.uid()::text OR p.user_id::text = auth.uid()::text)
    )
  );

-- ─── 4. RPC: CREATE OR REGENERATE PROJECT INVITE ─────────────────────────────
CREATE OR REPLACE FUNCTION public.create_project_invite(
  p_project_id TEXT,
  p_token_hash TEXT,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_max_uses INT DEFAULT NULL
)
RETURNS TABLE (
  id TEXT,
  project_id TEXT,
  created_by TEXT,
  expires_at TIMESTAMPTZ,
  max_uses INT,
  uses INT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner_id TEXT;
  _current_user_id TEXT;
  _invite_id TEXT;
BEGIN
  _current_user_id := auth.uid()::text;
  IF _current_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  -- Verify user is owner of the project
  SELECT user_id::text INTO _owner_id
  FROM public.projects
  WHERE id = p_project_id;

  IF _owner_id IS NULL THEN
    RAISE EXCEPTION 'PROJECT_NOT_FOUND';
  END IF;

  IF _owner_id <> _current_user_id THEN
    RAISE EXCEPTION 'PERMISSION_DENIED';
  END IF;

  -- Deactivate previous active invites for this project
  UPDATE public.project_invites
  SET is_active = false
  WHERE public.project_invites.project_id = p_project_id
    AND public.project_invites.is_active = true;

  -- Create new invite record
  _invite_id := 'inv_' || extract(epoch from now())::bigint::text || '_' || substr(md5(random()::text), 1, 6);

  INSERT INTO public.project_invites (
    id,
    project_id,
    created_by,
    token_hash,
    expires_at,
    max_uses,
    uses,
    is_active,
    created_at
  ) VALUES (
    _invite_id,
    p_project_id,
    _current_user_id,
    p_token_hash,
    p_expires_at,
    p_max_uses,
    0,
    true,
    now()
  );

  RETURN QUERY
  SELECT
    pi.id,
    pi.project_id,
    pi.created_by,
    pi.expires_at,
    pi.max_uses,
    pi.uses,
    pi.is_active,
    pi.created_at
  FROM public.project_invites pi
  WHERE pi.id = _invite_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_project_invite(TEXT, TEXT, TIMESTAMPTZ, INT) TO authenticated;

-- ─── 5. RPC: REVOKE PROJECT INVITE ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.revoke_project_invite(
  p_project_id TEXT,
  p_invite_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner_id TEXT;
  _current_user_id TEXT;
BEGIN
  _current_user_id := auth.uid()::text;
  IF _current_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  SELECT user_id::text INTO _owner_id
  FROM public.projects
  WHERE id = p_project_id;

  IF _owner_id IS NULL THEN
    RAISE EXCEPTION 'PROJECT_NOT_FOUND';
  END IF;

  IF _owner_id <> _current_user_id THEN
    RAISE EXCEPTION 'PERMISSION_DENIED';
  END IF;

  IF p_invite_id IS NOT NULL THEN
    UPDATE public.project_invites
    SET is_active = false
    WHERE id = p_invite_id AND project_id = p_project_id;
  ELSE
    UPDATE public.project_invites
    SET is_active = false
    WHERE project_id = p_project_id AND is_active = true;
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_project_invite(TEXT, TEXT) TO authenticated;

-- ─── 6. RPC: GET ACTIVE PROJECT INVITE ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_project_active_invite(p_project_id TEXT)
RETURNS TABLE (
  id TEXT,
  project_id TEXT,
  created_by TEXT,
  expires_at TIMESTAMPTZ,
  max_uses INT,
  uses INT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner_id TEXT;
  _current_user_id TEXT;
BEGIN
  _current_user_id := auth.uid()::text;
  IF _current_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  SELECT user_id::text INTO _owner_id
  FROM public.projects
  WHERE id = p_project_id;

  IF _owner_id IS NULL THEN
    RAISE EXCEPTION 'PROJECT_NOT_FOUND';
  END IF;

  IF _owner_id <> _current_user_id THEN
    RAISE EXCEPTION 'PERMISSION_DENIED';
  END IF;

  RETURN QUERY
  SELECT
    pi.id,
    pi.project_id,
    pi.created_by,
    pi.expires_at,
    pi.max_uses,
    pi.uses,
    pi.is_active,
    pi.created_at
  FROM public.project_invites pi
  WHERE pi.project_id = p_project_id
    AND pi.is_active = true
    AND (pi.expires_at IS NULL OR pi.expires_at > now())
    AND (pi.max_uses IS NULL OR pi.uses < pi.max_uses)
  ORDER BY pi.created_at DESC
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_project_active_invite(TEXT) TO authenticated;

-- ─── 7. RPC: VALIDATE INVITE TOKEN ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.validate_project_invite(p_token_hash TEXT)
RETURNS TABLE (
  valid BOOLEAN,
  status TEXT,
  project_id TEXT,
  project_name TEXT,
  project_description TEXT,
  owner_name TEXT,
  expires_at TIMESTAMPTZ,
  max_uses INT,
  uses INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite RECORD;
  _project RECORD;
  _owner_name TEXT;
  _caller_id TEXT;
BEGIN
  _caller_id := auth.uid()::text;

  -- 1. Find invite by token hash
  SELECT * INTO _invite
  FROM public.project_invites
  WHERE token_hash = p_token_hash
  LIMIT 1;

  IF _invite.id IS NULL THEN
    RETURN QUERY SELECT false, 'INVALID'::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ, NULL::INT, NULL::INT;
    RETURN;
  END IF;

  -- 2. Fetch project info
  SELECT id, name, description, user_id INTO _project
  FROM public.projects
  WHERE id = _invite.project_id AND is_deleted = false;

  IF _project.id IS NULL THEN
    RETURN QUERY SELECT false, 'PROJECT_NOT_FOUND'::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ, NULL::INT, NULL::INT;
    RETURN;
  END IF;

  -- 3. Resolve owner display name
  SELECT COALESCE(NULLIF(TRIM(pr.name), ''), NULLIF(TRIM(pr.username), ''), SPLIT_PART(pr.email, '@', 1), 'Team Leader')
  INTO _owner_name
  FROM public.profiles pr
  WHERE pr.id = _project.user_id::text;

  _owner_name := COALESCE(_owner_name, 'Team Leader');

  -- 4. Check active status
  IF NOT _invite.is_active THEN
    RETURN QUERY SELECT false, 'REVOKED'::TEXT, _project.id, _project.name, _project.description, _owner_name, _invite.expires_at, _invite.max_uses, _invite.uses;
    RETURN;
  END IF;

  -- 5. Check expiration
  IF _invite.expires_at IS NOT NULL AND _invite.expires_at < now() THEN
    RETURN QUERY SELECT false, 'EXPIRED'::TEXT, _project.id, _project.name, _project.description, _owner_name, _invite.expires_at, _invite.max_uses, _invite.uses;
    RETURN;
  END IF;

  -- 6. Check max uses
  IF _invite.max_uses IS NOT NULL AND _invite.uses >= _invite.max_uses THEN
    RETURN QUERY SELECT false, 'MAX_USES_REACHED'::TEXT, _project.id, _project.name, _project.description, _owner_name, _invite.expires_at, _invite.max_uses, _invite.uses;
    RETURN;
  END IF;

  -- 7. Check caller status if logged in
  IF _caller_id IS NOT NULL THEN
    IF _project.user_id::text = _caller_id THEN
      RETURN QUERY SELECT true, 'ALREADY_OWNER'::TEXT, _project.id, _project.name, _project.description, _owner_name, _invite.expires_at, _invite.max_uses, _invite.uses;
      RETURN;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = _project.id
        AND project_members.user_id::text = _caller_id
    ) THEN
      RETURN QUERY SELECT true, 'ALREADY_MEMBER'::TEXT, _project.id, _project.name, _project.description, _owner_name, _invite.expires_at, _invite.max_uses, _invite.uses;
      RETURN;
    END IF;
  END IF;

  -- 8. Valid invite
  RETURN QUERY SELECT true, 'VALID'::TEXT, _project.id, _project.name, _project.description, _owner_name, _invite.expires_at, _invite.max_uses, _invite.uses;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_project_invite(TEXT) TO authenticated, anon;

-- ─── 8. RPC: ATOMIC JOIN PROJECT WITH INVITE TOKEN ───────────────────────────
CREATE OR REPLACE FUNCTION public.join_project_with_invite(
  p_token_hash TEXT,
  p_user_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  status TEXT,
  project_id TEXT,
  project_name TEXT,
  error TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_id TEXT;
  _invite RECORD;
  _project RECORD;
  _member_id TEXT;
BEGIN
  _caller_id := COALESCE(p_user_id, auth.uid()::text);
  IF _caller_id IS NULL OR _caller_id = '' THEN
    RETURN QUERY SELECT false, 'UNAUTHENTICATED'::TEXT, NULL::TEXT, NULL::TEXT, 'Please sign in to join this project.'::TEXT;
    RETURN;
  END IF;

  -- 1. Lock and fetch invite row to avoid race conditions
  SELECT * INTO _invite
  FROM public.project_invites
  WHERE token_hash = p_token_hash
  FOR UPDATE;

  IF _invite.id IS NULL THEN
    RETURN QUERY SELECT false, 'INVALID'::TEXT, NULL::TEXT, NULL::TEXT, 'Invalid invite link.'::TEXT;
    RETURN;
  END IF;

  -- 2. Check active
  IF NOT _invite.is_active THEN
    RETURN QUERY SELECT false, 'REVOKED'::TEXT, NULL::TEXT, NULL::TEXT, 'This invite link is no longer active.'::TEXT;
    RETURN;
  END IF;

  -- 3. Check expiration
  IF _invite.expires_at IS NOT NULL AND _invite.expires_at < now() THEN
    RETURN QUERY SELECT false, 'EXPIRED'::TEXT, NULL::TEXT, NULL::TEXT, 'This invite link has expired.'::TEXT;
    RETURN;
  END IF;

  -- 4. Check max uses
  IF _invite.max_uses IS NOT NULL AND _invite.uses >= _invite.max_uses THEN
    RETURN QUERY SELECT false, 'MAX_USES_REACHED'::TEXT, NULL::TEXT, NULL::TEXT, 'This invite link has reached its usage limit.'::TEXT;
    RETURN;
  END IF;

  -- 5. Fetch project
  SELECT id, name, user_id INTO _project
  FROM public.projects
  WHERE id = _invite.project_id AND is_deleted = false;

  IF _project.id IS NULL THEN
    RETURN QUERY SELECT false, 'PROJECT_NOT_FOUND'::TEXT, NULL::TEXT, NULL::TEXT, 'Project not found or has been deleted.'::TEXT;
    RETURN;
  END IF;

  -- 6. Check if caller is project owner
  IF _project.user_id::text = _caller_id OR (auth.uid() IS NOT NULL AND _project.user_id::text = auth.uid()::text) THEN
    RETURN QUERY SELECT true, 'ALREADY_OWNER'::TEXT, _project.id, _project.name, NULL::TEXT;
    RETURN;
  END IF;

  -- 7. Check if caller is already a member
  IF EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = _project.id
      AND (project_members.user_id::text = _caller_id OR (auth.uid() IS NOT NULL AND project_members.user_id::text = auth.uid()::text))
  ) THEN
    RETURN QUERY SELECT true, 'ALREADY_MEMBER'::TEXT, _project.id, _project.name, NULL::TEXT;
    RETURN;
  END IF;

  -- 8. Atomic insert into project_members
  _member_id := 'pm_' || extract(epoch from now())::bigint::text || '_' || substr(md5(random()::text), 1, 6);
  INSERT INTO public.project_members (id, project_id, user_id, role, joined_at)
  VALUES (_member_id, _project.id, _caller_id, 'member', now());

  -- Ensure auth.uid() also linked if different string representation
  IF auth.uid() IS NOT NULL AND auth.uid()::text <> _caller_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = _project.id AND project_members.user_id::text = auth.uid()::text
    ) THEN
      INSERT INTO public.project_members (id, project_id, user_id, role, joined_at)
      VALUES ('pm_auth_' || extract(epoch from now())::bigint::text, _project.id, auth.uid()::text, 'member', now());
    END IF;
  END IF;

  -- 9. Increment uses count
  UPDATE public.project_invites
  SET uses = uses + 1
  WHERE id = _invite.id;

  RETURN QUERY SELECT true, 'JOINED'::TEXT, _project.id, _project.name, NULL::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_project_with_invite(TEXT, TEXT) TO authenticated, anon;

-- ─── 9. REALTIME CONFIGURATION ───────────────────────────────────────────────
ALTER TABLE public.project_invites REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'project_invites'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_invites;
  END IF;
END;
$$;
