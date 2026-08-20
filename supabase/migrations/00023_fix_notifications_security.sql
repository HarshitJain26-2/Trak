-- =============================================================================
-- Trak: Hardened Notification Security, Strict RLS & Authoritative Triggers
-- Migration: 00023_fix_notifications_security.sql
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- =============================================================================

-- ─── 1. SECURE NOTIFICATIONS TABLE RLS POLICIES ─────────────────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Revoke all permissions from anon on notifications
REVOKE ALL ON public.notifications FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;

-- Drop any legacy permissive policies
DROP POLICY IF EXISTS "rls_notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "rls_notifications_insert" ON public.notifications;
DROP POLICY IF EXISTS "rls_notifications_update" ON public.notifications;
DROP POLICY IF EXISTS "rls_notifications_delete" ON public.notifications;

-- Strict SELECT: Authenticated user can ONLY read notifications destined for them
CREATE POLICY "rls_notifications_select" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text);

-- Strict INSERT: Authenticated user can only insert notifications targeting themselves (or via SECURITY DEFINER triggers)
CREATE POLICY "rls_notifications_insert" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

-- Strict UPDATE: Authenticated user can only update their own notifications (e.g., mark as read)
CREATE POLICY "rls_notifications_update" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- Strict DELETE: Authenticated user can only delete their own notifications
CREATE POLICY "rls_notifications_delete" ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid()::text);


-- ─── 2. SECURE USER PUSH TOKENS RLS POLICIES ─────────────────────────────────
ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.user_push_tokens FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_push_tokens TO authenticated;

DROP POLICY IF EXISTS "rls_user_push_tokens_select" ON public.user_push_tokens;
DROP POLICY IF EXISTS "rls_user_push_tokens_insert" ON public.user_push_tokens;
DROP POLICY IF EXISTS "rls_user_push_tokens_update" ON public.user_push_tokens;
DROP POLICY IF EXISTS "rls_user_push_tokens_delete" ON public.user_push_tokens;

CREATE POLICY "rls_user_push_tokens_select" ON public.user_push_tokens
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text);

CREATE POLICY "rls_user_push_tokens_insert" ON public.user_push_tokens
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "rls_user_push_tokens_update" ON public.user_push_tokens
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "rls_user_push_tokens_delete" ON public.user_push_tokens
  FOR DELETE TO authenticated
  USING (user_id = auth.uid()::text);

