import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getFirstProject } from "@/lib/data"

export default async function RootPage() {
  // Check auth first
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Redirect to first project
  const project = await getFirstProject()

  if (!project) {
    // Authenticated but no projects yet — show a simple placeholder
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">
          No hay proyectos disponibles. Contactá al administrador.
        </p>
      </div>
    )
  }

  redirect(`/projects/${project.id}/general`)
}
