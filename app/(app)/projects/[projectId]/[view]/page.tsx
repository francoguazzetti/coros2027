import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  getUserProjects,
  getSentimentCounts,
  getSentimentByTopic,
  getRecentPosts,
} from "@/lib/data"
import { CorosSidebar } from "@/components/coros/sidebar"
import { SentimentStats } from "@/components/coros/sentiment-stats"
import { TopicSentiment } from "@/components/coros/topic-sentiment"
import { CommentList, type Comment } from "@/components/coros/comment-card"
import { AIPanel } from "@/components/coros/ai-panel"

const VIEWS = ["general", "redes-sociales", "diarios"] as const
type View = (typeof VIEWS)[number]

const VIEW_LABELS: Record<View, string> = {
  general: "General",
  "redes-sociales": "Redes sociales",
  diarios: "Diarios",
}

const SUGGESTED_QUESTIONS = [
  { text: "¿De qué hablan los vecinos?" },
  { text: "¿Que dicen los diarios sobre Tigre?" },
  { text: "¿Sobre qué tratan los últimos comentarios?" },
]

function mapSentimentLabel(s: string | null): "Positivo" | "Negativo" | "Neutral" {
  if (s === "positivo") return "Positivo"
  if (s === "negativo") return "Negativo"
  return "Neutral"
}

export default async function ProjectDashboardPage({
  params,
}: {
  params: Promise<{ projectId: string; view: string }>
}) {
  const { projectId, view } = await params

  // Validate view param
  if (!VIEWS.includes(view as View)) {
    redirect(`/projects/${projectId}/general`)
  }

  // Check auth
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // Load all data in parallel
  const [projects, sentimentCounts, topicSentiments, recentPosts] =
    await Promise.all([
      getUserProjects(),
      getSentimentCounts(projectId),
      getSentimentByTopic(projectId),
      getRecentPosts(projectId, 5),
    ])

  // Validate that the project exists and user has access
  const currentProject = projects.find((p) => p.id === projectId)
  if (!currentProject) notFound()

  // Build nav items with real hrefs
  const navItems = [
    {
      label: "Tableros",
      href: `/projects/${projectId}/general`,
      isActive: false,
    },
    ...VIEWS.map((v) => ({
      label: VIEW_LABELS[v],
      href: `/projects/${projectId}/${v}`,
      isActive: v === view,
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

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar */}
      <CorosSidebar
        projectName={currentProject.name}
        navItems={navItems}
        currentView={view}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto border-r border-border p-8 pl-6">
        <div className="mx-auto max-w-2xl space-y-8">
          <SentimentStats
            positives={sentimentCounts.positivo}
            neutrals={sentimentCounts.neutral}
            negatives={sentimentCounts.negativo}
          />

          <TopicSentiment topics={topicSentiments} />

          <CommentList comments={comments} />
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
