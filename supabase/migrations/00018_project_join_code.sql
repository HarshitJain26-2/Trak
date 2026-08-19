-- =============================================================================
-- Trak: Project Join via Unique Code + QR Code
-- Migration: 00018_project_join_code.sql
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- =============================================================================

-- ─── 1. ADD JOIN_CODE COLUMN & UNIQUE CONSTRAINT ─────────────────────────────
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS join_code TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projects_join_code_key'
  ) THEN
    ALTER TABLE public.projects ADD CONSTRAINT projects_join_code_key UNIQUE (join_code);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_projects_join_code ON public.projects (join_code);

-- ─── 2. CRYPTOGRAPHIC JOIN CODE GENERATOR ────────────────────────────────────
-- Format: TRK-XXXXXX (Charset: ABCDEFGHJKLMNPQRSTUVWXYZ23456789 - no 0, O, 1, I)
CREATE OR REPLACE FUNCTION public.generate_unique_join_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  _chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  _code TEXT;
  _exists BOOLEAN;
  _bytes BYTEA;
  _i INT;
  _idx INT;
BEGIN
  LOOP
    _code := 'TRK-';
    _bytes := gen_random_bytes(6);
    FOR _i IN 0..5 LOOP
      _idx := (get_byte(_bytes, _i) % length(_chars)) + 1;
      _code := _code || substr(_chars, _idx, 1);
    END LOOP;
    
    SELECT EXISTS (SELECT 1 FROM public.projects WHERE join_code = _code) INTO _exists;
    IF NOT _exists THEN
      RETURN _code;
    END IF;
  END LOOP;
END;
$$;

-- ─── 3. BACKFILL JOIN_CODE FOR ALL EXISTING PROJECTS ─────────────────────────
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.projects WHERE join_code IS NULL OR join_code = '' LOOP
    UPDATE public.projects
    SET join_code = public.generate_unique_join_code()
    WHERE id = r.id;
  END LOOP;
END $$;

-- ─── 4. AUTOMATIC JOIN CODE TRIGGER FOR NEW PROJECTS ─────────────────────────
CREATE OR REPLACE FUNCTION public.trg_set_project_join_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.join_code IS NULL OR NEW.join_code = '' THEN
    NEW.join_code := public.generate_unique_join_code();
  ELSE
    NEW.join_code := UPPER(TRIM(NEW.join_code));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_project_join_code ON public.projects;
CREATE TRIGGER trg_set_project_join_code
BEFORE INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.trg_set_project_join_code();

-- ─── 5. SECURE JOIN PROJECT RPC (auth.uid() strictly derived) ────────────────
CREATE OR REPLACE FUNCTION public.join_project_by_code(code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _project_id TEXT;
  _project_name TEXT;
  _owner_id UUID;
  _clean_code TEXT;
  _is_member BOOLEAN;
  _member_id TEXT;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required to join project.');
  END IF;

  _clean_code := UPPER(TRIM(code));

  -- Server-side validation of format TRK-XXXXXX
  IF _clean_code !~ '^TRK-[A-Z0-9]{6}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Enter a valid Trak project code (e.g. TRK-XXXXXX).');
  END IF;

  -- Lookup project by join_code
  SELECT id, name, user_id INTO _project_id, _project_name, _owner_id
  FROM public.projects
  WHERE join_code = _clean_code
    AND is_deleted = false
  LIMIT 1;

  IF _project_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active project found matching this code.');
  END IF;

  -- Check if user is already the owner
  IF _owner_id = _user_id THEN
    RETURN jsonb_build_object(
      'success', true,
      'status', 'already_owner',
      'project_id', _project_id,
      'project_name', _project_name,
      'message', 'You are already the owner of this project.'
    );
  END IF;

  -- Check if user is already a member
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = _project_id AND user_id = _user_id
  ) INTO _is_member;

  IF _is_member THEN
    RETURN jsonb_build_object(
      'success', true,
      'status', 'already_member',
      'project_id', _project_id,
      'project_name', _project_name,
      'message', 'You are already a member of this project.'
    );
  END IF;

  -- Insert member row with default 'member' role (client cannot escalate role)
  _member_id := 'pm_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16);
  INSERT INTO public.project_members (id, project_id, user_id, role, joined_at)
  VALUES (_member_id, _project_id, _user_id, 'member', now())
  ON CONFLICT (project_id, user_id) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'joined',
    'project_id', _project_id,
    'project_name', _project_name,
    'message', 'Successfully joined project!'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_project_by_code(TEXT) TO authenticated;

-- ─── 6. SECURE REGENERATE JOIN CODE RPC (Owner only, auth.uid() strictly derived)
CREATE OR REPLACE FUNCTION public.regenerate_project_join_code(p_project_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _owner_id UUID;
  _new_code TEXT;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required.');
  END IF;

  -- Verify project exists and caller is owner
  SELECT user_id INTO _owner_id
  FROM public.projects
  WHERE id = p_project_id AND is_deleted = false
  LIMIT 1;

  IF _owner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Project not found.');
  END IF;

  IF _owner_id != _user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the project owner can regenerate the join code.');
  END IF;

  -- Generate new unique code
  _new_code := public.generate_unique_join_code();

  UPDATE public.projects
  SET join_code = _new_code,
      last_updated = to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  WHERE id = p_project_id;

  RETURN jsonb_build_object(
    'success', true,
    'join_code', _new_code
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.regenerate_project_join_code(TEXT) TO authenticated;
