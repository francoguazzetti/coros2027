"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

export interface SentimentTimelinePoint {
  date: string
  positivo: number
  neutral: number
  negativo: number
}

interface SentimentTimelineProps {
  data: SentimentTimelinePoint[]
}

export function SentimentTimeline({ data }: SentimentTimelineProps) {
  if (data.length === 0) return null

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-normal underline underline-offset-4">
        Evolución del sentimiento
      </h2>

      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: "5px",
                fontSize: "12px",
                color: "var(--color-foreground)",
              }}
              itemStyle={{ color: "var(--color-foreground)" }}
              cursor={{ stroke: "var(--color-border)" }}
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  positivo: "Positivos",
                  neutral: "Neutrales",
                  negativo: "Negativos",
                }
                return [value, labels[name] ?? name]
              }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
              formatter={(value) => {
                const labels: Record<string, string> = {
                  positivo: "Positivos",
                  neutral: "Neutrales",
                  negativo: "Negativos",
                }
                return labels[value] ?? value
              }}
            />
            <Line
              type="monotone"
              dataKey="positivo"
              stroke="#5A8247"
              strokeWidth={2}
              dot={{ r: 3, fill: "#5A8247" }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="neutral"
              stroke="#C8B89A"
              strokeWidth={2}
              dot={{ r: 3, fill: "#C8B89A" }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="negativo"
              stroke="#B25252"
              strokeWidth={2}
              dot={{ r: 3, fill: "#B25252" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
