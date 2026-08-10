-- =============================================================================
-- Trak: Fix Auth Signup 500 Error
-- 
-- If you're seeing a 500 "unexpected_failure" on signup, it's almost always
-- caused by a database trigger on auth.users that fails during the insert.
--
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- =============================================================================

-- ─── STEP 1: DIAGNOSTIC — List all triggers on auth.users ────────────────────
-- Run this SELECT first to see if there's a problematic trigger:
--
--   SELECT tgname, tgrelid::regclass, tgenabled
--   FROM pg_trigger
--   WHERE tgrelid = 'auth.users'::regclass;
--
-- If you see a trigger like "on_auth_user_created" that calls a function
-- like "handle_new_user()", that function is likely failing.

-- ─── STEP 2: DROP any existing broken trigger on auth.users ──────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ─── STEP 3: Relax NOT NULL on profiles.name ─────────────────────────────────
-- The profiles.name column was NOT NULL, but during signup the profile
-- may not exist yet. If a trigger tries to insert a profile with NULL name,
-- it fails. Make name optional at the DB level (the app still collects it).
ALTER TABLE public.profiles ALTER COLUMN name DROP NOT NULL;

-- ─── STEP 4: Create a SAFE handle_new_user trigger ───────────────────────────
-- This trigger auto-creates a profile row when a new auth user is created.
-- It gracefully handles missing metadata and uses COALESCE for safety.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id::text,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      ''
    ),
    COALESCE(NEW.email, '')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Never let a trigger failure block signup
    RAISE WARNING 'handle_new_user trigger failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- VERIFICATION: Try creating a test user via Dashboard → Auth → Users
-- The signup should now succeed without a 500 error.
-- =============================================================================
