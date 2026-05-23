import { streamText, convertToModelMessages, tool } from "ai"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

export async function POST(req: Request) {
  const supabase = await createClient()
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { messages, projectId } = await req.json()

  if (!projectId) {
    return new Response("projectId is required", { status: 400 })
  }

  // Verify the user has access to this project via project_members
  const { data: membership } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!membership) {
    return new Response("Forbidden", { status: 403 })
  }

  // Define tools that query the database
  const tools = {
    getSentimentSummary: tool({
      description: "Get a summary of sentiment analysis for the project",
      inputSchema: z.object({
        projectId: z.string().describe("The project ID"),
        tema: z.string().nullable().describe("Optional filter by tema/topic"),
        redSocial: z.string().nullable().describe("Optional filter by social network (instagram, facebook, x, rss)"),
      }),
      execute: async ({ projectId, tema, redSocial }) => {
        let query = supabase
          .from("posts")
          .select("sentimiento")
          .eq("project_id", projectId)
          .not("sentimiento", "is", null)

        if (tema) query = query.eq("tema", tema)
        if (redSocial) query = query.eq("red_social", redSocial)

        const { data, error } = await query

        if (error) return { error: error.message }

        const summary = {
          positivo: data?.filter(p => p.sentimiento === "positivo").length || 0,
          neutral: data?.filter(p => p.sentimiento === "neutral").length || 0,
          negativo: data?.filter(p => p.sentimiento === "negativo").length || 0,
          total: data?.length || 0
        }

        return summary
      },
    }),

    getRecentComments: tool({
      description: "Get recent comments/posts with their sentiment analysis",
      inputSchema: z.object({
        projectId: z.string().describe("The project ID"),
        limit: z.number().default(10).describe("Number of comments to retrieve"),
        sentimiento: z.string().nullable().describe("Filter by sentiment (positivo, neutral, negativo)"),
        tema: z.string().nullable().describe("Filter by topic/tema"),
      }),
      execute: async ({ projectId, limit, sentimiento, tema }) => {
        let query = supabase
          .from("posts")
          .select("id, texto, red_social, fuente, sentimiento, tema, intensidad, fecha, likes")
          .eq("project_id", projectId)
          .order("fecha", { ascending: false })
          .limit(limit)

        if (sentimiento) query = query.eq("sentimiento", sentimiento)
        if (tema) query = query.eq("tema", tema)

        const { data, error } = await query

        if (error) return { error: error.message }
        return data
      },
    }),

    getSentimentByTopic: tool({
      description: "Get sentiment breakdown by topic/tema",
      inputSchema: z.object({
        projectId: z.string().describe("The project ID"),
      }),
      execute: async ({ projectId }) => {
        const { data, error } = await supabase
          .from("posts")
          .select("tema, sentimiento")
          .eq("project_id", projectId)
          .not("tema", "is", null)
          .not("sentimiento", "is", null)

        if (error) return { error: error.message }

        // Group by tema
        const byTopic: Record<string, { positivo: number; neutral: number; negativo: number }> = {}
        
        data?.forEach(post => {
          if (!post.tema) return
          if (!byTopic[post.tema]) {
            byTopic[post.tema] = { positivo: 0, neutral: 0, negativo: 0 }
          }
          if (post.sentimiento === "positivo") byTopic[post.tema].positivo++
          else if (post.sentimiento === "neutral") byTopic[post.tema].neutral++
          else if (post.sentimiento === "negativo") byTopic[post.tema].negativo++
        })

        return byTopic
      },
    }),

    getSentimentBySocialNetwork: tool({
      description: "Get sentiment breakdown by social network",
      inputSchema: z.object({
        projectId: z.string().describe("The project ID"),
      }),
      execute: async ({ projectId }) => {
        const { data, error } = await supabase
          .from("posts")
          .select("red_social, sentimiento")
          .eq("project_id", projectId)
          .not("sentimiento", "is", null)

        if (error) return { error: error.message }

        // Group by red_social
        const byNetwork: Record<string, { positivo: number; neutral: number; negativo: number }> = {}
        
        data?.forEach(post => {
          if (!byNetwork[post.red_social]) {
            byNetwork[post.red_social] = { positivo: 0, neutral: 0, negativo: 0 }
          }
          if (post.sentimiento === "positivo") byNetwork[post.red_social].positivo++
          else if (post.sentimiento === "neutral") byNetwork[post.red_social].neutral++
          else if (post.sentimiento === "negativo") byNetwork[post.red_social].negativo++
        })

        return byNetwork
      },
    }),

    searchComments: tool({
      description: "Search comments by text content",
      inputSchema: z.object({
        projectId: z.string().describe("The project ID"),
        searchTerm: z.string().describe("Text to search for in comments"),
        limit: z.number().default(20).describe("Maximum results to return"),
      }),
      execute: async ({ projectId, searchTerm, limit }) => {
        const { data, error } = await supabase
          .from("posts")
          .select("id, texto, red_social, fuente, sentimiento, tema, fecha")
          .eq("project_id", projectId)
          .ilike("texto", `%${searchTerm}%`)
          .order("fecha", { ascending: false })
          .limit(limit)

        if (error) return { error: error.message }
        return data
      },
    }),
  }

  const result = streamText({
    model: "openai/gpt-4o",
    system: `Sos un asistente de análisis de sentimiento para la plataforma Coros. 
Tu rol es ayudar a los usuarios a entender los datos de análisis de sentimiento de sus proyectos.

IMPORTANTE:
- Solo podés responder preguntas basándote en los datos de la base de datos del proyecto.
- NO inventés información ni datos que no provengan de las herramientas.
- Si no hay datos disponibles, informá al usuario que no hay datos para analizar.
- Respondé siempre en español.
- Sé conciso y directo en tus respuestas.
- Cuando muestres números, usá el formato adecuado (porcentajes, totales, etc.).

El proyecto actual tiene ID: ${projectId}`,
    messages: await convertToModelMessages(messages),
    tools,
    maxSteps: 5,
  })

  return result.toUIMessageStreamResponse()
}
