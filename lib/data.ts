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

// ---- Vista-filtered queries ----

export type DateRange = "24h" | "7d" | "30d" | "all"

function dateRangeFilter(dateRange: DateRange): string | null {
  if (dateRange === "all") return null
  const now = new Date()
  if (dateRange === "24h") return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  if (dateRange === "7d") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
}

/** Sentiment counts from posts filtered by vista and optional date range */
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

  const from = dateRangeFilter(dateRange)
  if (from) query = query.gte("fecha", from)

  const { data, error } = await query
  if (error || !data) return { positivo: 0, neutral: 0, negativo: 0, total: 0 }

  const positivo = data.filter((p) => p.sentimiento === "positivo").length
  const neutral = data.filter((p) => p.sentimiento === "neutral").length
  const negativo = data.filter((p) => p.sentimiento === "negativo").length
  return { positivo, neutral, negativo, total: data.length }
}

/** Sentiment by topic from posts filtered by vista */
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

/** N most recent posts filtered by vista */
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

export interface ArticuloRow {
  id: string
  titulo: string
  fuente: string
  tipo_fuente: string | null
  tono_titular: string | null
  topico: string | null
  fecha: string
  url: string | null
}

/** Tone counts from articulos_prensa filtered by vista */
export async function getArticleToneCounts(
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
  const neutral = data.filter((p) => p.tono_titular === "neutro" || p.tono_titular === "neutral").length
  const negativo = data.filter((p) => p.tono_titular === "negativo").length
  return { positivo, neutral, negativo, total: data.length }
}

/** Tone by topic from articulos_prensa filtered by vista */
export async function getArticleToneByTopic(
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
    else map[row.topico].neutral++
  }
  return Object.values(map).sort(
    (a, b) => b.positive + b.negative + b.neutral - (a.positive + a.negative + a.neutral)
  )
}

/** N most recent articles from articulos_prensa filtered by vista */
export async function getRecentArticulos(
  projectId: string,
  vista: string,
  limit = 5
): Promise<ArticuloRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("articulos_prensa")
    .select("id, titulo, fuente, tipo_fuente, tono_titular, topico, fecha, url")
    .eq("project_id", projectId)
    .eq("vista", vista)
    .order("fecha", { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return data
}

export interface PostFilters {
  sentimiento?: string
  tema?: string
  red_social?: string
}

export interface ArticuloFilters {
  tono?: string
  topico?: string
  fuente?: string
}

/** All posts filtered by vista + optional filters, paginated */
export async function getAllPostsByVista(
  projectId: string,
  vista: string,
  filters: PostFilters = {},
  page = 1,
  pageSize = 20
): Promise<{ rows: PostRow[]; total: number }> {
  const supabase = await createClient()
  let query = supabase
    .from("posts")
    .select("id, texto, red_social, fuente, sentimiento, tema, justificacion, fecha, likes, tipo", { count: "exact" })
    .eq("project_id", projectId)
    .eq("vista", vista)

  if (filters.sentimiento) query = query.eq("sentimiento", filters.sentimiento)
  if (filters.tema) query = query.eq("tema", filters.tema)
  if (filters.red_social) query = query.eq("red_social", filters.red_social)

  const from = (page - 1) * pageSize
  const { data, error, count } = await query
    .order("fecha", { ascending: false })
    .range(from, from + pageSize - 1)

  if (error || !data) return { rows: [], total: 0 }
  return { rows: data, total: count ?? 0 }
}

/** All articles filtered by vista + optional filters, paginated */
export async function getAllArticulosByVista(
  projectId: string,
  vista: string,
  filters: ArticuloFilters = {},
  page = 1,
  pageSize = 20
): Promise<{ rows: ArticuloRow[]; total: number }> {
  const supabase = await createClient()
  let query = supabase
    .from("articulos_prensa")
    .select("id, titulo, fuente, tipo_fuente, tono_titular, topico, fecha, url", { count: "exact" })
    .eq("project_id", projectId)
    .eq("vista", vista)

  if (filters.tono) query = query.eq("tono_titular", filters.tono)
  if (filters.topico) query = query.eq("topico", filters.topico)
  if (filters.fuente) query = query.eq("fuente", filters.fuente)

  const from = (page - 1) * pageSize
  const { data, error, count } = await query
    .order("fecha", { ascending: false })
    .range(from, from + pageSize - 1)

  if (error || !data) return { rows: [], total: 0 }
  return { rows: data, total: count ?? 0 }
}

/** Distinct values for post filter dropdowns */
export async function getPostFilterOptions(
  projectId: string,
  vista: string
): Promise<{ temas: string[]; redes: string[] }> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("posts")
    .select("tema, red_social")
    .eq("project_id", projectId)
    .eq("vista", vista)

  if (!data) return { temas: [], redes: [] }
  const temas = [...new Set(data.map((r) => r.tema).filter(Boolean) as string[])].sort()
  const redes = [...new Set(data.map((r) => r.red_social).filter(Boolean) as string[])].sort()
  return { temas, redes }
}

/** Distinct values for article filter dropdowns */
export async function getArticuloFilterOptions(
  projectId: string,
  vista: string
): Promise<{ topicos: string[]; fuentes: string[] }> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("articulos_prensa")
    .select("topico, fuente")
    .eq("project_id", projectId)
    .eq("vista", vista)

  if (!data) return { topicos: [], fuentes: [] }
  const topicos = [...new Set(data.map((r) => r.topico).filter(Boolean) as string[])].sort()
  const fuentes = [...new Set(data.map((r) => r.fuente).filter(Boolean) as string[])].sort()
  return { topicos, fuentes }
}
