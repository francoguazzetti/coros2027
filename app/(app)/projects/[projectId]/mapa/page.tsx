import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserProjects } from "@/lib/data"
import { getUserRoleInProject } from "@/lib/actions/settings"
import { ClariBISidebar } from "@/components/claribi/sidebar"
import { AIPanel } from "@/components/claribi/ai-panel"
import { ShareButton } from "@/components/share/share-button"
import { ElectoralMapLoader } from "@/components/claribi/electoral-map-loader"

const SUGGESTED_QUESTIONS = [
  { text: "¿De qué hablan los vecinos?" },
  { text: "¿Que dicen los diarios sobre Tigre?" },
  { text: "¿Sobre qué tratan los últimos comentarios?" },
]

export default async function MapaPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params

  // Auth
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Perfil
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, can_create_projects")
    .eq("id", user.id)
    .single()
  if (!profileRow) redirect("/login")
  const profile = { ...profileRow, email: profileRow.email ?? user.email ?? null }

  // Datos en paralelo
  const [projects, userRole] = await Promise.all([
    getUserProjects(),
    getUserRoleInProject(projectId),
  ])

  const currentProject = projects.find(p => p.id === projectId)
  if (!currentProject) notFound()

  const { data: projectData } = await supabase
    .from("projects")
    .select("id, name, description, created_by, share_token, share_enabled, share_role")
    .eq("id", projectId)
    .single()

  // Sidebar nav — mismo esquema que las otras vistas
  const navItems = [
    { label: "Tableros", href: `/projects/${projectId}/candidato`, isActive: false },
    { label: "Candidato",       href: `/projects/${projectId}/candidato`,       isActive: false, indent: true },
    { label: "Municipio",       href: `/projects/${projectId}/municipio`,       isActive: false, indent: true },
    { label: "Oposición",       href: `/projects/${projectId}/oposicion`,       isActive: false, indent: true },
    { label: "Mapa",            href: `/projects/${projectId}/mapa`,            isActive: true,  indent: true },
  ]

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <ClariBISidebar
        projectName={currentProject.name}
        navItems={navItems}
        currentView="mapa"
        profile={profile}
        project={projectData}
        userRole={userRole}
      />

      {/* Contenido principal */}
      <main className="flex-1 overflow-auto border-r border-border p-8 pl-6">
        <div className="mx-auto max-w-2xl mb-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">Mapa Electoral</h1>
          <ShareButton
            projectId={projectId}
            projectName={currentProject.name}
            userRole={userRole}
            shareToken={projectData?.share_token}
            shareEnabled={projectData?.share_enabled}
            shareRole={projectData?.share_role}
          />
        </div>

        {/* El mapa ocupa toda la altura disponible */}
        <div className="mx-auto max-w-2xl" style={{ height: "calc(100vh - 180px)" }}>
          <ElectoralMapLoader />
        </div>
      </main>

      {/* Panel AI */}
      <AIPanel suggestedQuestions={SUGGESTED_QUESTIONS} projectId={projectId} />
    </div>
  )
}
