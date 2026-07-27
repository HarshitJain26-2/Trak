-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY DEFAULT 'default_profile',
  name TEXT NOT NULL,
  username TEXT,
  bio TEXT,
  role TEXT,
  location TEXT,
  avatar_url TEXT,
  github_url TEXT,
  company TEXT,
  skills TEXT[] DEFAULT '{}',
  social_links JSONB DEFAULT '[]'::jsonb,
  joined_date TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS public.projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  tech_stack TEXT[] DEFAULT '{}',
  deadline TEXT,
  progress INTEGER DEFAULT 0,
  repo_url TEXT,
  priority TEXT DEFAULT 'medium',
  last_updated TEXT,
  notes TEXT DEFAULT '',
  is_completed BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. MILESTONES TABLE
CREATE TABLE IF NOT EXISTS public.milestones (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS and add public permissions for development
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access to profiles" ON public.profiles;
CREATE POLICY "Allow public access to profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access to projects" ON public.projects;
CREATE POLICY "Allow public access to projects" ON public.projects FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access to milestones" ON public.milestones;
CREATE POLICY "Allow public access to milestones" ON public.milestones FOR ALL USING (true) WITH CHECK (true);

-- SEED INITIAL PROFILE (If not exists)
INSERT INTO public.profiles (id, name, username, bio, role, location, avatar_url, github_url, company, skills, social_links, joined_date)
VALUES (
  'default_profile',
  'Harshit Jain',
  'HarshitJain26-2',
  'Full-stack developer building tools for developers. Obsessed with great DX and clean architecture.',
  'Software Engineer',
  'India',
  '',
  'github.com/HarshitJain26-2',
  '',
  ARRAY['React Native', 'TypeScript', 'Node.js', 'Expo', 'Zustand'],
  '[{"id":"gh","platform":"github","url":"github.com/HarshitJain26-2","label":"GitHub"},{"id":"em","platform":"email","url":"harshit@example.com","label":"Email"}]'::jsonb,
  'JUL 2024'
) ON CONFLICT (id) DO NOTHING;

-- SEED INITIAL PROJECTS
INSERT INTO public.projects (id, name, version, description, status, tech_stack, deadline, progress, repo_url, priority, last_updated, notes, is_completed, is_deleted)
VALUES
('1', 'Kernel v2.0', 'v1.4.2', 'System-wide performance tracking module', 'active', ARRAY['Rust', 'WASM', 'PostgreSQL'], 'OCT 24', 75, 'github.com/trak-io/kernel-v2', 'high', '2m ago', '### Changelog\n- Fixed auth bug causing 401 on valid tokens\n- Optimized database queries for large datasets\n- Updated telemetry hooks for better observability\n\n### Context\nProject transitioned to Rust for performance bottlenecks in the event loop.', false, false),
('2', 'Cloud Interface', 'v0.9.8', 'Cloud deployment management dashboard', 'warning', ARRAY['Next.js', 'Tailwind'], 'NOV 02', 50, 'github.com/trak-io/cloud-interface', 'medium', '14h ago', '### Context\nCloud interface nearing beta. AWS integration pending approval.', false, false),
('3', 'Auth Service', 'v2.1.0', 'Unified authentication and authorization service', 'blocked', ARRAY['Go', 'Redis'], 'CRITICAL', 100, 'github.com/trak-io/auth-svc', 'high', '1m ago', '### Context\nBlocked on security audit from infra team. Priority ticket raised.', false, false),
('4', 'Data Pipeline', 'v2.0-beta', 'Distributed data ingestion and transformation pipeline', 'active', ARRAY['Python', 'Kafka', 'S3'], 'DEC 12', 25, 'github.com/trak-io/data-pipeline', 'low', '2d ago', '### Context\nEarly beta. Schema validation layer in progress.', false, false),
('5', 'Legacy API v1', 'v1.0.0', 'Original REST API — fully migrated to v2', 'idle', ARRAY['Node.js', 'Express', 'MySQL'], 'DONE', 100, 'github.com/trak-io/api-v1', 'low', '3mo ago', '### Context\nFully deprecated. Replaced by Auth Service v2.', true, false)
ON CONFLICT (id) DO NOTHING;

-- SEED INITIAL MILESTONES
INSERT INTO public.milestones (id, project_id, title, completed)
VALUES
('m1', '1', 'Setup CI/CD', true),
('m2', '1', 'API Integration', true),
('m3', '1', 'Unit Tests', false),
('m4', '2', 'Design System', true),
('m5', '2', 'API Routes', false),
('m6', '3', 'OAuth2 flow', true),
('m7', '3', 'Rate limiting', true),
('m8', '3', 'Security audit', false),
('m9', '4', 'Kafka setup', true),
('m10', '4', 'S3 sink', false),
('m11', '4', 'Monitoring', false),
('m12', '5', 'Initial release', true),
('m13', '5', 'v2 migration', true),
('m14', '5', 'Deprecation notice', true)
ON CONFLICT (id) DO NOTHING;
