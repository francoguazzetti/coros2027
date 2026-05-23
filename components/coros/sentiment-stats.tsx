interface SentimentStatsProps {
  positives: number
  neutrals: number
  negatives: number
}

export function SentimentStats({ positives, neutrals, negatives }: SentimentStatsProps) {
  const total = positives + neutrals + negatives
  const positivePercent = total > 0 ? (positives / total) * 100 : 0
  const neutralPercent = total > 0 ? (neutrals / total) * 100 : 0
  const negativePercent = total > 0 ? (negatives / total) * 100 : 0

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <h2 className="text-sm font-normal underline underline-offset-4">
        Sentimiento general
      </h2>

      {/* Stats Cards */}
      <div className="flex gap-4">
        <div className="flex h-24 w-28 flex-col items-center justify-center border border-border bg-coros-positive">
          <span className="text-xs text-foreground">Positivos</span>
          <span className="text-4xl font-light text-foreground">{positives}</span>
        </div>
        <div className="flex h-24 w-28 flex-col items-center justify-center border border-border bg-coros-neutral">
          <span className="text-xs text-foreground">Neutrales</span>
          <span className="text-4xl font-light text-foreground">{neutrals}</span>
        </div>
        <div className="flex h-24 w-28 flex-col items-center justify-center border border-border bg-coros-negative">
          <span className="text-xs text-foreground">Negativos</span>
          <span className="text-4xl font-light text-foreground">{negatives}</span>
        </div>
      </div>

      {/* Combined Bar */}
      <div className="flex h-4 w-full border border-border">
        <div 
          className="h-full bg-coros-positive" 
          style={{ width: `${positivePercent}%` }}
        />
        <div 
          className="h-full bg-coros-neutral" 
          style={{ width: `${neutralPercent}%` }}
        />
        <div 
          className="h-full bg-coros-negative" 
          style={{ width: `${negativePercent}%` }}
        />
      </div>
    </div>
  )
}
