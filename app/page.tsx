import { CorosSidebar } from "@/components/coros/sidebar"
import { SentimentStats } from "@/components/coros/sentiment-stats"
import { TopicSentiment } from "@/components/coros/topic-sentiment"
import { CommentList, type Comment } from "@/components/coros/comment-card"
import { AIPanel } from "@/components/coros/ai-panel"

// Mock data matching the screenshot
const navItems = [
  { label: "Tableros", href: "#", isActive: false },
  { label: "General", href: "#", isActive: true, indent: true },
  { label: "Redes sociales", href: "#", isActive: false, indent: true },
  { label: "Diarios", href: "#", isActive: false, indent: true },
]

const topicSentiments = [
  { topic: "Obras", positive: 30, negative: 70 },
  { topic: "Seguridad", positive: 25, negative: 75 },
  { topic: "Salud", positive: 55, negative: 45 },
]

const comments: Comment[] = [
  {
    text: "Justo ahora en año electoral, que coincidencia",
    source: "Instagram",
    sentiment: "Negativo",
    topic: "Gestión general",
    analysisType: "LLM",
  },
  {
    text: "10 mil toneladas y las calles llenas de basura igual",
    source: "Facebook",
    sentiment: "Negativo",
    topic: "Limpieza",
    analysisType: "LLM",
  },
  {
    text: "Parchean una avenida y se sacan fotos, las calles internas son un desastre",
    source: "Instagram",
    sentiment: "Negativo",
    topic: "Obras",
    analysisType: "NLP",
  },
]

const suggestedQuestions = [
  { text: "¿De qué hablan los vecinos?" },
  { text: "¿Que dicen los diarios sobre Tigre?" },
  { text: "¿Sobre qué tratan los últimos comentarios?" },
]

export default function DashboardPage() {
  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar */}
      <CorosSidebar 
        projectName="Campaña Tigre 2027" 
        navItems={navItems}
      />

      {/* Main Content - Sentiment Section */}
      <main className="flex-1 overflow-auto border-r border-border p-8">
        <div className="mx-auto max-w-2xl space-y-8">
          {/* Sentiment Stats */}
          <SentimentStats 
            positives={2} 
            neutrals={1} 
            negatives={7} 
          />

          {/* Topic Sentiment */}
          <TopicSentiment topics={topicSentiments} />

          {/* Comments */}
          <CommentList comments={comments} />
        </div>
      </main>

      {/* Right Panel - AI Augmentation */}
      <AIPanel 
        suggestedQuestions={suggestedQuestions} 
        projectId="demo-project-id"
      />
    </div>
  )
}