REVOKE EXECUTE ON FUNCTION public.register_user_push_token(TEXT, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.register_user_push_token(TEXT, TEXT, TEXT) TO authenticated;


-- ─── 3. HARDENED PROJECT MEMBER NOTIFICATION TRIGGER ────────────────────────
CREATE OR REPLACE FUNCTION public.trg_notify_project_member_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner_id TEXT;
  _project_name TEXT;
  _actor_name TEXT;
  _notif_id TEXT;
  _caller_id TEXT;
BEGIN
  _caller_id := auth.uid()::text;

  IF (TG_OP = 'INSERT') THEN
    -- Find project owner and project name
    SELECT user_id::text, name INTO _owner_id, _project_name
    FROM public.projects
    WHERE id = NEW.project_id;

    -- Fetch actor (joining member) display name
    SELECT COALESCE(NULLIF(name, ''), NULLIF(username, ''), split_part(email, '@', 1), 'Teammate')
    INTO _actor_name
    FROM public.profiles
    WHERE id = NEW.user_id;

    IF _actor_name IS NULL OR _actor_name = '' THEN
      _actor_name := 'A new teammate';
    END IF;

    -- Send notification to project owner ONLY (never send self-notification to the joining user)
    IF _owner_id IS NOT NULL AND _owner_id != NEW.user_id THEN
      _notif_id := 'notif_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16);
      INSERT INTO public.notifications (id, user_id, actor_id, type, project_id, title, message, created_at)
      VALUES (
        _notif_id,
        _owner_id,
        NEW.user_id,
        'project_member_joined',
        NEW.project_id,
        'New Member Joined',
        _actor_name || ' joined "' || COALESCE(_project_name, 'your project') || '".',
        now()
      );
    END IF;

    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    -- Find project owner and project name
    SELECT user_id::text, name INTO _owner_id, _project_name
    FROM public.projects
    WHERE id = OLD.project_id;

    -- Fetch actor display name
    SELECT COALESCE(NULLIF(name, ''), NULLIF(username, ''), split_part(email, '@', 1), 'Teammate')
    INTO _actor_name
    FROM public.profiles
    WHERE id = OLD.user_id;

    IF _actor_name IS NULL OR _actor_name = '' THEN
      _actor_name := 'A member';
    END IF;

    -- Distinguish removal by owner vs voluntary departure:
    IF _caller_id IS NOT NULL AND _caller_id = _owner_id AND _owner_id != OLD.user_id THEN
      -- Case 1: Removed by owner -> notify the removed member (recipient = OLD.user_id)
      _notif_id := 'notif_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16);
      INSERT INTO public.notifications (id, user_id, actor_id, type, project_id, title, message, created_at)
      VALUES (
        _notif_id,
        OLD.user_id,
        _owner_id,
        'project_member_removed',
        OLD.project_id,
        'Removed from Project',
        'You were removed from "' || COALESCE(_project_name, 'the project') || '".',
        now()
      );
    ELSIF _owner_id IS NOT NULL AND _owner_id != OLD.user_id THEN
      -- Case 2: Member left voluntarily -> notify the owner (recipient = _owner_id)
      _notif_id := 'notif_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16);
      INSERT INTO public.notifications (id, user_id, actor_id, type, project_id, title, message, created_at)
      VALUES (
        _notif_id,
        _owner_id,
        OLD.user_id,
        'project_member_left',
        OLD.project_id,
        'Member Left',
        _actor_name || ' left "' || COALESCE(_project_name, 'your project') || '".',
        now()
      );
    END IF;

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_project_member_change ON public.project_members;
CREATE TRIGGER trg_notify_project_member_change
AFTER INSERT OR DELETE ON public.project_members
FOR EACH ROW
EXECUTE FUNCTION public.trg_notify_project_member_change();


-- ─── 4. MILESTONE COMPLETED NOTIFICATION TRIGGER ─────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_notify_milestone_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner_id TEXT;
  _project_name TEXT;
  _actor_id TEXT;
  _actor_name TEXT;
  _notif_id TEXT;
BEGIN
  -- Trigger only when milestone transition to completed = true
  IF (TG_OP = 'UPDATE' AND (OLD.completed IS NULL OR OLD.completed = false) AND NEW.completed = true) THEN
    -- Find project owner and project name
    SELECT user_id::text, name INTO _owner_id, _project_name
    FROM public.projects
    WHERE id = NEW.project_id;

    _actor_id := auth.uid()::text;

    -- Fetch actor display name if available
    IF _actor_id IS NOT NULL THEN
      SELECT COALESCE(NULLIF(name, ''), NULLIF(username, ''), split_part(email, '@', 1), 'Teammate')
      INTO _actor_name
      FROM public.profiles
      WHERE id = _actor_id;
    END IF;

    IF _actor_name IS NULL OR _actor_name = '' THEN
      _actor_name := COALESCE(NEW.completed_by, 'A collaborator');
    END IF;

    -- Notify owner only if completed by a collaborator (prevent self-notification for owner)
    IF _owner_id IS NOT NULL AND (_actor_id IS NULL OR _owner_id != _actor_id) THEN
      _notif_id := 'notif_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16);
      INSERT INTO public.notifications (id, user_id, actor_id, type, project_id, title, message, created_at)
      VALUES (
        _notif_id,
        _owner_id,
        _actor_id,
        'milestone_completed',
        NEW.project_id,
        'Milestone Completed',
        _actor_name || ' completed "' || COALESCE(NEW.title, 'a milestone') || '" in "' || COALESCE(_project_name, 'your project') || '".',
        now()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_milestone_completed ON public.milestones;
CREATE TRIGGER trg_notify_milestone_completed
AFTER UPDATE OF completed ON public.milestones
FOR EACH ROW
EXECUTE FUNCTION public.trg_notify_milestone_completed();
