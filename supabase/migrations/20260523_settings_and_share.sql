-- Settings Menu & Share Feature - Database Migration
-- Run this in your Supabase SQL Editor to enable all settings features

-- =============================================
-- 1. Add share link columns to projects table
-- =============================================
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS share_token UUID,
  ADD COLUMN IF NOT EXISTS share_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS share_role TEXT DEFAULT 'viewer'
    CHECK (share_role IN ('viewer', 'editor'));

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
