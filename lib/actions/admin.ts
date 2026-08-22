'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/** Mirrors the `profiles_role_check` constraint in Postgres. */
export type GlobalRole = 'admin' | 'creator' | 'member'
/** Mirrors the `project_members_role_check` constraint in Postgres. */
export type ProjectRole = 'owner' | 'admin' | 'editor' | 'viewer'

const GLOBAL_ROLES: GlobalRole[] = ['admin', 'creator', 'member']
const PROJECT_ROLES: ProjectRole[] = ['owner', 'admin', 'editor', 'viewer']

export interface AdminProject {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string | null
  created_by: string | null
  share_enabled: boolean | null
  share_role: string | null
  memberCount: number
  rows: { articulos: number; posts: number; opo: number; total: number }
  lastDataUpdate: string | null
}

/** Aggregated AI chat consumption for one member. */
export interface AdminAiUsage {
  events: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cachedInputTokens: number
  tokens30d: number
  events30d: number
  lastUsedAt: string | null
}

export interface AdminMember {
  id: string
  email: string | null
  full_name: string | null
  role: GlobalRole
  can_create_projects: boolean
  created_at: string
  memberships: { membershipId: string; projectId: string; projectName: string; role: string }[]
  aiUsage: AdminAiUsage
}

export interface AdminOverview {
  projects: AdminProject[]
  members: AdminMember[]
  totals: {
    projects: number
    members: number
    admins: number
    rows: number
    unassignedMembers: number
    lastDataUpdate: string | null
    aiTokens: number
    aiTokens30d: number
    aiEvents: number
  }
}

/** Throws unless the caller's profile role is 'admin'. */
async function requireAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') throw new Error('Not authorized')

  return { supabase, user }
}

function maxDate(...values: (string | null | undefined)[]) {
  const valid = values.filter((v): v is string => Boolean(v))
  if (valid.length === 0) return null
  return valid.reduce((a, b) => (new Date(a) > new Date(b) ? a : b))
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const { supabase } = await requireAdmin()

  const [projectsRes, profilesRes, membersRes, statsRes, usageRes] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, description, created_at, updated_at, created_by, share_enabled, share_role')
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('id, email, full_name, role, can_create_projects, created_at')
      .order('created_at', { ascending: true }),
    supabase.from('project_members').select('id, project_id, user_id, role'),
    supabase.rpc('admin_project_stats'),
    supabase.rpc('admin_ai_usage_by_user'),
  ])

  if (projectsRes.error) throw projectsRes.error
  if (profilesRes.error) throw profilesRes.error
  if (membersRes.error) throw membersRes.error

  const rawProjects = projectsRes.data ?? []
  const rawProfiles = profilesRes.data ?? []
  const rawMembers = membersRes.data ?? []
  const rawStats = statsRes.error ? [] : ((statsRes.data as any[]) ?? [])
  const rawUsage = usageRes.error ? [] : ((usageRes.data as any[]) ?? [])

  const usageByUser = new Map<string, AdminAiUsage>(
    rawUsage.map((u) => [
      u.user_id as string,
      {
        events: Number(u.events ?? 0),
        inputTokens: Number(u.input_tokens ?? 0),
        outputTokens: Number(u.output_tokens ?? 0),
        totalTokens: Number(u.total_tokens ?? 0),
        cachedInputTokens: Number(u.cached_input_tokens ?? 0),
        tokens30d: Number(u.tokens_30d ?? 0),
        events30d: Number(u.events_30d ?? 0),
        lastUsedAt: u.last_used_at ?? null,
      },
    ])
  )

  const emptyUsage: AdminAiUsage = {
    events: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    cachedInputTokens: 0,
    tokens30d: 0,
    events30d: 0,
    lastUsedAt: null,
  }

  const statsByProject = new Map(rawStats.map((s) => [s.project_id as string, s]))
  const projectNames = new Map(rawProjects.map((p) => [p.id, p.name as string]))

  const projects: AdminProject[] = rawProjects.map((p) => {
    const s = statsByProject.get(p.id)
    const articulos = Number(s?.articulos_count ?? 0)
    const posts = Number(s?.posts_count ?? 0)
    const opo = Number(s?.opo_count ?? 0)

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      created_at: p.created_at,
      updated_at: p.updated_at,
      created_by: p.created_by,
      share_enabled: p.share_enabled,
      share_role: p.share_role,
      memberCount: Number(s?.member_count ?? rawMembers.filter((m) => m.project_id === p.id).length),
      rows: { articulos, posts, opo, total: articulos + posts + opo },
      lastDataUpdate: maxDate(s?.last_articulo, s?.last_post, s?.last_opo),
    }
  })

  const members: AdminMember[] = rawProfiles.map((profile) => ({
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    role: (profile.role ?? 'member') as GlobalRole,
    can_create_projects: Boolean(profile.can_create_projects),
    created_at: profile.created_at,
    memberships: rawMembers
      .filter((m) => m.user_id === profile.id)
      .map((m) => ({
        membershipId: m.id,
        projectId: m.project_id,
        projectName: projectNames.get(m.project_id) ?? 'Proyecto desconocido',
        role: m.role,
      }))
      .sort((a, b) => a.projectName.localeCompare(b.projectName)),
    aiUsage: usageByUser.get(profile.id) ?? emptyUsage,
  }))

  return {
    projects,
    members,
    totals: {
      projects: projects.length,
      members: members.length,
      admins: members.filter((m) => m.role === 'admin').length,
      rows: projects.reduce((sum, p) => sum + p.rows.total, 0),
      unassignedMembers: members.filter((m) => m.memberships.length === 0).length,
      lastDataUpdate: maxDate(...projects.map((p) => p.lastDataUpdate)),
      aiTokens: members.reduce((sum, m) => sum + m.aiUsage.totalTokens, 0),
      aiTokens30d: members.reduce((sum, m) => sum + m.aiUsage.tokens30d, 0),
      aiEvents: members.reduce((sum, m) => sum + m.aiUsage.events, 0),
    },
  }
}

