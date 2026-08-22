interface TopicSentiment {
  topic: string
  positive: number
  negative: number
}

interface TopicSentimentProps {
  topics: TopicSentiment[]
  title?: string
  subtitle?: string
}

export function TopicSentiment({ topics, title = "Sentimiento por tema", subtitle }: TopicSentimentProps) {
  const maxValue = Math.max(...topics.flatMap((t) => [t.positive, t.negative]), 1)

  const pct = (value: number) => `${Math.round((value / maxValue) * 100)}%`

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div>
        <h2 className="text-sm font-normal underline underline-offset-4">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>

      {/* Topic Bars */}
      <div className="space-y-3">
        {topics.map((topic, index) => (
          <div key={index} className="space-y-1">
            <span className="text-sm text-foreground">{topic.topic}</span>
            {/* Positive bar */}
            <div className="h-3 bg-background transition-all duration-200 hover:shadow-md relative group cursor-pointer">
              <div
                className="h-full bg-claribi-positive rounded-[3px] transition-all duration-200"
                style={{ width: pct(topic.positive) }}
              />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-foreground rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-200">
                Positivo: {topic.positive}
              </span>
            </div>
            {/* Negative bar */}
            <div className="h-3 bg-background transition-all duration-200 hover:shadow-md relative group cursor-pointer">
              <div
                className="h-full bg-claribi-negative rounded-[3px] transition-all duration-200"
                style={{ width: pct(topic.negative) }}
              />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-foreground rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-200">
                Negativo: {topic.negative}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
