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
              href={`/projects/${project.id}/candidato`}
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
