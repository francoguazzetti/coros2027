import { createClient } from "@/lib/supabase/server"

// ---- Types ----

export interface Project {
  id: string
  name: string
  description: string | null
}

export interface SentimentCounts {
  positivo: number
  neutral: number
  negativo: number
  total: number
}

export interface TopicSentimentData {
  topic: string
  positive: number
  negative: number
  neutral: number
}

export interface PostRow {
  id: string
  texto: string
  red_social: string
  fuente: string
  sentimiento: string | null
  tema: string | null
  justificacion: string | null
  fecha: string
  likes: number | null
  tipo: string
}

// ---- Queries ----

/** Returns all projects the authenticated user is a member of */
export async function getUserProjects(): Promise<Project[]> {
  const supabase = await createClient()
  
  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  // Get project_members entries for this user, then fetch the full projects
  const { data: memberships, error: memberError } = await supabase
    .from("project_members")
    .select("project_id")
    .eq("user_id", user.id)

  if (memberError || !memberships) return []

  const projectIds = memberships.map((m) => m.project_id)
  if (projectIds.length === 0) return []

  // Now fetch the actual project details
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, description")
    .in("id", projectIds)
    .order("created_at", { ascending: true })

  if (error || !data) return []
  return data
}

/** Returns the first project for the authenticated user */
export async function getFirstProject(): Promise<Project | null> {
  const projects = await getUserProjects()
  return projects[0] ?? null
}

/** Returns sentiment counts for a project (positivo / neutral / negativo) */
export async function getSentimentCounts(projectId: string): Promise<SentimentCounts> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("posts")
    .select("sentimiento")
    .eq("project_id", projectId)
    .not("sentimiento", "is", null)

  if (error || !data) return { positivo: 0, neutral: 0, negativo: 0, total: 0 }

  const positivo = data.filter((p) => p.sentimiento === "positivo").length
  const neutral = data.filter((p) => p.sentimiento === "neutral").length
  const negativo = data.filter((p) => p.sentimiento === "negativo").length

  return { positivo, neutral, negativo, total: data.length }
}

/** Returns sentiment broken down by topic for bar charts */
export async function getSentimentByTopic(projectId: string): Promise<TopicSentimentData[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("posts")
    .select("tema, sentimiento")
    .eq("project_id", projectId)
    .not("tema", "is", null)
    .not("sentimiento", "is", null)

  if (error || !data) return []

  const map: Record<string, TopicSentimentData> = {}

  for (const row of data) {
    if (!row.tema) continue
    if (!map[row.tema]) {
      map[row.tema] = { topic: row.tema, positive: 0, negative: 0, neutral: 0 }
    }
    if (row.sentimiento === "positivo") map[row.tema].positive++
    else if (row.sentimiento === "negativo") map[row.tema].negative++
    else if (row.sentimiento === "neutral") map[row.tema].neutral++
  }

  // Sort topics by total volume descending
  return Object.values(map).sort(
    (a, b) => b.positive + b.negative + b.neutral - (a.positive + a.negative + a.neutral)
  )
}

/** Returns the N most recent posts/comments with their sentiment */
export async function getRecentPosts(projectId: string, limit = 5): Promise<PostRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("posts")
    .select("id, texto, red_social, fuente, sentimiento, tema, justificacion, fecha, likes, tipo")
    .eq("project_id", projectId)
    .order("fecha", { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return data
}
