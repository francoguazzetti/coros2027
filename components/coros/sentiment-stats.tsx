"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { type DateRange } from "@/lib/data"

const DATE_RANGE_OPTIONS: { label: string; value: DateRange }[] = [
  { label: "24hs", value: "24h" },
  { label: "7 días", value: "7d" },
  { label: "30 días", value: "30d" },
  { label: "Todo", value: "all" },
]

interface SentimentStatsProps {
  positives: number
  neutrals: number
  negatives: number
  title?: string
  dateRange?: DateRange
  showDateRange?: boolean
  paramKey?: string
}

export function SentimentStats({
  positives,
  neutrals,
  negatives,
  title = "Sentimiento general",
  dateRange = "all",
  showDateRange = false,
  paramKey = "dateRange",
}: SentimentStatsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const total = positives + neutrals + negatives
  const positivePercent = total > 0 ? (positives / total) * 100 : 0
  const neutralPercent = total > 0 ? (neutrals / total) * 100 : 0
  const negativePercent = total > 0 ? (negatives / total) * 100 : 0

  function handleRangeChange(value: DateRange) {
    const params = new URLSearchParams(searchParams.toString())
    params.set(paramKey, value)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="space-y-4 mb-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-normal underline underline-offset-4">{title}</h2>
        {showDateRange && (
          <div className="flex gap-1">
            {DATE_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleRangeChange(opt.value)}
                className={`px-2 py-0.5 text-xs rounded-[3px] border border-border transition-colors duration-150 cursor-pointer ${
                  dateRange === opt.value
                    ? "bg-foreground text-background"
                    : "bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="flex justify-between mb-[33px]">
        <div className="flex h-24 w-28 flex-col items-center justify-center border border-border bg-coros-positive rounded-[5px] transition-all duration-200 hover:shadow-md hover:scale-[1.01] relative group cursor-pointer">
          <span className="text-xs text-foreground">Positivos</span>
          <span className="text-4xl font-light text-foreground">{positives}</span>
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-foreground rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-200">
            {positives} positivos
          </span>
        </div>
        <div className="flex h-24 w-28 flex-col items-center justify-center border border-border bg-coros-neutral rounded-[5px] transition-all duration-200 hover:shadow-md hover:scale-[1.01] relative group cursor-pointer">
          <span className="text-xs text-foreground">Neutrales</span>
          <span className="text-4xl font-light text-foreground">{neutrals}</span>
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-foreground rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-200">
            {neutrals} neutrales
          </span>
        </div>
        <div className="flex h-24 w-28 flex-col items-center justify-center border border-border bg-coros-negative rounded-[5px] transition-all duration-200 hover:shadow-md hover:scale-[1.01] relative group cursor-pointer">
          <span className="text-xs text-foreground">Negativos</span>
          <span className="text-4xl font-light text-foreground">{negatives}</span>
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-foreground rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-200">
            {negatives} negativos
          </span>
        </div>
      </div>

      {/* Combined Bar */}
      <div className="flex h-4 w-full border border-border rounded-[5px] overflow-hidden transition-all duration-200 hover:shadow-md relative group cursor-pointer">
        <div
          className="h-full bg-coros-positive transition-all duration-200"
          style={{ width: `${positivePercent}%` }}
        />
        <div
          className="h-full bg-coros-neutral transition-all duration-200"
          style={{ width: `${neutralPercent}%` }}
        />
        <div
          className="h-full bg-coros-negative transition-all duration-200"
          style={{ width: `${negativePercent}%` }}
        />
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-foreground rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-200">
          {positivePercent.toFixed(0)}% positivo, {neutralPercent.toFixed(0)}% neutral,{" "}
          {negativePercent.toFixed(0)}% negativo
        </span>
      </div>
    </div>
  )
}
