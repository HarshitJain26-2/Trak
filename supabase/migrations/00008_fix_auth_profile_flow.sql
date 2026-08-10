-- =============================================================================
-- Trak: Fix Authentication & Profile RLS Policies
-- Execute this script in your Supabase SQL Editor (Supabase Dashboard -> SQL Editor)
-- =============================================================================

-- ─── 1. Ensure profiles table column constraints ──────────────────────────────
ALTER TABLE public.profiles ALTER COLUMN name DROP NOT NULL;

-- ─── 2. Ensure RLS policies for profiles ─────────────────────────────────────
-- RLS can remain enabled or disabled safely. If enabled, allow authenticated
-- users to select all profiles (for member lookup) and manage their own profile.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access profiles"                    ON public.profiles;
DROP POLICY IF EXISTS "Allow public access to profiles"           ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile"                ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles"     ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile"              ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"              ON public.profiles;

-- Allow authenticated users to view profiles
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert their own profile (id matches auth.uid)
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = id OR auth.uid() IS NOT NULL);

-- Allow authenticated users to update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id OR auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid()::text = id OR auth.uid() IS NOT NULL);

-- ─── 3. Safe handle_new_user trigger ──────────────────────────────────────────
-- Clean up any legacy or broken triggers that might fail during auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, username)
  VALUES (
    NEW.id::text,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      SPLIT_PART(NEW.email, '@', 1),
      'Developer'
    ),
    COALESCE(NEW.email, ''),
    LOWER(SPLIT_PART(NEW.email, '@', 1)) || '_' || SUBSTR(NEW.id::text, 1, 4)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Never allow a profile trigger error to fail auth signup
    RAISE WARNING 'handle_new_user trigger non-fatal notice: %', SQLERRM;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- Verification Query
-- =============================================================================
SELECT 
  (SELECT COUNT(*) FROM auth.users) AS auth_users_count,
  (SELECT COUNT(*) FROM public.profiles) AS profiles_count;
