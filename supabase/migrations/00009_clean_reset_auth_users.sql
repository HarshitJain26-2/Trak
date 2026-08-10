-- =============================================================================
-- Trak: Complete & Clean Auth Database Reset
-- Run this in your Supabase SQL Editor (Supabase Dashboard -> SQL Editor)
--
-- This script completely wipes all orphan auth identities, sessions, and public
-- tables, resolving the "Signup says Email Exists, Signin says Invalid Credentials" bug.
-- =============================================================================

SET session_replication_role = 'replica';

-- 1. Truncate all public application tables
TRUNCATE TABLE public.milestones CASCADE;
TRUNCATE TABLE public.project_members CASCADE;
TRUNCATE TABLE public.projects CASCADE;
TRUNCATE TABLE public.profiles CASCADE;

-- 2. Delete from all auth schema tables (cleans orphan identities & refresh tokens)
DELETE FROM auth.refresh_tokens;
DELETE FROM auth.sessions;
DELETE FROM auth.mfa_factors;
DELETE FROM auth.mfa_amr_claims;
DELETE FROM auth.mfa_challenges;
DELETE FROM auth.identities;
DELETE FROM auth.users;

SET session_replication_role = 'origin';

-- =============================================================================
-- Verification Query (Should return 0 for all counts)
-- =============================================================================
SELECT 
  (SELECT COUNT(*) FROM auth.users) AS auth_users_count,
  (SELECT COUNT(*) FROM auth.identities) AS auth_identities_count,
  (SELECT COUNT(*) FROM public.profiles) AS profiles_count,
  (SELECT COUNT(*) FROM public.projects) AS projects_count;
