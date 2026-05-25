'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createProject(name: string, description?: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({ name, description, created_by: user.id })
    .select()
    .single()

  if (projectError) throw projectError

  const { error: memberError } = await supabase
    .from('project_members')
    .insert({ project_id: project.id, user_id: user.id, role: 'owner' })

  if (memberError) throw memberError

  revalidatePath('/projects')
  return project
}

export async function inviteUserToProject(
  email: string,
  projectId: string,
  role: 'editor' | 'viewer'
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Verify caller has permission to invite
  const { data: callerMembership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!callerMembership || !['owner', 'editor', 'admin'].includes(callerMembership.role)) {
    throw new Error('Not authorized')
  }

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()

  if (existingProfile) {
    // Check if already a member
    const { data: alreadyMember } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', existingProfile.id)
      .single()

    if (alreadyMember) {
      throw new Error('Este usuario ya es miembro del proyecto.')
    }

    const { error } = await supabase.from('project_members').insert({
      project_id: projectId,
      user_id: existingProfile.id,
      role,
    })
    if (error) throw error
  } else {
    const { error } = await supabase.from('project_invites').insert({
      project_id: projectId,
      email,
      role,
      invited_by: user.id,
    })
    if (error) throw error
    // TODO: Send magic link email with invite token
  }

  revalidatePath(`/projects/${projectId}`)
}

export async function getProjectMembers(projectId: string) {
  const supabase = await createClient()

  // Fetch members first — avoid the PostgREST auto-join on profiles
  // because user_id may have a FK to auth.users (not public.profiles),
  // which PostgREST cannot resolve across schemas (PGRST200).
  const { data: members, error: membersError } = await supabase
    .from('project_members')
    .select('id, user_id, role')
    .eq('project_id', projectId)

  if (membersError) throw membersError
  if (!members || members.length === 0) return []

  const userIds = members.map((m) => m.user_id)

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', userIds)

  if (profilesError) throw profilesError

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]))

  return members.map((m) => ({
    id: m.id,
    user_id: m.user_id,
    role: m.role,
    profiles: profileMap.get(m.user_id) ?? null,
  }))
}

export async function updateUserRole(userId: string, role: 'editor' | 'viewer' | 'owner') {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data: adminCheck } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (adminCheck?.role !== 'admin') {
    throw new Error('Not authorized')
  }

  const { error } = await supabase
    .from('project_members')
    .update({ role })
    .eq('user_id', userId)

  if (error) throw error

  revalidatePath('/projects')
}
