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

export interface ArticuloRow {
  id: string
  titulo: string
  fuente: string
  tipo_fuente: string | null
  tono_titular: string | null
  topico: string | null
  fecha: string
  url: string | null
  keyword_match: string | null
}

export type DateRange = "24h" | "7d" | "30d" | "all"

// ---- Helpers ----

function applyDateRange(query: ReturnType<ReturnType<Awaited<ReturnType<typeof createClient>>>['from']>['select'], dateRange: DateRange) {
  if (dateRange === "all") return query
  const now = new Date()
  let from: Date
  if (dateRange === "24h") from = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  else if (dateRange === "7d") from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  else from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  return query.gte("fecha", from.toISOString())
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

  // SAFE: Query only the user's own memberships (no recursion)
  const { data: memberships, error: memberError } = await supabase
    .from("project_members")
    .select("project_id")
    .eq("user_id", user.id)

  if (memberError || !memberships || memberships.length === 0) return []

  const projectIds = memberships.map((m) => m.project_id)

  // SAFE: Fetch projects by ID (no complex filtering)
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

export interface SentimentTimelinePoint {
  date: string          // "DD/MM" label
  positivo: number
  neutral: number
  negativo: number
}

/** Returns daily sentiment counts over time for the timeline chart */
export async function getSentimentOverTime(projectId: string): Promise<SentimentTimelinePoint[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("posts")
    .select("fecha, sentimiento")
    .eq("project_id", projectId)
    .not("sentimiento", "is", null)
    .order("fecha", { ascending: true })

  if (error || !data) return []

  const map: Record<string, SentimentTimelinePoint> = {}

  for (const row of data) {
    const d = new Date(row.fecha)
    const key = d.toISOString().slice(0, 10) // "YYYY-MM-DD"
    const label = `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`
    if (!map[key]) map[key] = { date: label, positivo: 0, neutral: 0, negativo: 0 }
    if (row.sentimiento === "positivo") map[key].positivo++
    else if (row.sentimiento === "negativo") map[key].negativo++
    else if (row.sentimiento === "neutral") map[key].neutral++
  }

  return Object.values(map)
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

/** Returns sentiment counts filtered by vista and date range */
export async function getSentimentCountsByVista(
  projectId: string,
  vista: string,
  dateRange: DateRange = "all"
): Promise<SentimentCounts> {
  const supabase = await createClient()
  let query = supabase
    .from("posts")
    .select("sentimiento")
    .eq("project_id", projectId)
    .eq("vista", vista)
    .not("sentimiento", "is", null)

  if (dateRange !== "all") {
    const now = new Date()
    let from: Date
    if (dateRange === "24h") from = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    else if (dateRange === "7d") from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    else from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    query = query.gte("fecha", from.toISOString())
  }

  const { data, error } = await query
  if (error || !data) return { positivo: 0, neutral: 0, negativo: 0, total: 0 }

  const positivo = data.filter((p) => p.sentimiento === "positivo").length
  const neutral = data.filter((p) => p.sentimiento === "neutral").length
  const negativo = data.filter((p) => p.sentimiento === "negativo").length

  return { positivo, neutral, negativo, total: data.length }
}

/** Returns sentiment by topic filtered by vista */
export async function getSentimentByTopicAndVista(
  projectId: string,
  vista: string
): Promise<TopicSentimentData[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("posts")
    .select("tema, sentimiento")
    .eq("project_id", projectId)
    .eq("vista", vista)
    .not("tema", "is", null)
    .not("sentimiento", "is", null)

  if (error || !data) return []

  const map: Record<string, TopicSentimentData> = {}
  for (const row of data) {
    if (!row.tema) continue
    if (!map[row.tema]) map[row.tema] = { topic: row.tema, positive: 0, negative: 0, neutral: 0 }
    if (row.sentimiento === "positivo") map[row.tema].positive++
    else if (row.sentimiento === "negativo") map[row.tema].negative++
    else if (row.sentimiento === "neutral") map[row.tema].neutral++
  }

  return Object.values(map).sort(
    (a, b) => b.positive + b.negative + b.neutral - (a.positive + a.negative + a.neutral)
  )
}

/** Returns recent posts filtered by vista */
export async function getRecentPostsByVista(
  projectId: string,
  vista: string,
  limit = 5
): Promise<PostRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("posts")
    .select("id, texto, red_social, fuente, sentimiento, tema, justificacion, fecha, likes, tipo")
    .eq("project_id", projectId)
    .eq("vista", vista)
    .order("fecha", { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return data
}

/** Returns tone counts from articulos_prensa filtered by vista */
export async function getToneCounts(
  projectId: string,
  vista: string
): Promise<SentimentCounts> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("articulos_prensa")
    .select("tono_titular")
    .eq("project_id", projectId)
    .eq("vista", vista)
    .not("tono_titular", "is", null)

  if (error || !data) return { positivo: 0, neutral: 0, negativo: 0, total: 0 }

  const positivo = data.filter((p) => p.tono_titular === "positivo").length
  const neutral = data.filter((p) => p.tono_titular === "neutral").length
  const negativo = data.filter((p) => p.tono_titular === "negativo").length

  return { positivo, neutral, negativo, total: data.length }
}

/** Returns topic tone breakdown from articulos_prensa filtered by vista */
export async function getToneByTopic(
  projectId: string,
  vista: string
): Promise<TopicSentimentData[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("articulos_prensa")
    .select("topico, tono_titular")
    .eq("project_id", projectId)
    .eq("vista", vista)
    .not("topico", "is", null)
    .not("tono_titular", "is", null)

  if (error || !data) return []

  const map: Record<string, TopicSentimentData> = {}
  for (const row of data) {
    if (!row.topico) continue
    if (!map[row.topico]) map[row.topico] = { topic: row.topico, positive: 0, negative: 0, neutral: 0 }
    if (row.tono_titular === "positivo") map[row.topico].positive++
    else if (row.tono_titular === "negativo") map[row.topico].negative++
    else if (row.tono_titular === "neutral") map[row.topico].neutral++
  }

  return Object.values(map).sort(
    (a, b) => b.positive + b.negative + b.neutral - (a.positive + a.negative + a.neutral)
  )
}

/** Returns recent articles from articulos_prensa filtered by vista */
export async function getRecentArticulos(
  projectId: string,
  vista: string,
  limit = 5
): Promise<ArticuloRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("articulos_prensa")
    .select("id, titulo, fuente, tipo_fuente, tono_titular, topico, fecha, url, keyword_match")
    .eq("project_id", projectId)
    .eq("vista", vista)
    .order("fecha", { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return data
}
