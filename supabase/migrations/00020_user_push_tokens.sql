-- =============================================================================
-- Trak: User Push Tokens & Expo Push Notification Infrastructure
-- Migration: 00020_user_push_tokens.sql
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- =============================================================================

-- ─── 1. USER PUSH TOKENS TABLE ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_push_tokens (
  id TEXT PRIMARY KEY DEFAULT ('ptk_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
  user_id TEXT NOT NULL,
  expo_push_token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL DEFAULT 'android', -- 'android' | 'ios' | 'web'
  device_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id ON public.user_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_token ON public.user_push_tokens(expo_push_token);

-- Enable RLS
ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_user_push_tokens_select" ON public.user_push_tokens;
CREATE POLICY "rls_user_push_tokens_select" ON public.user_push_tokens
  FOR SELECT USING (user_id = auth.uid()::text OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "rls_user_push_tokens_insert" ON public.user_push_tokens;
CREATE POLICY "rls_user_push_tokens_insert" ON public.user_push_tokens
  FOR INSERT WITH CHECK (user_id = auth.uid()::text OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "rls_user_push_tokens_update" ON public.user_push_tokens;
CREATE POLICY "rls_user_push_tokens_update" ON public.user_push_tokens
  FOR UPDATE USING (user_id = auth.uid()::text OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "rls_user_push_tokens_delete" ON public.user_push_tokens;
CREATE POLICY "rls_user_push_tokens_delete" ON public.user_push_tokens
  FOR DELETE USING (user_id = auth.uid()::text OR auth.uid() IS NULL);

-- ─── 2. UPSERT PUSH TOKEN RPC ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.register_user_push_token(
  p_token TEXT,
  p_platform TEXT DEFAULT 'android',
  p_device_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id TEXT;
  _token_id TEXT;
BEGIN
  _user_id := auth.uid()::text;
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  IF p_token IS NULL OR trim(p_token) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Empty push token');
  END IF;

  -- Upsert push token for user
  INSERT INTO public.user_push_tokens (user_id, expo_push_token, platform, device_name, updated_at)
  VALUES (_user_id, trim(p_token), p_platform, p_device_name, now())
  ON CONFLICT (expo_push_token)
  DO UPDATE SET
    user_id = EXCLUDED.user_id,
    platform = EXCLUDED.platform,
    device_name = COALESCE(EXCLUDED.device_name, public.user_push_tokens.device_name),
    updated_at = now()
  RETURNING id INTO _token_id;

  RETURN jsonb_build_object(
    'success', true,
    'id', _token_id,
    'user_id', _user_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_user_push_token(TEXT, TEXT, TEXT) TO authenticated, anon;
