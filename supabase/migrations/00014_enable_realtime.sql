-- =============================================================================
-- Trak: Enable Realtime for all collaborative tables
-- Migration 00014_enable_realtime.sql
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- =============================================================================

-- 1. Set REPLICA IDENTITY FULL so DELETE and UPDATE events contain complete row data
ALTER TABLE public.projects REPLICA IDENTITY FULL;
ALTER TABLE public.milestones REPLICA IDENTITY FULL;
ALTER TABLE public.project_members REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- 2. Add all collaborative tables to the supabase_realtime publication
DO $$
BEGIN
  -- Add projects table to realtime publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'projects'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
  END IF;

  -- Add milestones table to realtime publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'milestones'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.milestones;
  END IF;

  -- Add project_members table to realtime publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'project_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_members;
  END IF;

  -- Add profiles table to realtime publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;
