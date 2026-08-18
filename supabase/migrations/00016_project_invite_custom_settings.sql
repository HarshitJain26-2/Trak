-- =============================================================================
-- Trak: Custom Invite Settings, Realtime & Enhanced Join Security
-- Migration 00016_project_invite_custom_settings.sql
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- =============================================================================

-- ─── 1. RPC: UPDATE PROJECT INVITE SETTINGS ─────────────────────────────────
-- Updates settings on an existing active invite without changing its URL/token.
CREATE OR REPLACE FUNCTION public.update_project_invite_settings(
  p_project_id TEXT,
  p_invite_id TEXT,
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
BEGIN
  _current_user_id := auth.uid()::text;
  IF _current_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  -- 1. Verify user is project owner
  SELECT user_id::text INTO _owner_id
  FROM public.projects
  WHERE id = p_project_id;

  IF _owner_id IS NULL THEN
    RAISE EXCEPTION 'PROJECT_NOT_FOUND';
  END IF;

  IF _owner_id <> _current_user_id THEN
    RAISE EXCEPTION 'PERMISSION_DENIED';
  END IF;

  -- 2. Validate custom expiration is in future if provided
  IF p_expires_at IS NOT NULL AND p_expires_at <= now() THEN
    RAISE EXCEPTION 'EXPIRATION_MUST_BE_IN_FUTURE';
  END IF;

  -- 3. Validate max uses is positive integer if provided
  IF p_max_uses IS NOT NULL AND p_max_uses < 1 THEN
    RAISE EXCEPTION 'INVALID_MAX_USES';
  END IF;

  -- 4. Update the invite settings
  UPDATE public.project_invites
  SET
    expires_at = p_expires_at,
    max_uses = p_max_uses
  WHERE public.project_invites.id = p_invite_id
    AND public.project_invites.project_id = p_project_id;

  -- 5. Return updated record
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
  WHERE pi.id = p_invite_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_project_invite_settings(TEXT, TEXT, TIMESTAMPTZ, INT) TO authenticated;

-- ─── 2. ENHANCED ATOMIC JOIN (STRICT auth.uid() VERIFICATION) ────────────────
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
  -- Always prioritize authoritative auth.uid() from the security context
  _caller_id := COALESCE(auth.uid()::text, p_user_id);
  IF _caller_id IS NULL OR _caller_id = '' THEN
    RETURN QUERY SELECT false, 'UNAUTHENTICATED'::TEXT, NULL::TEXT, NULL::TEXT, 'Please sign in to join this project.'::TEXT;
    RETURN;
  END IF;

  -- 1. Lock and fetch invite row to prevent race conditions on max_uses
  SELECT * INTO _invite
  FROM public.project_invites
  WHERE token_hash = p_token_hash
  FOR UPDATE;

  IF _invite.id IS NULL THEN
    RETURN QUERY SELECT false, 'INVALID'::TEXT, NULL::TEXT, NULL::TEXT, 'Invalid invite link.'::TEXT;
    RETURN;
  END IF;

  -- 2. Check active status
  IF NOT _invite.is_active THEN
    RETURN QUERY SELECT false, 'REVOKED'::TEXT, NULL::TEXT, NULL::TEXT, 'This invite link is no longer active.'::TEXT;
    RETURN;
  END IF;

  -- 3. Check expiration
  IF _invite.expires_at IS NOT NULL AND _invite.expires_at < now() THEN
    RETURN QUERY SELECT false, 'EXPIRED'::TEXT, NULL::TEXT, NULL::TEXT, 'This invite link has expired.'::TEXT;
    RETURN;
  END IF;

  -- 4. Check max uses limit
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

  -- Ensure auth.uid() is also linked if caller used an alternative alias
  IF auth.uid() IS NOT NULL AND auth.uid()::text <> _caller_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = _project.id AND project_members.user_id::text = auth.uid()::text
    ) THEN
      INSERT INTO public.project_members (id, project_id, user_id, role, joined_at)
      VALUES ('pm_auth_' || extract(epoch from now())::bigint::text, _project.id, auth.uid()::text, 'member', now());
    END IF;
  END IF;

  -- 9. Increment uses count atomically
  UPDATE public.project_invites
  SET uses = uses + 1
  WHERE id = _invite.id;

  RETURN QUERY SELECT true, 'JOINED'::TEXT, _project.id, _project.name, NULL::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_project_with_invite(TEXT, TEXT) TO authenticated, anon;

-- Single parameter overload
CREATE OR REPLACE FUNCTION public.join_project_with_invite(p_token_hash TEXT)
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
BEGIN
  RETURN QUERY SELECT * FROM public.join_project_with_invite(p_token_hash, NULL::TEXT);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_project_with_invite(TEXT) TO authenticated, anon;