export async function setGlobalRole(userId: string, role: GlobalRole) {
  if (!GLOBAL_ROLES.includes(role)) throw new Error('Rol inválido')

  const { supabase, user } = await requireAdmin()

  if (userId === user.id && role !== 'admin') {
    throw new Error('No podés quitarte tu propio rol de administrador.')
  }

  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
  if (error) throw error

  revalidatePath('/admin')
  return { success: true }
}

export async function setCanCreateProjects(userId: string, canCreate: boolean) {
  const { supabase } = await requireAdmin()

  const { error } = await supabase
    .from('profiles')
    .update({ can_create_projects: canCreate })
    .eq('id', userId)
  if (error) throw error

  revalidatePath('/admin')
  return { success: true }
}

export async function assignMemberToProject(
  userId: string,
  projectId: string,
  role: ProjectRole = 'viewer'
) {
  if (!PROJECT_ROLES.includes(role)) throw new Error('Rol inválido')

  const { supabase } = await requireAdmin()

  const { data: existing } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) throw new Error('El usuario ya pertenece a este proyecto.')

  const { error } = await supabase
    .from('project_members')
    .insert({ project_id: projectId, user_id: userId, role })
  if (error) throw error

  revalidatePath('/admin')
  revalidatePath('/projects')
  return { success: true }
}

export async function setProjectMemberRole(membershipId: string, role: ProjectRole) {
  if (!PROJECT_ROLES.includes(role)) throw new Error('Rol inválido')

  const { supabase } = await requireAdmin()

  const { error } = await supabase
    .from('project_members')
    .update({ role })
    .eq('id', membershipId)
  if (error) throw error

  revalidatePath('/admin')
  revalidatePath('/projects')
  return { success: true }
}

export async function unassignMemberFromProject(membershipId: string) {
  const { supabase } = await requireAdmin()

  const { error } = await supabase.from('project_members').delete().eq('id', membershipId)
  if (error) throw error

  revalidatePath('/admin')
  revalidatePath('/projects')
  return { success: true }
}
