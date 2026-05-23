import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/lib/actions/auth'

export default async function AdminPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, role')
    .eq('id', user.id)
    .single()

  // Only admins can access this page
  if (profile?.role !== 'admin') redirect('/projects')

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Panel de Administración</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bienvenido, {profile?.full_name ?? user.email}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/projects"
            className="rounded border border-border bg-transparent px-4 py-2 text-sm text-foreground hover:bg-muted transition-all duration-200"
          >
            Ver proyectos
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="rounded border border-border bg-transparent px-4 py-2 text-sm text-foreground hover:bg-muted transition-all duration-200"
            >
              Salir
            </button>
          </form>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/projects"
          className="rounded border border-border bg-card p-6 text-left transition-all duration-200 hover:shadow-md hover:scale-[1.01] hover:-translate-y-1 block group"
        >
          <h3 className="font-semibold text-foreground transition-colors duration-200 group-hover:text-foreground/80">
            Proyectos
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Ver y gestionar todos los proyectos de la plataforma.
          </p>
        </Link>
      </div>
    </div>
  )
}
