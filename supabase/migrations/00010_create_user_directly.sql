-- =============================================================================
-- Trak: Direct User Creation & Password Reset (Bypasses Email Rate Limits)
-- Execute this script in your Supabase SQL Editor (Supabase Dashboard -> SQL Editor)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 1. Insert or update the user in auth.users with a confirmed email & hashed password
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'harshit.jain24@vit.edu',
  extensions.crypt('Pass1234!', extensions.gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Harshit Jain"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
)
ON CONFLICT (email) DO UPDATE SET
  encrypted_password = extensions.crypt('Pass1234!', extensions.gen_salt('bf')),
  email_confirmed_at = COALESCE(auth.users.email_confirmed_at, now()),
  updated_at = now();

-- 2. Ensure profile exists in public.profiles
INSERT INTO public.profiles (id, name, email, username)
SELECT 
  id::text,
  'Harshit Jain',
  'harshit.jain24@vit.edu',
  'harshit_jain24'
FROM auth.users 
WHERE email = 'harshit.jain24@vit.edu'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email;

-- =============================================================================
-- Verification Output
-- =============================================================================
SELECT id, email, email_confirmed_at, created_at FROM auth.users WHERE email = 'harshit.jain24@vit.edu';
