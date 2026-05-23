interface Comment {
  text: string
  source: string
  sentiment: "Positivo" | "Negativo" | "Neutral"
  topic: string
  analysisType: "LLM" | "NLP"
}

interface CommentCardProps {
  comment: Comment
}

export function CommentCard({ comment }: CommentCardProps) {
  return (
    <div className="border border-border bg-background p-4">
      <p className="text-sm text-foreground">{`"${comment.text}"`}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {comment.source} - {comment.sentiment} - {comment.topic}
        </span>
        <span className="text-xs text-muted-foreground">{comment.analysisType}</span>
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
      {/* Section Header */}
      <h2 className="text-sm font-normal underline underline-offset-4">
        Últimos comentarios en redes sociales
      </h2>

      {/* Comments */}
      <div className="space-y-3">
        {comments.map((comment, index) => (
          <CommentCard key={index} comment={comment} />
        ))}
      </div>
    </div>
  )
}

export type { Comment }
