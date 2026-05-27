'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ============ PROFILE ACTIONS ============

export async function updateProfile(fullName: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', user.id)

  if (error) throw error

  revalidatePath('/projects')
  return { success: true }
}

export async function requestPasswordReset() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) throw new Error('Not authenticated')

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!siteUrl && process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_SITE_URL is not set')
  }
  const baseUrl = siteUrl || 'http://localhost:3000'

  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${baseUrl}/auth/reset-password`,
  })

  if (error) throw error

  return { success: true, email: user.email }
}

export async function getProfile() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) return null

  return { ...profile, email: user.email }
}

// ============ PROJECT ACTIONS ============

export async function updateProject(
  projectId: string,
  data: { name?: string; description?: string }
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Verify user has permission (owner or admin)
  const { data: membership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'editor'].includes(membership.role)) {
    throw new Error('Not authorized')
  }

  const { error } = await supabase
    .from('projects')
    .update(data)
    .eq('id', projectId)

  if (error) throw error

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function deleteProject(projectId: string, confirmName: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Verify project exists and user is owner
  const { data: project } = await supabase
    .from('projects')
    .select('name, created_by')
    .eq('id', projectId)
    .single()

  if (!project) throw new Error('Project not found')
  if (project.created_by !== user.id) throw new Error('Only the project owner can delete it')
  if (project.name !== confirmName) throw new Error('Project name does not match')

  const { error } = await supabase.from('projects').delete().eq('id', projectId)

  if (error) throw error

  revalidatePath('/projects')
  return { success: true }
}

export async function deleteArticulo(id: string, projectId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('articulos_prensa')
    .delete()
    .eq('id', id)
    .eq('project_id', projectId) // belt-and-suspenders; RLS also enforces this

  if (error) throw new Error(error.message)

  revalidatePath(`/projects/${projectId}`)
}

export async function getProject(projectId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('projects')
    .select('id, name, description, created_by, share_token, share_enabled, share_role, created_at')
    .eq('id', projectId)
    .single()

  if (error) return null
  return data
}

export async function getUserRoleInProject(projectId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: membership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()

  return membership?.role ?? null
}

// ============ PROJECT MEMBERS ACTIONS ============

export async function updateMemberRole(
  projectId: string,
  memberId: string,
  newRole: 'editor' | 'viewer'
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Check current user has permission
  const { data: currentMembership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!currentMembership || !['owner', 'editor'].includes(currentMembership.role)) {
    throw new Error('Not authorized')
  }

  // Update the member's role
  const { error } = await supabase
    .from('project_members')
    .update({ role: newRole })
    .eq('id', memberId)

  if (error) throw error

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function removeMember(projectId: string, memberId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Check current user has permission
  const { data: currentMembership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!currentMembership || !['owner', 'editor'].includes(currentMembership.role)) {
    throw new Error('Not authorized')
  }

  // Don't allow removing the owner
  const { data: targetMember } = await supabase
    .from('project_members')
    .select('role')
    .eq('id', memberId)
    .single()

  if (targetMember?.role === 'owner') {
    throw new Error('Cannot remove the project owner')
  }

  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('id', memberId)

  if (error) throw error

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

// ============ SHARE LINK ACTIONS ============

export async function enableShareLink(projectId: string, role: 'viewer' | 'editor' = 'viewer') {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Check permission
  const { data: membership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'editor'].includes(membership.role)) {
    throw new Error('Not authorized')
  }

  const { data, error } = await supabase
    .from('projects')
    .update({
      share_enabled: true,
      share_role: role,
      share_token: crypto.randomUUID(),
    })
    .eq('id', projectId)
    .select('share_token')
    .single()

  if (error) throw error

  return { success: true, shareToken: data.share_token }
}

export async function disableShareLink(projectId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Verify caller has permission (owner or editor)
  const { data: membership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'editor', 'admin'].includes(membership.role)) {
    throw new Error('Not authorized')
  }

  const { error } = await supabase
    .from('projects')
    .update({
      share_enabled: false,
      share_token: null,
    })
    .eq('id', projectId)

  if (error) throw error

  return { success: true }
}

export async function updateShareRole(projectId: string, role: 'viewer' | 'editor') {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Verify caller has permission (owner or editor)
  const { data: membership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'editor', 'admin'].includes(membership.role)) {
    throw new Error('Not authorized')
  }

  const { error } = await supabase
    .from('projects')
    .update({ share_role: role })
    .eq('id', projectId)

  if (error) throw error

  return { success: true }
}

export async function joinProjectByToken(token: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Find project by share token
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, share_enabled, share_role')
    .eq('share_token', token)
    .single()

  if (projectError || !project) throw new Error('Invalid share link')
  if (!project.share_enabled) throw new Error('Share link is disabled')

  // Check if already a member
  const { data: existing } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', project.id)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    return { success: true, projectId: project.id, alreadyMember: true }
  }

  // Add as member with the share role
  const { error: memberError } = await supabase.from('project_members').insert({
    project_id: project.id,
    user_id: user.id,
    role: project.share_role || 'viewer',
  })

  if (memberError) throw memberError

  revalidatePath('/projects')
  return { success: true, projectId: project.id, alreadyMember: false }
}

// ============ DATA SOURCES ACTIONS ============

export async function getProjectSettings(projectId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_settings')
    .select('*')
    .eq('project_id', projectId)
    .single()

  if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned

  return data || { project_id: projectId, rss_feeds: [], keywords: [] }
}

export async function updateProjectSettings(
  projectId: string,
  settings: {
    rss_feeds?: { url: string; name: string; enabled: boolean }[]
    keywords?: string[]
  }
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Check permission
  const { data: membership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'editor'].includes(membership.role)) {
    throw new Error('Not authorized')
  }

  // Upsert settings
  const { error } = await supabase.from('project_settings').upsert({
    project_id: projectId,
    ...settings,
  })

  if (error) throw error

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}
