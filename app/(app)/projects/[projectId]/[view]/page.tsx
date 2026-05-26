import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  getUserProjects,
  getSentimentCountsByVista,
  getSentimentByTopicAndVista,
  getRecentPostsByVista,
  getArticleToneCounts,
  getArticleToneByTopic,
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
  { text: "¿Que dicen los diarios sobre Tigre?" },
  { text: "¿Sobre qué tratan los últimos comentarios?" },
]

const VALID_DATE_RANGES: DateRange[] = ["24h", "7d", "30d", "all"]

function mapSentimentLabel(s: string | null): "Positivo" | "Negativo" | "Neutral" {
  if (s === "positivo") return "Positivo"
  if (s === "negativo") return "Negativo"
  return "Neutral"
}

export default async function ProjectDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; view: string }>
  searchParams: Promise<{ dateRange?: string }>
}) {
  const { projectId, view } = await params
  const { dateRange: dateRangeParam } = await searchParams

  // Validate view param — redirect legacy views
  if (!VIEWS.includes(view as View)) {
    redirect(`/projects/${projectId}/candidato`)
  }

  const vista = view as View

  // Validate date range
  const dateRange: DateRange = VALID_DATE_RANGES.includes(dateRangeParam as DateRange)
    ? (dateRangeParam as DateRange)
    : "all"

  // Check auth
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Fetch profile
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, can_create_projects")
    .eq("id", user.id)
    .single()

  if (!profileRow) redirect("/login")
  const profile = { ...profileRow, email: profileRow.email ?? user.email ?? null }

  // Load all data in parallel
  const [
    projects,
    userRole,
    // Sección 1 — Sentimiento en redes
    sentimentCounts,
    // Sección 2 — Sentimiento por tema en redes
    topicSentiments,
    // Sección 3 — Tono de cobertura en medios
    articleToneCounts,
    // Sección 4 — Cobertura por tópico en medios
    articleToneByTopic,
    // Sección 5 — Últimos comentarios
    recentPosts,
    // Sección 6 — Últimas noticias
    recentArticulos,
  ] = await Promise.all([
    getUserProjects(),
    getUserRoleInProject(projectId),
    getSentimentCountsByVista(projectId, vista, dateRange),
    getSentimentByTopicAndVista(projectId, vista),
    getArticleToneCounts(projectId, vista),
    getArticleToneByTopic(projectId, vista),
    getRecentPostsByVista(projectId, vista, 5),
    getRecentArticulos(projectId, vista, 5),
  ])

  // Validate project access
  const currentProject = projects.find((p) => p.id === projectId)
  if (!currentProject) notFound()

  // Fetch project share data
  const { data: projectData } = await supabase
    .from("projects")
    .select("id, name, description, created_by, share_token, share_enabled, share_role")
    .eq("id", projectId)
    .single()

  // Build sidebar nav items
  const navItems = [
    {
      label: "Tableros",
      href: `/projects/${projectId}/candidato`,
      isActive: false,
    },
    ...VIEWS.map((v) => ({
      label: VIEW_LABELS[v],
      href: `/projects/${projectId}/${v}`,
      isActive: v === vista,
      indent: true,
    })),
  ]

  // Map posts to Comment shape
  const comments: Comment[] = recentPosts.map((p) => ({
    text: p.texto,
    source: p.red_social.charAt(0).toUpperCase() + p.red_social.slice(1),
    sentiment: mapSentimentLabel(p.sentimiento),
    topic: p.tema ?? "—",
    analysisType: "LLM",
  }))

  // Map articles to NewsArticle shape
  const articles: NewsArticle[] = recentArticulos.map((a) => ({
    title: a.titulo,
    source: a.fuente,
    tone: mapSentimentLabel(a.tono_titular),
    topic: a.topico ?? "—",
    url: a.url,
  }))

  // Date range label for UI
  const DATE_RANGE_LABELS: Record<DateRange, string> = {
    "24h": "24hs",
    "7d": "7 días",
    "30d": "30 días",
    "all": "Todo",
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar */}
      <CorosSidebar
        projectName={currentProject.name}
        navItems={navItems}
        currentView={vista}
        profile={profile}
        project={projectData}
        userRole={userRole}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto border-r border-border p-8 pl-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl mb-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">{VIEW_LABELS[vista]}</h1>
          <ShareButton
            projectId={projectId}
            projectName={currentProject.name}
            userRole={userRole}
            shareToken={projectData?.share_token}
            shareEnabled={projectData?.share_enabled}
            shareRole={projectData?.share_role}
          />
        </div>

        <div className="mx-auto max-w-2xl space-y-10">

          {/* Sección 1 — Sentimiento en redes sociales */}
          <div>
            {/* Date range selector */}
            <div className="flex items-center justify-between mb-1">
              <div>
                <h2 className="text-sm font-normal underline underline-offset-4">Sentimiento general</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Redes sociales</p>
              </div>
              <div className="flex items-center gap-1">
                {(["24h", "7d", "30d", "all"] as DateRange[]).map((range) => (
                  <a
                    key={range}
                    href={`/projects/${projectId}/${vista}?dateRange=${range}`}
                    className={`px-2 py-0.5 text-xs rounded-[3px] border transition-colors duration-150 ${
                      dateRange === range
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-foreground"
                    }`}
                  >
                    {DATE_RANGE_LABELS[range]}
                  </a>
                ))}
              </div>
            </div>
            <SentimentStats
              positives={sentimentCounts.positivo}
              neutrals={sentimentCounts.neutral}
              negatives={sentimentCounts.negativo}
            />
          </div>

          {/* Sección 2 — Sentimiento por tema en redes sociales */}
          <TopicSentiment
            topics={topicSentiments}
            title="Sentimiento por tema"
            subtitle="Redes sociales"
          />

          {/* Sección 3 — Tono de cobertura en medios */}
          <SentimentStats
            positives={articleToneCounts.positivo}
            neutrals={articleToneCounts.neutral}
            negatives={articleToneCounts.negativo}
            title="Tono de cobertura"
            subtitle="Medios periodísticos"
          />

          {/* Sección 4 — Cobertura por tópico en medios */}
          <TopicSentiment
            topics={articleToneByTopic}
            title="Cobertura por tópico"
            subtitle="Medios periodísticos"
          />

          {/* Sección 5 — Últimos comentarios en redes */}
          <CommentList comments={comments} />

          {/* Sección 6 — Últimas noticias */}
          <NewsList articles={articles} />

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
