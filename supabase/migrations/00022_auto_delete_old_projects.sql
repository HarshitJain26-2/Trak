-- =============================================================================
-- Trak: 15-Day Auto Delete Trash Purge & deleted_at Column
-- Migration: 00022_auto_delete_old_projects.sql
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- =============================================================================

ALTER TABLE IF EXISTS public.projects 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Backfill deleted_at for existing deleted projects
UPDATE public.projects
SET deleted_at = NOW()
WHERE is_deleted = TRUE AND deleted_at IS NULL;

-- Automatically purge any projects deleted more than 15 days ago
DELETE FROM public.projects
WHERE is_deleted = TRUE 
  AND deleted_at IS NOT NULL 
  AND deleted_at < (NOW() - INTERVAL '15 days');
