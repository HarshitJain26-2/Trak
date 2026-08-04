-- Migration: Push Tokens Table with explicit RLS Policies for Trak

CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL UNIQUE,
  device_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(token);

-- Enable Row Level Security (RLS)
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Users can select own push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can insert own push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can update own push tokens" ON push_tokens;

-- Explicit RLS Policies
-- 1. SELECT: Users can only read their own tokens
CREATE POLICY "Users can select own push tokens" ON push_tokens
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. INSERT: Users can only insert tokens for their user_id
CREATE POLICY "Users can insert own push tokens" ON push_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE: Users can only update their own tokens
CREATE POLICY "Users can update own push tokens" ON push_tokens
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Note: No DELETE policy is provided for regular users.
-- Stale/unregistered token deletion occurs exclusively server-side using the Supabase Service Role Key.
