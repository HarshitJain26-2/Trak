-- Migration: Add user_id to projects and update profiles + RLS policies
-- Run this in the Supabase SQL editor if you already have an existing database.

-- ─── STEP 1: Add user_id column to projects (if it doesn't exist) ───────────
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- ─── STEP 2: Update profiles table to use auth UUID as primary key ───────────
-- NOTE: If your profiles table already has rows with 'default_profile' as the id,
-- those rows will need to be re-created by each user after they log in.
-- The new profile row will be created automatically when updateProfile() is called.

-- ─── STEP 3: Drop old open-access RLS policies ───────────────────────────────
DROP POLICY IF EXISTS "Allow public access to profiles"  ON public.profiles;
DROP POLICY IF EXISTS "Allow public access to projects"  ON public.projects;
DROP POLICY IF EXISTS "Allow public access to milestones" ON public.milestones;

-- ─── STEP 4: Create per-user RLS policies for PROFILES ───────────────────────
DROP POLICY IF EXISTS "Users can view own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ─── STEP 5: Create per-user RLS policies for PROJECTS ───────────────────────
DROP POLICY IF EXISTS "Users can view own projects"   ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;

CREATE POLICY "Users can view own projects"
  ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own projects"
  ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects"
  ON public.projects FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects"
  ON public.projects FOR DELETE USING (auth.uid() = user_id);

-- ─── STEP 6: Create per-user RLS policies for MILESTONES ─────────────────────
DROP POLICY IF EXISTS "Users can view own milestones"   ON public.milestones;
DROP POLICY IF EXISTS "Users can insert own milestones" ON public.milestones;
DROP POLICY IF EXISTS "Users can update own milestones" ON public.milestones;
DROP POLICY IF EXISTS "Users can delete own milestones" ON public.milestones;

CREATE POLICY "Users can view own milestones"
  ON public.milestones FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
CREATE POLICY "Users can insert own milestones"
  ON public.milestones FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
CREATE POLICY "Users can update own milestones"
  ON public.milestones FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
CREATE POLICY "Users can delete own milestones"
  ON public.milestones FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
