interface TopicSentiment {
  topic: string
  positive: number
  negative: number
}

interface TopicSentimentProps {
  topics: TopicSentiment[]
}

export function TopicSentiment({ topics }: TopicSentimentProps) {
  return (
    <div className="space-y-4">
      {/* Section Header */}
      <h2 className="text-sm font-normal underline underline-offset-4">
        Sentimiento por tema
      </h2>

      {/* Topic Bars */}
      <div className="space-y-3">
        {topics.map((topic, index) => {
          const total = topic.positive + topic.negative
          const positivePercent = total > 0 ? (topic.positive / total) * 100 : 50
          const negativePercent = total > 0 ? (topic.negative / total) * 100 : 50

          return (
            <div key={index} className="flex items-center gap-4">
              <span className="w-20 text-sm text-foreground">{topic.topic}</span>
              <div className="flex h-4 flex-1 border border-border">
                <div 
                  className="h-full bg-coros-positive" 
                  style={{ width: `${positivePercent}%` }}
                />
                <div 
                  className="h-full bg-coros-negative" 
                  style={{ width: `${negativePercent}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
