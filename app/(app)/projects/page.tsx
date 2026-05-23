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
          className="rounded border border-border bg-transparent px-4 py-2 text-sm text-foreground hover:bg-muted transition-all duration-200 hover:scale-102 active:scale-98 relative group"
          title="Logout"
        >
          Salir
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-foreground rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-200">
            Log out
          </span>
        </button>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="rounded border border-border bg-card p-8 text-center transition-all duration-200">
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
              className="rounded border border-border bg-card p-6 text-left transition-all duration-200 hover:shadow-md hover:scale-[1.01] hover:-translate-y-1 cursor-pointer group"
              title={project.name}
            >
              <h3 className="font-semibold text-foreground transition-colors duration-200 group-hover:text-foreground/80">
                {project.name}
              </h3>
              {project.description && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2 transition-colors duration-200 group-hover:text-foreground/60">
                  {project.description}
                </p>
              )}
              <p className="mt-4 text-xs text-muted-foreground transition-colors duration-200 group-hover:text-foreground/50">
                {new Date(project.created_at).toLocaleDateString('es-AR')}
              </p>
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-foreground rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-200">
                Click to open
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
