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
        {topics.map((topic, index) => (
          <div key={index} className="space-y-1">
            <span className="text-sm text-foreground">{topic.topic}</span>
            {/* Positive bar */}
            <div className="h-3 bg-background">
              <div 
                className="h-full bg-coros-positive rounded-[3px]" 
                style={{ width: `${Math.min(topic.positive * 10, 100)}%` }}
              />
            </div>
            {/* Negative bar */}
            <div className="h-3 bg-background">
              <div 
                className="h-full bg-coros-negative rounded-[3px]" 
                style={{ width: `${Math.min(topic.negative * 10, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
