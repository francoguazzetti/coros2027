import { streamText, convertToModelMessages, tool, stepCountIs, consumeStream } from "ai"
import { openai } from "@ai-sdk/openai"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { z } from "zod"

const MODEL_ID = "gpt-4o"

export async function POST(req: Request) {
  const supabase = await createClient()

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  const { messages, projectId } = await req.json()

  if (!projectId) {
    return new Response(JSON.stringify({ error: "projectId is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Verify the user has access to this project via project_members
  const { data: membership } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!membership) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Define tools that query the database
  const tools = {
    // ── Discovery ──────────────────────────────────────────────────────────
    getAvailableFilters: tool({
      description:
        "Returns the distinct topics (tema) and social networks (red_social) that exist in the project's posts. " +
        "Call this first whenever the user asks about a specific topic or source, so you know the exact values to filter by.",
      inputSchema: z.object({
        projectId: z.string().describe("The project ID"),
      }),
      execute: async ({ projectId }) => {
        const { data, error } = await supabase
          .from("posts")
          .select("tema, red_social")
          .eq("project_id", projectId)

        if (error) return { error: "Failed to fetch available filters" }

        const topics = [...new Set(data?.map((p) => p.tema).filter(Boolean))]
        const networks = [...new Set(data?.map((p) => p.red_social).filter(Boolean))]
        return { topics, networks }
      },
    }),

    // ── Aggregations ───────────────────────────────────────────────────────
    getSentimentSummary: tool({
      description:
        "Get total counts of positive, neutral, and negative posts for the project. " +
        "Accepts optional filters: topic, social network, and date range (ISO 8601 strings).",
      inputSchema: z.object({
        projectId: z.string().describe("The project ID"),
        tema: z.string().optional().describe("Filter by exact topic name (use getAvailableFilters first)"),
        redSocial: z.string().optional().describe("Filter by social network (use getAvailableFilters first)"),
        desde: z.string().optional().describe("Start date inclusive, ISO 8601 (e.g. 2024-01-01)"),
        hasta: z.string().optional().describe("End date inclusive, ISO 8601 (e.g. 2024-03-31)"),
      }),
      execute: async ({ projectId, tema, redSocial, desde, hasta }) => {
        let query = supabase
          .from("posts")
          .select("sentimiento")
          .eq("project_id", projectId)
          .not("sentimiento", "is", null)

        if (tema) query = query.eq("tema", tema)
        if (redSocial) query = query.eq("red_social", redSocial)
        if (desde) query = query.gte("fecha", desde)
        if (hasta) query = query.lte("fecha", hasta)

        const { data, error } = await query
        if (error) return { error: "Failed to fetch sentiment summary" }

        const positivo = data?.filter((p) => p.sentimiento === "positivo").length ?? 0
        const neutral = data?.filter((p) => p.sentimiento === "neutral").length ?? 0
        const negativo = data?.filter((p) => p.sentimiento === "negativo").length ?? 0
        const total = data?.length ?? 0

        return { positivo, neutral, negativo, total }
      },
    }),

    getSentimentByTopic: tool({
      description:
        "Get sentiment counts broken down by topic. Accepts optional date range filters.",
      inputSchema: z.object({
        projectId: z.string().describe("The project ID"),
        redSocial: z.string().optional().describe("Optionally restrict to one social network"),
        desde: z.string().optional().describe("Start date inclusive, ISO 8601"),
        hasta: z.string().optional().describe("End date inclusive, ISO 8601"),
      }),
      execute: async ({ projectId, redSocial, desde, hasta }) => {
        let query = supabase
          .from("posts")
          .select("tema, sentimiento")
          .eq("project_id", projectId)
          .not("tema", "is", null)
          .not("sentimiento", "is", null)

        if (redSocial) query = query.eq("red_social", redSocial)
        if (desde) query = query.gte("fecha", desde)
        if (hasta) query = query.lte("fecha", hasta)

        const { data, error } = await query
        if (error) return { error: "Failed to fetch sentiment by topic" }

        const byTopic: Record<string, { positivo: number; neutral: number; negativo: number }> = {}
        data?.forEach((post) => {
          if (!post.tema) return
          if (!byTopic[post.tema]) byTopic[post.tema] = { positivo: 0, neutral: 0, negativo: 0 }
          if (post.sentimiento === "positivo") byTopic[post.tema].positivo++
          else if (post.sentimiento === "neutral") byTopic[post.tema].neutral++
          else if (post.sentimiento === "negativo") byTopic[post.tema].negativo++
        })

        return byTopic
      },
    }),

    getSentimentBySocialNetwork: tool({
      description:
        "Get sentiment counts broken down by social network. Accepts optional topic and date range filters.",
      inputSchema: z.object({
        projectId: z.string().describe("The project ID"),
        tema: z.string().optional().describe("Optionally restrict to one topic"),
        desde: z.string().optional().describe("Start date inclusive, ISO 8601"),
        hasta: z.string().optional().describe("End date inclusive, ISO 8601"),
      }),
      execute: async ({ projectId, tema, desde, hasta }) => {
        let query = supabase
          .from("posts")
          .select("red_social, sentimiento")
          .eq("project_id", projectId)
          .not("sentimiento", "is", null)

        if (tema) query = query.eq("tema", tema)
        if (desde) query = query.gte("fecha", desde)
        if (hasta) query = query.lte("fecha", hasta)

        const { data, error } = await query
        if (error) return { error: "Failed to fetch sentiment by social network" }

        const byNetwork: Record<string, { positivo: number; neutral: number; negativo: number }> = {}
        data?.forEach((post) => {
          if (!byNetwork[post.red_social]) byNetwork[post.red_social] = { positivo: 0, neutral: 0, negativo: 0 }
          if (post.sentimiento === "positivo") byNetwork[post.red_social].positivo++
          else if (post.sentimiento === "neutral") byNetwork[post.red_social].neutral++
          else if (post.sentimiento === "negativo") byNetwork[post.red_social].negativo++
        })

        return byNetwork
      },
    }),

    getSentimentOverTime: tool({
      description:
        "Get how sentiment has evolved over time, grouped by day. Use this for trend questions like " +
        "'how has sentiment changed this month?' or 'what happened last week?'",
      inputSchema: z.object({
        projectId: z.string().describe("The project ID"),
        tema: z.string().optional().describe("Optionally restrict to one topic"),
        redSocial: z.string().optional().describe("Optionally restrict to one social network"),
        desde: z.string().optional().describe("Start date inclusive, ISO 8601"),
        hasta: z.string().optional().describe("End date inclusive, ISO 8601"),
      }),
      execute: async ({ projectId, tema, redSocial, desde, hasta }) => {
        let query = supabase
          .from("posts")
          .select("fecha, sentimiento")
          .eq("project_id", projectId)
          .not("sentimiento", "is", null)
          .order("fecha", { ascending: true })

        if (tema) query = query.eq("tema", tema)
        if (redSocial) query = query.eq("red_social", redSocial)
        if (desde) query = query.gte("fecha", desde)
        if (hasta) query = query.lte("fecha", hasta)

        const { data, error } = await query
        if (error) return { error: "Failed to fetch sentiment over time" }

        // Group by calendar day (YYYY-MM-DD)
        const byDay: Record<string, { positivo: number; neutral: number; negativo: number }> = {}
        data?.forEach((post) => {
          const day = post.fecha?.slice(0, 10)
          if (!day) return
          if (!byDay[day]) byDay[day] = { positivo: 0, neutral: 0, negativo: 0 }
          if (post.sentimiento === "positivo") byDay[day].positivo++
          else if (post.sentimiento === "neutral") byDay[day].neutral++
          else if (post.sentimiento === "negativo") byDay[day].negativo++
        })

        return byDay
      },
    }),

    // ── Post retrieval ─────────────────────────────────────────────────────
    getPosts: tool({
      description:
        "Retrieve individual posts/comments from the project. Use for questions that require reading actual text, " +
        "quoting examples, or when the user asks to see specific comments. Supports filtering by sentiment, topic, " +
        "social network, date range, and free-text search.",
      inputSchema: z.object({
        projectId: z.string().describe("The project ID"),
        limit: z.number().min(1).max(50).default(20).describe("Number of posts to return (max 50)"),
        sentimiento: z.string().optional().describe("Filter by sentiment: positivo, neutral, or negativo"),
        tema: z.string().optional().describe("Filter by exact topic name (use getAvailableFilters first)"),
        redSocial: z.string().optional().describe("Filter by social network (use getAvailableFilters first)"),
        desde: z.string().optional().describe("Start date inclusive, ISO 8601"),
        hasta: z.string().optional().describe("End date inclusive, ISO 8601"),
        busqueda: z.string().optional().describe("Free-text search within post content"),
      }),
      execute: async ({ projectId, limit, sentimiento, tema, redSocial, desde, hasta, busqueda }) => {
        let query = supabase
          .from("posts")
          .select("id, texto, red_social, fuente, sentimiento, tema, justificacion, fecha, likes, tipo")
          .eq("project_id", projectId)
          .order("fecha", { ascending: false })
          .limit(limit)

        if (sentimiento) query = query.eq("sentimiento", sentimiento)
        if (tema) query = query.eq("tema", tema)
        if (redSocial) query = query.eq("red_social", redSocial)
        if (desde) query = query.gte("fecha", desde)
        if (hasta) query = query.lte("fecha", hasta)
        if (busqueda) query = query.ilike("texto", `%${busqueda}%`)

        const { data, error } = await query
        if (error) return { error: "Failed to fetch posts" }
        return data
      },
    }),
  }

  const startedAt = Date.now()

  const result = streamText({
    model: openai(MODEL_ID),
    system: `Sos un asistente de análisis de datos para la plataforma ClariBI.
Tu ÚNICA fuente de información son las herramientas disponibles, que leen la base de datos del proyecto en tiempo real.

ALCANCE — MUY IMPORTANTE:
- Solo respondés preguntas relacionadas con análisis político, electoral o de opinión pública (sentimiento, temas, comentarios, redes sociales, tendencias).
- Si el usuario hace una pregunta fuera de ese ámbito (recetas, código, historia general, matemáticas, etc.), respondé ÚNICAMENTE: "Solo puedo ayudarte con el análisis de datos de este proyecto político. ¿Querés saber algo sobre los comentarios o el sentimiento?"
- No des explicaciones adicionales ni te disculpes extensamente. Solo redirigí.
- Aunque el usuario insista, reformule la pregunta o diga que "es para el proyecto", no respondas temas ajenos al análisis político/electoral de los datos disponibles.

REGLAS DE FILTRADO — MUY IMPORTANTE:
- Solo aplicá filtros (tema, red social, sentimiento, fechas) si el usuario los pidió EXPLÍCITAMENTE en su mensaje.
- Si la pregunta es general (ej: "¿sobre qué tratan los últimos comentarios?"), llamá getPosts SIN filtros.
- Nunca asumas ni inventes filtros. Si no lo pidió el usuario, no lo apliques.
- Nunca inventes datos, temas, redes sociales ni textos que no vengan de las herramientas.

CUÁNDO USAR CADA HERRAMIENTA:
- getAvailableFilters: solo cuando el usuario menciona un tema o red social específica y necesitás verificar el valor exacto.
- getSentimentSummary: totales de positivo/neutral/negativo para el proyecto o con los filtros que el usuario pidió.
- getSentimentByTopic: distribución por tema.
- getSentimentBySocialNetwork: distribución por red social.
- getSentimentOverTime: evolución temporal, tendencias.
- getPosts: leer el contenido real de comentarios, ver ejemplos, responder "¿de qué hablan?".

FORMATO DE RESPUESTA:
- Respondé siempre en español, de forma concisa y directa.
- Usá porcentajes además de totales cuando ayude.
- Si las herramientas no devuelven datos, respondé: "No hay datos disponibles para esta consulta."

Fecha de hoy: ${new Date().toISOString().slice(0, 10)}
Proyecto actual ID: ${projectId}`,
    messages: await convertToModelMessages(messages),
    tools,
    toolChoice: "auto",
    stopWhen: stepCountIs(10),
    onFinish: async ({ totalUsage, finishReason, steps }) => {
      // Written with the service role so a client cannot forge or suppress
      // its own token accounting. Never let this break the chat response.
      const service = createServiceClient()
      if (!service) {
        console.log("[v0] ai_usage_events skipped: no service role key")
        return
      }

      const { error } = await service.from("ai_usage_events").insert({
        user_id: user.id,
        project_id: projectId,
        model: MODEL_ID,
        input_tokens: totalUsage.inputTokens ?? 0,
        output_tokens: totalUsage.outputTokens ?? 0,
        total_tokens:
          totalUsage.totalTokens ??
          (totalUsage.inputTokens ?? 0) + (totalUsage.outputTokens ?? 0),
        cached_input_tokens: totalUsage.inputTokenDetails?.cacheReadTokens ?? 0,
        reasoning_tokens: totalUsage.outputTokenDetails?.reasoningTokens ?? 0,
        steps: steps.length,
        finish_reason: finishReason,
        latency_ms: Date.now() - startedAt,
      })

      if (error) console.log("[v0] ai_usage_events insert failed:", error.message)
    },
  })

  // consumeSseStream keeps onFinish running even if the user closes the tab
  // mid-stream, so we still bill the tokens the model already produced.
  return result.toUIMessageStreamResponse({
    consumeSseStream: ({ stream }) =>
      consumeStream({
        stream,
        onError: (e) => console.log("[v0] usage stream consume error:", e),
      }),
  })
}
