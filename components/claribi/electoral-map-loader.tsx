"use client"

import dynamic from "next/dynamic"

// Leaflet no es compatible con SSR — importamos el componente sólo en el browser
const ElectoralMap = dynamic(
  () => import("@/components/claribi/electoral-map").then(m => m.ElectoralMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    ),
  }
)

export function ElectoralMapLoader() {
  return <ElectoralMap />
}
