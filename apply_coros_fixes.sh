#!/bin/bash
set -e

echo "=== Aplicando fixes de Coros ==="

# 1. Crear branch desde main
git checkout main
git pull origin main
git checkout -b claude/adoring-allen-gTpkW

# 2. Eliminar rutas duplicadas de auth
rm -rf app/auth/

# 3. Crear archivo de migración SQL
mkdir -p supabase/migrations
cat > supabase/migrations/20260523_fix_rls_project_members.sql << 'EOF'
-- Fix: RLS recursion in project_members + missing admin bypass
CREATE OR REPLACE FUNCTION public.get_my_project_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT array_agg(project_id)
  FROM public.project_members
  WHERE user_id = auth.uid();
$$;

DROP POLICY IF EXISTS "pm_select_project_members" ON project_members;
CREATE POLICY "pm_select_project_members" ON project_members
  FOR SELECT
  USING (
    get_my_role() = 'admin'
    OR project_id = ANY(get_my_project_ids())
  );

DROP POLICY IF EXISTS "pm_insert_owner_or_admin" ON project_members;
CREATE POLICY "pm_insert_owner_or_admin" ON project_members
  FOR INSERT
  WITH CHECK (
    get_my_role() = 'admin'
    OR get_my_project_role(project_id) IN ('owner', 'editor', 'admin')
  );
EOF

# 4. Reescribir projects/page.tsx como Server Component
cat > 'app/(app)/projects/page.tsx' << 'EOF'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserProjects } from '@/lib/data'
import { logout } from '@/lib/actions/auth'

export default async function ProjectsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('full_name, email, role, can_create_projects')
    .eq('id', user.id)
    .single()

  if (!profileData) {
    const fallbackName =
      (user.user_metadata?.full_name as string | undefined) ??
      user.email?.split('@')[0] ??
      'Usuario'

    await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      full_name: fallbackName,
      role: 'viewer',
      can_create_projects: false,
    })
  }

  const profile = profileData ?? {
    full_name: user.email?.split('@')[0] ?? 'Usuario',
    email: user.email ?? '',
    role: 'viewer',
    can_create_projects: false,
  }

  const projects = await getUserProjects()

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tus Proyectos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bienvenido, {profile.full_name ?? user.email}
          </p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="rounded border border-border bg-transparent px-4 py-2 text-sm text-foreground hover:bg-muted transition-all duration-200 hover:scale-102 active:scale-98"
          >
            Salir
          </button>
        </form>
      </div>

      {projects.length === 0 ? (
        <div className="rounded border border-border bg-card p-8 text-center transition-all duration-200">
          <p className="text-sm text-muted-foreground">
            No tienes proyectos disponibles. Contactá al administrador.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}/general`}
              className="rounded border border-border bg-card p-6 text-left transition-all duration-200 hover:shadow-md hover:scale-[1.01] hover:-translate-y-1 block group"
            >
              <h3 className="font-semibold text-foreground transition-colors duration-200 group-hover:text-foreground/80">
                {project.name}
              </h3>
              {project.description && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2 transition-colors duration-200 group-hover:text-foreground/60">
                  {project.description}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
EOF

# 5. Arreglar lib/actions/auth.ts
cat > lib/actions/auth.ts << 'EOF'
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function loginWithEmail(email: string, password: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single()

  if (profile?.role === 'admin') {
    redirect('/admin')
  } else {
    redirect('/projects')
  }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function getUserRole() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, can_create_projects')
    .eq('id', user.id)
    .single()

  return profile
}

export async function getCurrentUser() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}
EOF

# 6. Arreglar lib/actions/projects.ts - agregar auth check, eliminar removeUserFromProject
cat > lib/actions/projects.ts << 'EOF'
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

  const { data, error } = await supabase
    .from('project_members')
    .select(`id, user_id, role, profiles (id, full_name, email)`)
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
EOF

# 7. Arreglar settings.ts - auth checks en disableShareLink y updateShareRole, password reset URL
python3 - << 'PYEOF'
import re

with open('lib/actions/settings.ts', 'r') as f:
    content = f.read()

# Fix requestPasswordReset
old = "  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {\n    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/reset-password`,\n  })"
new = """  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!siteUrl && process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_SITE_URL is not set')
  }
  const baseUrl = siteUrl || 'http://localhost:3000'

  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${baseUrl}/auth/reset-password`,
  })"""
content = content.replace(old, new)

# Fix disableShareLink - add membership check after auth check
old = """  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('projects')
    .update({
      share_enabled: false,
      share_token: null,
    })
    .eq('id', projectId)"""
new = """  if (!user) throw new Error('Not authenticated')

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
    .eq('id', projectId)"""
content = content.replace(old, new)

# Fix updateShareRole - add full auth block
old = """export async function updateShareRole(projectId: string, role: 'viewer' | 'editor') {
  const supabase = await createClient()

  const { error } = await supabase
    .from('projects')
    .update({ share_role: role })
    .eq('id', projectId)"""
new = """export async function updateShareRole(projectId: string, role: 'viewer' | 'editor') {
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
    .eq('id', projectId)"""
content = content.replace(old, new)

with open('lib/actions/settings.ts', 'w') as f:
    f.write(content)
print("settings.ts OK")
PYEOF

# 8. Arreglar members-list.tsx - limpiar import
sed -i "s/import { inviteUserToProject, removeUserFromProject } from '@\/lib\/actions\/projects'/import { inviteUserToProject } from '@\/lib\/actions\/projects'/" components/settings/members-list.tsx

# 9. Actualizar package.json name
sed -i 's/"name": "my-project"/"name": "coros"/' package.json

# 10. Commit y push
git add -A
git commit -m "fix: arreglos críticos de RLS, seguridad y arquitectura

- fix(db): get_my_project_ids() SECURITY DEFINER rompe recursión RLS en project_members
- fix(projects-page): convierte a Server Component, usa getUserProjects() server-side
- fix(security): auth+role checks en disableShareLink, updateShareRole, inviteUserToProject
- fix(security): elimina removeUserFromProject inseguro; limpia import en members-list.tsx
- fix(auth): elimina try/catch redundante en loginWithEmail
- fix(auth): elimina app/auth/ duplicado
- fix(settings): valida NEXT_PUBLIC_SITE_URL en producción
- chore: package.json name 'my-project' → 'coros'"

git push -u origin claude/adoring-allen-gTpkW

echo ""
echo "✅ ¡Listo! Branch claude/adoring-allen-gTpkW pusheado correctamente."
