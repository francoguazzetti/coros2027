import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/lib/actions/auth'
import { getAdminOverview } from '@/lib/actions/admin'
import { AdminConsole } from '@/components/admin/admin-console'

export const metadata = {
  title: 'Administración · Coros',
  description: 'Control de proyectos, miembros y accesos de la plataforma.',
}

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

  if (profile?.role !== 'admin') redirect('/projects')

  const overview = await getAdminOverview()

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Panel de control
            </p>
            <h1 className="mt-0.5 text-xl font-semibold text-foreground">Administración</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {profile?.full_name ?? user.email}
            </span>
            <Link
              href="/projects"
              className="rounded border border-border px-3 py-1.5 text-sm text-foreground transition-colors duration-150 hover:bg-muted"
            >
              Proyectos
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="rounded border border-border px-3 py-1.5 text-sm text-foreground transition-colors duration-150 hover:bg-muted"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-6 py-6">
        <AdminConsole overview={overview} currentUserId={user.id} />
      </div>
    </main>
  )
}
