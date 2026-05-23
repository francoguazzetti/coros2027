'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createProject(name: string, description?: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Create the project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      name,
      description,
      created_by: user.id,
    })
    .select()
    .single()

  if (projectError) throw projectError

  // Add user as owner
  const { error: memberError } = await supabase
    .from('project_members')
    .insert({
      project_id: project.id,
      user_id: user.id,
      role: 'owner',
    })

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

  // Check if user already exists
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()

  if (existingProfile) {
    // User already registered - add directly
    const { error } = await supabase.from('project_members').insert({
      project_id: projectId,
      user_id: existingProfile.id,
      role,
    })

    if (error) throw error
  } else {
    // User not registered - create invite
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

export async function removeUserFromProject(projectId: string, userId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId)

  if (error) throw error

  revalidatePath(`/projects/${projectId}`)
}

export async function getProjectMembers(projectId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_members')
    .select(`
      id,
      user_id,
      role,
      profiles (
        id,
        full_name,
        email
      )
    `)
    .eq('project_id', projectId)

  if (error) throw error
  return data
}

export async function updateUserRole(userId: string, role: 'editor' | 'viewer' | 'owner') {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Check if current user is admin or owner of project
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
