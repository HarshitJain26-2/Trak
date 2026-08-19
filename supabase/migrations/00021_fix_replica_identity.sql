-- =============================================================================
-- Trak: Ensure Full Payload on Realtime DELETE
-- Migration: 00021_fix_replica_identity.sql
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- =============================================================================

ALTER TABLE IF EXISTS public.project_members REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.projects REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.notifications REPLICA IDENTITY FULL;
