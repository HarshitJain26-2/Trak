-- =============================================================================
-- Trak: Authoritative Notifications & Realtime Collaboration
-- Migration: 00019_notifications.sql
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- =============================================================================

-- ─── 1. NOTIFICATIONS TABLE ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  actor_id TEXT,
  type TEXT NOT NULL, -- 'project_member_joined' | 'project_member_left' | 'project_member_removed' | 'milestone_completed' | 'system'
  project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_notifications_select" ON public.notifications;
CREATE POLICY "rls_notifications_select" ON public.notifications
  FOR SELECT USING (user_id = auth.uid()::text OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "rls_notifications_insert" ON public.notifications;
CREATE POLICY "rls_notifications_insert" ON public.notifications
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "rls_notifications_update" ON public.notifications;
CREATE POLICY "rls_notifications_update" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid()::text OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "rls_notifications_delete" ON public.notifications;
CREATE POLICY "rls_notifications_delete" ON public.notifications
  FOR DELETE USING (user_id = auth.uid()::text OR auth.uid() IS NULL);

-- ─── 2. REPLICA IDENTITY & REALTIME PUBLICATION ──────────────────────────────
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- ─── 3. AUTOMATIC MEMBER NOTIFICATION TRIGGERS ───────────────────────────────
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
BEGIN
  IF (TG_OP = 'INSERT') THEN
    -- Find owner and project name
    SELECT user_id::text, name INTO _owner_id, _project_name
    FROM public.projects
    WHERE id = NEW.project_id;

    -- Fetch actor name
    SELECT COALESCE(NULLIF(name, ''), NULLIF(username, ''), split_part(email, '@', 1), 'Teammate')
    INTO _actor_name
    FROM public.profiles
    WHERE id = NEW.user_id;

    IF _actor_name IS NULL OR _actor_name = '' THEN
      _actor_name := 'A new teammate';
    END IF;

    -- Do not notify if actor is the owner
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
    -- Find owner and project name
    SELECT user_id::text, name INTO _owner_id, _project_name
    FROM public.projects
    WHERE id = OLD.project_id;

    -- Fetch actor name
    SELECT COALESCE(NULLIF(name, ''), NULLIF(username, ''), split_part(email, '@', 1), 'Teammate')
    INTO _actor_name
    FROM public.profiles
    WHERE id = OLD.user_id;

    IF _actor_name IS NULL OR _actor_name = '' THEN
      _actor_name := 'A member';
    END IF;

    -- Determine whether removed by owner or left voluntarily
    IF auth.uid() IS NOT NULL AND auth.uid()::text = _owner_id AND _owner_id != OLD.user_id THEN
      -- Removed by owner -> notify the removed user
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
      -- Left voluntarily -> notify the owner
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
