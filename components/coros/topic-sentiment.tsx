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
            <div className="h-3 bg-background transition-all duration-200 hover:shadow-md relative group cursor-pointer">
              <div 
                className="h-full bg-coros-positive rounded-[3px] transition-all duration-200" 
                style={{ width: `${Math.min(topic.positive * 10, 100)}%` }}
              />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-foreground rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-200">
                Positive: {topic.positive}
              </span>
            </div>
            {/* Negative bar */}
            <div className="h-3 bg-background transition-all duration-200 hover:shadow-md relative group cursor-pointer">
              <div 
                className="h-full bg-coros-negative rounded-[3px] transition-all duration-200" 
                style={{ width: `${Math.min(topic.negative * 10, 100)}%` }}
              />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-foreground rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-200">
                Negative: {topic.negative}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
