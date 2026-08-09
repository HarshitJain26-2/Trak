-- =============================================================================
-- Trak: Delete All Users & Reset Workspace Data
-- Execute this script in your Supabase SQL Editor (Supabase Dashboard -> SQL Editor)
-- =============================================================================

-- Disable triggers temporarily for clean cascade deletion
SET session_replication_role = 'replica';

-- 1. Truncate all public application tables
TRUNCATE TABLE public.milestones CASCADE;
TRUNCATE TABLE public.project_members CASCADE;
TRUNCATE TABLE public.projects CASCADE;
TRUNCATE TABLE public.profiles CASCADE;

-- 2. Delete all authenticated user accounts from Supabase Auth
DELETE FROM auth.users;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- =============================================================================
-- Verification Query (Should return 0 for all tables)
-- =============================================================================
SELECT 
  (SELECT COUNT(*) FROM auth.users) AS auth_users_count,
  (SELECT COUNT(*) FROM public.profiles) AS profiles_count,
  (SELECT COUNT(*) FROM public.projects) AS projects_count,
  (SELECT COUNT(*) FROM public.milestones) AS milestones_count,
  (SELECT COUNT(*) FROM public.project_members) AS members_count;
