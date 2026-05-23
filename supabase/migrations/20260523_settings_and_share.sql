-- Settings Menu & Share Feature - Database Migration
-- Run this in your Supabase SQL Editor to enable all settings features

-- =============================================
-- 0. Trigger: auto-create profile on signup
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 1. Add share link and created_by columns to projects table
-- =============================================
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS share_token UUID,
  ADD COLUMN IF NOT EXISTS share_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS share_role TEXT DEFAULT 'viewer'
    CHECK (share_role IN ('viewer', 'editor'));

-- =============================================
-- 1b. Helper functions for RLS
-- =============================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_project_role(project_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.project_members
  WHERE project_members.project_id = $1
    AND user_id = auth.uid();
$$;

-- =============================================
-- 1c. Corrected RLS policies for project_members
-- =============================================

-- Drop old restrictive policy and replace with full-member visibility
DROP POLICY IF EXISTS "Users can view their own memberships" ON project_members;
DROP POLICY IF EXISTS "project_members_select" ON project_members;

CREATE POLICY "Members can view all members in shared projects" ON project_members
  FOR SELECT
  USING (
    get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM project_members pm2
      WHERE pm2.project_id = project_members.project_id
        AND pm2.user_id = auth.uid()
    )
  );

-- Allow owners, editors and admins to insert members
DROP POLICY IF EXISTS "project_members_insert" ON project_members;

CREATE POLICY "Owners and editors can add members" ON project_members
  FOR INSERT
  WITH CHECK (
    get_my_role() = 'admin'
    OR get_my_project_role(project_id) IN ('owner', 'editor')
  );

-- Allow owners and admins to update/delete members
DROP POLICY IF EXISTS "project_members_update" ON project_members;
DROP POLICY IF EXISTS "project_members_delete" ON project_members;

CREATE POLICY "Owners and admins can update member roles" ON project_members
  FOR UPDATE
  USING (
    get_my_role() = 'admin'
    OR get_my_project_role(project_id) = 'owner'
  );

CREATE POLICY "Owners and admins can remove members" ON project_members
  FOR DELETE
  USING (
    get_my_role() = 'admin'
    OR get_my_project_role(project_id) = 'owner'
  );

-- =============================================
-- 1d. Corrected RLS policies for projects INSERT
-- =============================================
DROP POLICY IF EXISTS "projects_insert" ON projects;

CREATE POLICY "Only users with can_create_projects can create projects" ON projects
  FOR INSERT
  WITH CHECK (
    get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND can_create_projects = true
    )
  );

-- =============================================
-- 1e. Profiles: allow reading co-members' profiles
-- =============================================
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;

CREATE POLICY "Users can read profiles of project co-members" ON profiles
  FOR SELECT
  USING (
    id = auth.uid()
    OR get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1
      FROM project_members pm1
      JOIN project_members pm2 ON pm1.project_id = pm2.project_id
      WHERE pm1.user_id = auth.uid()
        AND pm2.user_id = profiles.id
    )
  );

-- Create index for fast token lookups
CREATE INDEX IF NOT EXISTS projects_share_token_idx 
  ON projects(share_token) 
  WHERE share_token IS NOT NULL;

-- =============================================
-- 2. Create project_settings table for RSS feeds and keywords
-- =============================================
CREATE TABLE IF NOT EXISTS project_settings (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  rss_feeds JSONB DEFAULT '[]'::jsonb,
  keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on project_settings
ALTER TABLE project_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view settings for projects they're members of
CREATE POLICY "Users can view project settings" ON project_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_settings.project_id
      AND pm.user_id = auth.uid()
    )
  );

-- Policy: Only owners and editors can update settings
CREATE POLICY "Owners and editors can update settings" ON project_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_settings.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'editor')
    )
  );

-- =============================================
-- 3. Create project_invites table if it doesn't exist
-- =============================================
CREATE TABLE IF NOT EXISTS project_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor')),
  invited_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, email)
);

-- Enable RLS on project_invites
ALTER TABLE project_invites ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view invites for projects they manage
CREATE POLICY "Project managers can view invites" ON project_invites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_invites.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'editor')
    )
  );

-- Policy: Project managers can create invites
CREATE POLICY "Project managers can create invites" ON project_invites
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_invites.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'editor')
    )
  );

-- Policy: Project managers can delete invites
CREATE POLICY "Project managers can delete invites" ON project_invites
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_invites.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'editor')
    )
  );

-- =============================================
-- Done! The settings menu features are now enabled.
-- =============================================
