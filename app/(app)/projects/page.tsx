'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { logout } from '@/lib/actions/auth'

interface Project {
  id: string
  name: string
  description: string | null
  created_at: string
}

interface UserProfile {
  full_name: string
  email: string
  role: string
  can_create_projects: boolean
}

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient()

        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        // Get user profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, email, role, can_create_projects')
          .eq('id', user.id)
          .single()

        if (profileData) {
          setProfile(profileData)
        }

        // Get user's projects
        const { data: memberships } = await supabase
          .from('project_members')
          .select('project_id')
          .eq('user_id', user.id)

        if (memberships && memberships.length > 0) {
          const projectIds = memberships.map((m) => m.project_id)

          const { data: projectsData } = await supabase
            .from('projects')
            .select('id, name, description, created_at')
            .in('id', projectIds)
            .order('created_at', { ascending: false })

          if (projectsData) {
            setProjects(projectsData)
          }
        }
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Error al cargar perfil</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tus Proyectos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bienvenido, {profile.full_name}
          </p>
        </div>
        <button
          onClick={() => logout()}
          className="rounded border border-border bg-transparent px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
        >
          Salir
        </button>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="rounded border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No tienes proyectos disponibles. Contactá al administrador.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => router.push(`/projects/${project.id}/general`)}
              className="rounded border border-border bg-card p-6 text-left hover:bg-muted transition-colors"
            >
              <h3 className="font-semibold text-foreground">{project.name}</h3>
              {project.description && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                  {project.description}
                </p>
              )}
              <p className="mt-4 text-xs text-muted-foreground">
                {new Date(project.created_at).toLocaleDateString('es-AR')}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
