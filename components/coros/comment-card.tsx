type SentimentLabel = "Positivo" | "Negativo" | "Neutral"

const BADGE_COLORS: Record<SentimentLabel, string> = {
  Positivo: "bg-[#4CAF50]/15 text-[#4CAF50] border-[#4CAF50]/40",
  Neutral:  "bg-[#9E9E9E]/15 text-[#9E9E9E] border-[#9E9E9E]/40",
  Negativo: "bg-[#E53935]/15 text-[#E53935] border-[#E53935]/40",
}

function SentimentBadge({ label }: { label: SentimentLabel }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-[3px] border text-[10px] font-medium ${BADGE_COLORS[label]}`}>
      {label}
    </span>
  )
}

interface Comment {
  text: string
  source: string
  sentiment: SentimentLabel
  topic: string
  analysisType: "LLM" | "NLP"
}

interface CommentCardProps {
  comment: Comment
}

export function CommentCard({ comment }: CommentCardProps) {
  return (
    <div className="border border-border bg-background p-4 rounded-[5px] transition-all duration-200 hover:shadow-md hover:scale-[1.01] hover:-translate-y-1 cursor-pointer">
      <p className="text-sm text-foreground leading-relaxed">{`"${comment.text}"`}</p>
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">{comment.source}</span>
        <SentimentBadge label={comment.sentiment} />
        <span className="text-[10px] px-1.5 py-0.5 rounded-[3px] border border-border text-muted-foreground">
          {comment.topic}
        </span>
      </div>
    </div>
  )
}

interface CommentListProps {
  comments: Comment[]
  viewAllHref?: string
}

export function CommentList({ comments, viewAllHref }: CommentListProps) {
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
      {viewAllHref && comments.length > 0 && (
        <a
          href={viewAllHref}
          className="flex items-center justify-center gap-1.5 w-full py-2 text-xs text-muted-foreground border border-border rounded-[5px] hover:text-foreground hover:border-foreground transition-colors duration-150"
        >
          Ver todos los comentarios
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
          </svg>
        </a>
      )}
    </div>
  )
}

// ---- News articles (articulos_prensa) ----

export interface NewsArticle {
  title: string
  source: string
  tone: SentimentLabel
  tema: string
  url: string | null
}

interface NewsCardProps {
  article: NewsArticle
}

export function NewsCard({ article }: NewsCardProps) {
  const inner = (
    <div className="border border-border bg-background p-4 rounded-[5px] transition-all duration-200 hover:shadow-md hover:scale-[1.01] hover:-translate-y-1 cursor-pointer">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-foreground font-medium leading-relaxed flex-1">{article.title}</p>
        {article.url && (
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5 text-muted-foreground" aria-hidden="true">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">{article.source}</span>
        <SentimentBadge label={article.tone} />
        <span className="text-[10px] px-1.5 py-0.5 rounded-[3px] border border-border text-muted-foreground">
          {article.tema}
        </span>
      </div>
    </div>
  )

  if (article.url) {
    return (
      <a href={article.url} target="_blank" rel="noopener noreferrer" className="block">
        {inner}
      </a>
    )
  }
  return inner
}

interface NewsListProps {
  articles: NewsArticle[]
  viewAllHref?: string
}

export function NewsList({ articles, viewAllHref }: NewsListProps) {
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
      {viewAllHref && articles.length > 0 && (
        <a
          href={viewAllHref}
          className="flex items-center justify-center gap-1.5 w-full py-2 text-xs text-muted-foreground border border-border rounded-[5px] hover:text-foreground hover:border-foreground transition-colors duration-150"
        >
          Ver todas las noticias
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
          </svg>
        </a>
      )}
    </div>
  )
}

export type { Comment }
