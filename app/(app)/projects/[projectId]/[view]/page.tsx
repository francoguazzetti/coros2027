import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  getUserProjects,
  getSentimentCounts,
  getSentimentByTopic,
  getRecentPosts,
} from "@/lib/data"
import { getUserRoleInProject } from "@/lib/actions/settings"
import { CorosSidebar } from "@/components/coros/sidebar"
import { SentimentStats } from "@/components/coros/sentiment-stats"
import { TopicSentiment } from "@/components/coros/topic-sentiment"
import { CommentList, type Comment } from "@/components/coros/comment-card"
import { AIPanel } from "@/components/coros/ai-panel"
import { ShareButton } from "@/components/share/share-button"

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

  // Load all data in parallel — profile must include role for SettingsPopover visibility
  const [projects, sentimentCounts, topicSentiments, recentPosts, userRole] =
    await Promise.all([
      getUserProjects(),
      getSentimentCounts(projectId),
      getSentimentByTopic(projectId),
      getRecentPosts(projectId, 5),
      getUserRoleInProject(projectId),
    ])

  // Fetch profile with role directly to guarantee it's present
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, can_create_projects')
    .eq('id', user.id)
    .single()

  const profile = profileRow
    ? { ...profileRow, email: profileRow.email ?? user.email ?? null }
    : null

  // Validate that the project exists and user has access
  const currentProject = projects.find((p) => p.id === projectId)
  if (!currentProject) notFound()

  // Get full project data - try with share fields first, fallback without
  let projectData: {
    id: string
    name: string
    description?: string | null
    share_token?: string | null
    share_enabled?: boolean
    share_role?: string | null
  } | null = null

  // Try with share columns (they may not exist yet)
  const { data: fullProjectData, error: fullError } = await supabase
    .from('projects')
    .select('id, name, description, share_token, share_enabled, share_role')
    .eq('id', projectId)
    .single()

  if (!fullError && fullProjectData) {
    projectData = fullProjectData
  } else {
    // Fallback to basic project data if share columns don't exist
    const { data: basicProjectData } = await supabase
      .from('projects')
      .select('id, name, description')
      .eq('id', projectId)
      .single()
    
    if (basicProjectData) {
      projectData = { ...basicProjectData, share_token: null, share_enabled: false, share_role: null }
    }
  }

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
        profile={profile}
        project={projectData}
        userRole={userRole}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto border-r border-border p-8 pl-6">
        {/* Header with Share Button */}
        <div className="mx-auto max-w-2xl mb-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">{VIEW_LABELS[view as View]}</h1>
          <ShareButton
            projectId={projectId}
            projectName={currentProject.name}
            userRole={userRole}
            shareToken={projectData?.share_token}
            shareEnabled={projectData?.share_enabled}
            shareRole={projectData?.share_role}
          />
        </div>

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
