import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  getUserProjects,
  getAllPostsByVista,
  getPostFilterOptions,
} from "@/lib/data"
import { CorosSidebar } from "@/components/coros/sidebar"
import { CommentCard } from "@/components/coros/comment-card"
import type { Comment } from "@/components/coros/comment-card"

const VIEWS = ["candidato", "municipio", "oposicion"] as const
type View = (typeof VIEWS)[number]

const VIEW_LABELS: Record<View, string> = {
  candidato: "Candidato",
  municipio: "Municipio",
  oposicion: "Oposición",
}

const PAGE_SIZE = 20

function mapSentimentLabel(s: string | null): "Positivo" | "Negativo" | "Neutral" {
  if (s === "positivo") return "Positivo"
  if (s === "negativo") return "Negativo"
  return "Neutral"
}

export default async function CommentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; view: string }>
  searchParams: Promise<{ sentimiento?: string; tema?: string; red_social?: string; page?: string }>
}) {
  const { projectId, view } = await params
  const { sentimiento, tema, red_social, page: pageParam } = await searchParams

  if (!VIEWS.includes(view as View)) {
    redirect(`/projects/${projectId}/candidato`)
  }
  const vista = view as View
  const page = Math.max(1, parseInt(pageParam ?? "1", 10))

  // Auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, can_create_projects")
    .eq("id", user.id)
    .single()
  if (!profileRow) redirect("/login")
  const profile = { ...profileRow, email: profileRow.email ?? user.email ?? null }

  const [projects, { rows: posts, total }, { temas, redes }, { data: projectData }] =
    await Promise.all([
      getUserProjects(),
      getAllPostsByVista(projectId, vista, { sentimiento, tema, red_social }, page, PAGE_SIZE),
      getPostFilterOptions(projectId, vista),
      supabase
        .from("projects")
        .select("id, name, description, created_by, share_token, share_enabled, share_role")
        .eq("id", projectId)
        .single(),
    ])

  const currentProject = projects.find((p) => p.id === projectId)
  if (!currentProject) notFound()

  const navItems = [
    { label: "Tableros", href: `/projects/${projectId}/candidato`, isActive: false },
    ...VIEWS.map((v) => ({
      label: VIEW_LABELS[v],
      href: `/projects/${projectId}/${v}`,
      isActive: false,
      indent: true,
    })),
  ]

  const comments: Comment[] = posts.map((p) => ({
    text: p.texto,
    source: p.red_social.charAt(0).toUpperCase() + p.red_social.slice(1),
    sentiment: mapSentimentLabel(p.sentimiento),
    topic: p.tema ?? "—",
    analysisType: "LLM",
  }))

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Build URL helper preserving current filters
  function buildUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams()
    const values: Record<string, string | undefined> = {
      sentimiento,
      tema,
      red_social,
      page: String(page),
      ...overrides,
    }
    for (const [k, v] of Object.entries(values)) {
      if (v && v !== "undefined") params.set(k, v)
    }
    return `?${params.toString()}`
  }

  const SENTIMENT_OPTIONS = [
    { value: "positivo", label: "Positivo" },
    { value: "neutral", label: "Neutral" },
    { value: "negativo", label: "Negativo" },
  ]

  return (
    <div className="flex h-screen bg-background">
      <CorosSidebar
        projectName={currentProject.name}
        navItems={navItems}
        currentView={vista}
        profile={profile}
        project={projectData}
        userRole={null}
      />

      <main className="flex-1 overflow-auto p-8 pl-6">
        <div className="mx-auto max-w-2xl space-y-6">

          {/* Header */}
          <div className="flex items-center gap-3">
            <a
              href={`/projects/${projectId}/${vista}`}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Volver al dashboard"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
              </svg>
            </a>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Comentarios en redes sociales</h1>
              <p className="text-xs text-muted-foreground mt-0.5">{VIEW_LABELS[vista]} · {total} resultado{total !== 1 ? "s" : ""}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {/* Sentimiento */}
            <div className="flex items-center gap-1">
              {SENTIMENT_OPTIONS.map((opt) => (
                <a
                  key={opt.value}
                  href={buildUrl({ sentimiento: sentimiento === opt.value ? undefined : opt.value, page: "1" })}
                  className={`px-2.5 py-1 text-xs rounded-[3px] border transition-colors duration-150 ${
                    sentimiento === opt.value
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground"
                  }`}
                >
                  {opt.label}
                </a>
              ))}
            </div>

            {/* Tema */}
            {temas.length > 0 && (
              <select
                name="tema"
                defaultValue={tema ?? ""}
                onChange={undefined}
                className="px-2.5 py-1 text-xs rounded-[3px] border border-border bg-background text-muted-foreground cursor-pointer"
                // Navigation is done via form or link below; this select uses a form
              >
                <option value="">Todos los temas</option>
                {temas.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}

            {/* Red social */}
            {redes.length > 0 && (
              <select
                name="red_social"
                defaultValue={red_social ?? ""}
                className="px-2.5 py-1 text-xs rounded-[3px] border border-border bg-background text-muted-foreground cursor-pointer"
              >
                <option value="">Todas las redes</option>
                {redes.map((r) => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            )}

            {/* Active filters as removable chips */}
            {tema && (
              <a
                href={buildUrl({ tema: undefined, page: "1" })}
                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-[3px] border border-foreground bg-foreground text-background"
              >
                {tema}
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </a>
            )}
            {red_social && (
              <a
                href={buildUrl({ red_social: undefined, page: "1" })}
                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-[3px] border border-foreground bg-foreground text-background"
              >
                {red_social.charAt(0).toUpperCase() + red_social.slice(1)}
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </a>
            )}
          </div>

          {/* Filter form for selects (client navigation) */}
          <form method="get" className="hidden" id="filter-form">
            {sentimiento && <input type="hidden" name="sentimiento" value={sentimiento} />}
          </form>

          {/* List */}
          <div className="space-y-3">
            {comments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sin resultados para los filtros seleccionados.</p>
            ) : (
              comments.map((comment, i) => (
                <CommentCard key={i} comment={comment} />
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              {page > 1 && (
                <a
                  href={buildUrl({ page: String(page - 1) })}
                  className="px-3 py-1.5 text-xs border border-border rounded-[5px] text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                >
                  ← Anterior
                </a>
              )}
              <span className="text-xs text-muted-foreground">
                Página {page} de {totalPages}
              </span>
              {page < totalPages && (
                <a
                  href={buildUrl({ page: String(page + 1) })}
                  className="px-3 py-1.5 text-xs border border-border rounded-[5px] text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                >
                  Siguiente →
                </a>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
