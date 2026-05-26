export interface NewsArticle {
  title: string
  source: string
  tone: "Positivo" | "Negativo" | "Neutral"
  topic: string
  url: string | null
}

interface Comment {
  text: string
  source: string
  sentiment: "Positivo" | "Negativo" | "Neutral"
  topic: string
  analysisType: "LLM" | "NLP"
}

const SENTIMENT_COLORS: Record<string, string> = {
  Positivo: "bg-[#4CAF50]/15 text-[#4CAF50] border-[#4CAF50]/30",
  Negativo: "bg-[#E53935]/15 text-[#E53935] border-[#E53935]/30",
  Neutral:  "bg-[#9E9E9E]/15 text-[#9E9E9E] border-[#9E9E9E]/30",
}

function SentimentBadge({ label }: { label: string }) {
  const cls = SENTIMENT_COLORS[label] ?? SENTIMENT_COLORS["Neutral"]
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-[3px] border ${cls}`}>
      {label}
    </span>
  )
}

interface CommentCardProps {
  comment: Comment
}

export function CommentCard({ comment }: CommentCardProps) {
  return (
    <div className="border border-border bg-background p-4 rounded-[5px] transition-all duration-200 hover:shadow-md hover:scale-[1.01] hover:-translate-y-1 cursor-pointer">
      <p className="text-sm text-foreground leading-relaxed">{`"${comment.text}"`}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground">{comment.source}</span>
          <SentimentBadge label={comment.sentiment} />
          <span className="text-[10px] px-1.5 py-0.5 rounded-[3px] border border-border text-muted-foreground">
            {comment.topic}
          </span>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{comment.analysisType}</span>
      </div>
    </div>
  )
}

interface CommentListProps {
  comments: Comment[]
}

export function CommentList({ comments }: CommentListProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-normal underline underline-offset-4">
        Últimos comentarios en redes sociales
      </h2>
      <div className="space-y-3">
        {comments.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin comentarios recientes.</p>
        ) : (
          comments.map((comment, index) => (
            <CommentCard key={index} comment={comment} />
          ))
        )}
      </div>
    </div>
  )
}

// ---- News (articulos_prensa) ----

interface NewsCardProps {
  article: NewsArticle
}

export function NewsCard({ article }: NewsCardProps) {
  return (
    <div className="border border-border bg-background p-4 rounded-[5px] transition-all duration-200 hover:shadow-md hover:scale-[1.01] hover:-translate-y-1 cursor-pointer">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-foreground leading-relaxed flex-1">{article.title}</p>
        {article.url && (
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors duration-150 mt-0.5"
            aria-label="Abrir artículo"
            onClick={(e) => e.stopPropagation()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
        )}
      </div>
      <div className="mt-3 flex items-center gap-1.5 flex-wrap">
        <span className="text-xs text-muted-foreground">{article.source}</span>
        <SentimentBadge label={article.tone} />
        <span className="text-[10px] px-1.5 py-0.5 rounded-[3px] border border-border text-muted-foreground">
          {article.topic}
        </span>
      </div>
    </div>
  )
}

interface NewsListProps {
  articles: NewsArticle[]
}

export function NewsList({ articles }: NewsListProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-normal underline underline-offset-4">
        Últimas noticias
      </h2>
      <div className="space-y-3">
        {articles.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin noticias recientes.</p>
        ) : (
          articles.map((article, index) => (
            <NewsCard key={index} article={article} />
          ))
        )}
      </div>
    </div>
  )
}

export type { Comment }
