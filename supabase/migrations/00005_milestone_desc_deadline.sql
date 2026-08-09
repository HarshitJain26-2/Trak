-- =============================================================================
-- Trak: Add description & deadline to milestones table
-- Run this in the Supabase SQL Editor
-- =============================================================================

ALTER TABLE public.milestones
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS deadline TEXT;
