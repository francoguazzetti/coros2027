import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  getUserProjects,
  getSentimentCountsByVista,
  getSentimentByTopicAndVista,
  getRecentPostsByVista,
  getToneCounts,
  getToneByTopic,
  getRecentArticulos,
  type DateRange,
} from "@/lib/data"
import { getUserRoleInProject } from "@/lib/actions/settings"
import { CorosSidebar } from "@/components/coros/sidebar"
import { SentimentStats } from "@/components/coros/sentiment-stats"
import { TopicSentiment } from "@/components/coros/topic-sentiment"
import { CommentList, NewsList, type Comment, type NewsArticle } from "@/components/coros/comment-card"
import { AIPanel } from "@/components/coros/ai-panel"
import { ShareButton } from "@/components/share/share-button"

const VIEWS = ["candidato", "municipio", "oposicion"] as const
type View = (typeof VIEWS)[number]

const VIEW_LABELS: Record<View, string> = {
  candidato: "Candidato",
  municipio: "Municipio",
  oposicion: "Oposición",
}

const SUGGESTED_QUESTIONS = [
  { text: "¿De qué hablan los vecinos?" },
  { text: "¿Qué dicen los diarios?" },
  { text: "¿Sobre qué tratan los últimos comentarios?" },
]

function mapSentimentLabel(s: string | null): "Positivo" | "Negativo" | "Neutral" {
  if (s === "positivo") return "Positivo"
  if (s === "negativo") return "Negativo"
  return "Neutral"
}

function isValidDateRange(v: string | null): v is DateRange {
  return v === "24h" || v === "7d" || v === "30d" || v === "all"
}

export default async function ProjectDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; view: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { projectId, view } = await params
  const resolvedSearchParams = await searchParams

  // Validate view param — redirect legacy views to candidato
  if (!VIEWS.includes(view as View)) {
    redirect(`/projects/${projectId}/candidato`)
  }

  const activeView = view as View

  // Parse date range from search params
  const rawDateRange = typeof resolvedSearchParams.dateRange === "string"
    ? resolvedSearchParams.dateRange
    : null
  const dateRange: DateRange = isValidDateRange(rawDateRange) ? rawDateRange : "all"

  // Check auth
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Load all data in parallel
  const [
    projects,
    sentimentCounts,
    topicSentiments,
    recentPosts,
    toneCounts,
    toneByTopic,
    recentArticulos,
    userRole,
  ] = await Promise.all([
    getUserProjects(),
    getSentimentCountsByVista(projectId, activeView, dateRange),
    getSentimentByTopicAndVista(projectId, activeView),
    getRecentPostsByVista(projectId, activeView, 5),
    getToneCounts(projectId, activeView),
    getToneByTopic(projectId, activeView),
    getRecentArticulos(projectId, activeView, 5),
    getUserRoleInProject(projectId),
  ])

  // Fetch profile
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, can_create_projects")
    .eq("id", user.id)
    .single()

  if (!profileRow) redirect("/auth/login")

  const profile = { ...profileRow, email: profileRow.email ?? user.email ?? null }

  // Validate project access
  const currentProject = projects.find((p) => p.id === projectId)
  if (!currentProject) notFound()

  // Fetch full project data
  const { data: projectData } = await supabase
    .from("projects")
    .select("id, name, description, created_by, share_token, share_enabled, share_role")
    .eq("id", projectId)
    .single()

  // Build nav items
  const navItems = [
    {
      label: "Tableros",
      href: `/projects/${projectId}/candidato`,
      isActive: false,
    },
    ...VIEWS.map((v) => ({
      label: VIEW_LABELS[v],
      href: `/projects/${projectId}/${v}`,
      isActive: v === activeView,
      indent: true,
    })),
  ]

  // Map raw posts to Comment shape
  const comments: Comment[] = recentPosts.map((p) => ({
    text: p.texto,
    source: p.red_social.charAt(0).toUpperCase() + p.red_social.slice(1),
    sentiment: mapSentimentLabel(p.sentimiento),
    topic: p.tema ?? "—",
    analysisType: "LLM",
  }))

  // Map raw articulos to NewsArticle shape
  const articles: NewsArticle[] = recentArticulos.map((a) => ({
    title: a.titulo,
    source: a.fuente,
    tone: mapSentimentLabel(a.tono_titular),
    topic: a.topico ?? "—",
    url: a.url,
  }))

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar */}
      <CorosSidebar
        projectName={currentProject.name}
        navItems={navItems}
        currentView={activeView}
        profile={profile}
        project={projectData}
        userRole={userRole}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto border-r border-border p-8 pl-6">
        {/* Header */}
        <div className="mx-auto max-w-5xl mb-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">{VIEW_LABELS[activeView]}</h1>
          <ShareButton
            projectId={projectId}
            projectName={currentProject.name}
            userRole={userRole}
            shareToken={projectData?.share_token}
            shareEnabled={projectData?.share_enabled}
            shareRole={projectData?.share_role}
          />
        </div>

        {/* Two-column layout: Redes | Medios */}
        <div className="mx-auto max-w-5xl grid grid-cols-2 gap-8">
          {/* ---- Column 1: Redes Sociales ---- */}
          <div className="space-y-8">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Redes sociales
            </p>

            {/* 1. Sentimiento general */}
            <SentimentStats
              positives={sentimentCounts.positivo}
              neutrals={sentimentCounts.neutral}
              negatives={sentimentCounts.negativo}
              title="Sentimiento general"
              dateRange={dateRange}
              showDateRange
            />

            {/* 2. Sentimiento por tema */}
            <TopicSentiment
              topics={topicSentiments}
              title="Sentimiento por tema"
            />

            {/* 5. Últimos comentarios */}
            <CommentList comments={comments} />
          </div>

          {/* ---- Column 2: Medios ---- */}
          <div className="space-y-8">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Medios periodísticos
            </p>

            {/* 3. Tono de cobertura */}
            <SentimentStats
              positives={toneCounts.positivo}
              neutrals={toneCounts.neutral}
              negatives={toneCounts.negativo}
              title="Tono de cobertura"
            />

            {/* 4. Cobertura por tópico */}
            <TopicSentiment
              topics={toneByTopic}
              title="Cobertura por tópico"
            />

            {/* 6. Últimas noticias */}
            <NewsList articles={articles} />
          </div>
        </div>
      </main>

      {/* Right Panel - AI */}
      <AIPanel
        suggestedQuestions={SUGGESTED_QUESTIONS}
        projectId={projectId}
      />
    </div>
  )
}
