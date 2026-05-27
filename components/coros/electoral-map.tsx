"use client"

import { useEffect, useRef, useState } from "react"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Agrupacion {
  id: string
  nombre: string
  votos: number
  porcentaje: number
}

interface ParsedData {
  meta: {
    electores: number | null
    votantes: number | null
    mesasEscrutadas: number | null
    mesasTotales: number | null
    participacion: string | null
  }
  agrupaciones: Agrupacion[]
  totalVotos: number
}

interface CircuitoData {
  parsed: ParsedData
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const CIRCUITOS: Record<string, { nombre: string; lat: number; lng: number; zoom: number }> = {
  "":      { nombre: "Tigre (sección completa)", lat: -34.426, lng: -58.579, zoom: 12 },
  "00530": { nombre: "Tigre Centro",             lat: -34.427, lng: -58.577, zoom: 14 },
  "0534A": { nombre: "Benavídez",                lat: -34.394, lng: -58.681, zoom: 13 },
  "00535": { nombre: "Don Torcuato",             lat: -34.474, lng: -58.614, zoom: 13 },
  "00534": { nombre: "El Talar",                 lat: -34.453, lng: -58.640, zoom: 13 },
  "00536": { nombre: "General Pacheco",          lat: -34.460, lng: -58.659, zoom: 13 },
  "0535A": { nombre: "Ricardo Rojas",            lat: -34.443, lng: -58.592, zoom: 13 },
  "0536A": { nombre: "Rincón de Milberg",        lat: -34.400, lng: -58.598, zoom: 13 },
  "00533": { nombre: "Dique Luján",              lat: -34.384, lng: -58.625, zoom: 13 },
}

const PARTY_COLORS: Record<string, string> = {
  "UNION POR LA PATRIA":                              "#58a6ff",
  "JUNTOS POR EL CAMBIO":                             "#f7c948",
  "LA LIBERTAD AVANZA":                               "#d2a8ff",
  "FRENTE DE IZQUIERDA Y DE TRABAJADORES - UNIDAD":  "#f78166",
}

const API_BASE = "https://resultados.mininterior.gob.ar/api/resultados/getResultados"
const BASE_PARAMS = {
  anioEleccion: 2023,
  tipoRecuento: 1,
  tipoEleccion: 2,
  categoriaId: 7,
  distritoId: 2,
  seccionId: 113,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function partyColor(nombre: string) {
  return PARTY_COLORS[nombre] ?? "#8b949e"
}

function fmt(n: number | null | undefined) {
  if (n === null || n === undefined) return "—"
  return Number(n).toLocaleString("es-AR")
}

function escHtml(str: string) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function safeInt(v: unknown): number | null {
  const n = parseInt(String(v), 10)
  return isNaN(n) ? null : n
}

function parseResultados(json: Record<string, unknown>): ParsedData {
  const estado = (json?.estadoRecuento ?? {}) as Record<string, unknown>
  const meta = {
    electores:       safeInt(estado.cantidadElectores),
    votantes:        safeInt(estado.cantidadVotantes),
    mesasEscrutadas: safeInt(estado.mesasTotalizadas),
    mesasTotales:    safeInt(estado.mesasTotalizadas),
    participacion:   estado.participacionPorcentaje
                       ? parseFloat(String(estado.participacionPorcentaje)).toFixed(2)
                       : null,
  }
  const raw = (json?.valoresTotalizadosPositivos ?? []) as Record<string, unknown>[]
  const agrupaciones: Agrupacion[] = []
  for (const ag of raw) {
    const votos = safeInt(ag?.votos)
    if (votos === null) continue
    agrupaciones.push({
      id:         String(ag?.idAgrupacion ?? "?"),
      nombre:     String(ag?.nombreAgrupacion ?? "Sin nombre"),
      votos,
      porcentaje: parseFloat(String(ag?.votosPorcentaje ?? 0)),
    })
  }
  agrupaciones.sort((a, b) => b.votos - a.votos)
  const totalVotos = agrupaciones.reduce((s, a) => s + a.votos, 0)
  for (const ag of agrupaciones)
    if (!ag.porcentaje && totalVotos > 0)
      ag.porcentaje = parseFloat(((ag.votos / totalVotos) * 100).toFixed(2))
  return { meta, agrupaciones, totalVotos }
}

function buildPopupHTML(cid: string, parsed: ParsedData, featureName?: string): string {
  const ci = CIRCUITOS[cid] ?? CIRCUITOS[""]
  const title = featureName ?? ci.nombre
  const { meta, agrupaciones, totalVotos } = parsed

  let partHTML = ""
  if (meta.participacion) {
    partHTML = `<div class="em-popup-total">
      Electores: <b>${fmt(meta.electores)}</b> ·
      Votantes: <b>${fmt(meta.votantes)}</b> ·
      Participación: <b>${meta.participacion}%</b>
    </div>`
  } else if (totalVotos) {
    partHTML = `<div class="em-popup-total">Total votos: <b>${fmt(totalVotos)}</b></div>`
  }

  let rows = ""
  agrupaciones.forEach(ag => {
    const color = partyColor(ag.nombre)
    const pct = ag.porcentaje.toFixed(1)
    rows += `
      <div class="em-party-row">
        <span class="em-dot" style="background:${color}"></span>
        <span class="em-party-name">${escHtml(ag.nombre)}</span>
        <span class="em-party-votes">${fmt(ag.votos)}</span>
        <span class="em-party-pct" style="color:${color}">${pct}%</span>
      </div>
      <div class="em-bar-wrap">
        <div class="em-bar-fill" style="width:${Math.min(parseFloat(pct), 100)}%;background:${color}"></div>
      </div>`
  })

  const mesas = (meta.mesasEscrutadas && meta.mesasTotales)
    ? `<div class="em-mesas">Mesas: ${meta.mesasEscrutadas}/${meta.mesasTotales}</div>` : ""

  return `
    <div class="em-popup-title">${escHtml(title)}</div>
    <div class="em-popup-sub">Generales 2023 · Intendente</div>
    ${partHTML}
    ${rows || '<p class="em-no-data">Sin datos</p>'}
    ${mesas}`
}

function circuitStyle(cid: string, data: Record<string, CircuitoData>, highlight = false) {
  const d = data[cid]
  if (!d || !d.parsed.agrupaciones.length)
    return { fillColor: "#333", weight: 1, color: "#555", fillOpacity: 0.25 }
  const winner = d.parsed.agrupaciones[0]
  const color = partyColor(winner.nombre)
  const opacity = 0.45 + Math.min((winner.porcentaje - 35) / 100, 0.35)
  return {
    fillColor: color,
    weight: highlight ? 3 : 1.5,
    color: highlight ? "#fff" : "rgba(255,255,255,0.4)",
    fillOpacity: highlight ? Math.min(opacity + 0.15, 0.92) : opacity,
  }
}

// ─── Demo data ────────────────────────────────────────────────────────────────

function makeDemoData(): Record<string, CircuitoData> {
  const DEMO = [
    { id: "135", nombre: "UNION POR LA PATRIA",                             votos: 52300, porcentaje: 42.5 },
    { id: "136", nombre: "JUNTOS POR EL CAMBIO",                            votos: 35800, porcentaje: 29.1 },
    { id: "137", nombre: "LA LIBERTAD AVANZA",                              votos: 22100, porcentaje: 17.9 },
    { id: "138", nombre: "FRENTE DE IZQUIERDA Y DE TRABAJADORES - UNIDAD",  votos: 5400,  porcentaje: 4.4  },
  ]
  const result: Record<string, CircuitoData> = {}
  for (const [key] of Object.entries(CIRCUITOS)) {
    if (key === "") continue
    const factor = 0.8 + Math.random() * 0.4
    const ags: Agrupacion[] = DEMO.map(ag => ({ ...ag, votos: Math.round(ag.votos * factor * 0.12) }))
    ags.sort((a, b) => b.votos - a.votos)
    const total = ags.reduce((s, a) => s + a.votos, 0)
    ags.forEach(ag => { ag.porcentaje = parseFloat(((ag.votos / total) * 100).toFixed(2)) })
    result[key] = {
      parsed: {
        meta: { electores: 280000, votantes: 123180, participacion: "43.99", mesasEscrutadas: 420, mesasTotales: 480 },
        agrupaciones: ags,
        totalVotos: total,
      }
    }
  }
  return result
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ElectoralMap() {
  const mapRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<"loading" | "demo" | "ready">("loading")
  const [loadMsg, setLoadMsg] = useState("Inicializando mapa…")

  // Datos para la leyenda (fuera del mapa)
  const [legendItems, setLegendItems] = useState<Agrupacion[]>([])

  // Filtros del mapa mostrados como chips encima
  const [filters, setFilters] = useState<{ label: string; active: boolean }[]>([
    { label: "Tigre Centro", active: false },
    { label: "Benavídez",    active: false },
    { label: "Don Torcuato", active: false },
    { label: "El Talar",     active: false },
    { label: "Gral. Pacheco",active: false },
    { label: "Rincón",       active: false },
  ])

  useEffect(() => {
    if (!mapRef.current) return
    let cancelled = false

    // Leaflet sólo existe en el browser; importamos dinámicamente
    ;(async () => {
      const L = (await import("leaflet")).default
      // Fix de los íconos por defecto que rompen en Next.js
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      })

      if (cancelled || !mapRef.current) return

      const map = L.map(mapRef.current, {
        center: [-34.426, -58.579],
        zoom: 12,
        zoomControl: false,
        attributionControl: true,
      })
      L.control.zoom({ position: "topright" }).addTo(map)
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; CARTO &copy; OpenStreetMap",
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map)

      // Carga GeoJSON
      let geojson: GeoJSON.FeatureCollection | null = null
      try {
        const r = await fetch("/tigre_circuitos.geojson")
        geojson = await r.json()
      } catch {
        console.warn("[ElectoralMap] no se pudo cargar el GeoJSON")
      }

      // Carga datos electorales
      let circuitosData: Record<string, CircuitoData> = {}
      try {
        setLoadMsg("Cargando resultados electorales…")
        const keys = Object.keys(CIRCUITOS).filter(k => k !== "")
        let loaded = 0
        const entries = await Promise.all(
          keys.map(async key => {
            const params = { ...BASE_PARAMS, circuitoId: key }
            const qs = new URLSearchParams(
              Object.entries(params).map(([k, v]) => [k, String(v)])
            ).toString()
            const ctrl = new AbortController()
            const tid = setTimeout(() => ctrl.abort(), 12000)
            try {
              const res = await fetch(`${API_BASE}?${qs}`, {
                headers: { Accept: "application/json" },
                signal: ctrl.signal,
              })
              clearTimeout(tid)
              if (!res.ok) throw new Error(`HTTP ${res.status}`)
              const json = await res.json()
              loaded++
              setLoadMsg(`Cargando circuitos… ${loaded}/${keys.length}`)
              return [key, { parsed: parseResultados(json) }] as [string, CircuitoData]
            } catch {
              clearTimeout(tid)
              return null
            }
          })
        )
        const valid = entries.filter((e): e is [string, CircuitoData] =>
          e !== null && e[1].parsed.agrupaciones.length > 0
        )
        circuitosData = Object.fromEntries(valid)
      } catch {
        // silencio — pasamos a demo
      }

      if (cancelled) return

      // Si la API falla o devuelve vacío, usar demo data
      const isDemo = Object.keys(circuitosData).length === 0
      if (isDemo) {
        circuitosData = makeDemoData()
        setStatus("demo")
      } else {
        setStatus("ready")
      }

      // Calcular leyenda global
      const totals: Record<string, number> = {}
      for (const { parsed } of Object.values(circuitosData))
        for (const ag of parsed.agrupaciones)
          totals[ag.nombre] = (totals[ag.nombre] ?? 0) + ag.votos
      const totalGlobal = Object.values(totals).reduce((s, v) => s + v, 0)
      const legendAgs = Object.entries(totals)
        .map(([nombre, votos]) => ({
          id: nombre, nombre, votos,
          porcentaje: (votos / totalGlobal) * 100,
        }))
        .sort((a, b) => b.votos - a.votos)
      setLegendItems(legendAgs)

      // Renderizar coroplético
      if (geojson) {
        let layer: ReturnType<typeof L.geoJSON>

        const sorted = [...geojson.features].sort((a, b) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((a.properties as any)?.circuito_id === "00530") return -1
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((b.properties as any)?.circuito_id === "00530") return 1
          return 0
        })

        layer = L.geoJSON({ ...geojson, features: sorted }, {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          style: (feature: any) =>
            circuitStyle(feature?.properties?.circuito_id, circuitosData),

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onEachFeature: (feature: any, fl: any) => {
            const cid: string = feature?.properties?.circuito_id
            const d = circuitosData[cid]
            const featureName: string = feature?.properties?.nombre ?? cid

            if (d) {
              fl.bindPopup(
                L.popup({ maxWidth: 340 }).setContent(
                  buildPopupHTML(cid, d.parsed, featureName)
                ),
                { autoPan: true }
              )
            }

            fl.on("mouseover", function (this: typeof fl) {
              this.setStyle(circuitStyle(cid, circuitosData, true))
              this.bringToFront()
              const winner = d?.parsed.agrupaciones[0]
              this.bindTooltip(
                `<b>${escHtml(featureName)}</b>${winner ? `<br>${escHtml(winner.nombre)}: ${winner.porcentaje.toFixed(1)}%` : ""}`,
                { sticky: true, direction: "top" }
              ).openTooltip()
            })
            fl.on("mouseout", function (this: typeof fl) {
              layer.resetStyle(this)
              this.closeTooltip()
            })
          },
        }).addTo(map)
      }

      map.flyTo([-34.426, -58.579], 12, { duration: 1 })
    })()

    return () => { cancelled = true }
  }, [])

  return (
    <div className="flex flex-col h-full w-full">
      {/* Título y filtros */}
      <div className="px-1 pb-3">
        <h2 className="text-sm font-normal underline underline-offset-4 mb-1">Mapa</h2>
        <p className="text-xs text-muted-foreground mb-3">Elecciones 2023</p>

        {/* Chips de filtro — meramente decorativos / preparados para interacción futura */}
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f, i) => (
            <button
              key={i}
              onClick={() =>
                setFilters(prev =>
                  prev.map((x, j) => j === i ? { ...x, active: !x.active } : x)
                )
              }
              className={`px-2.5 py-0.5 text-xs rounded-sm border transition-colors duration-150 ${
                f.active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenedor del mapa */}
      <div className="relative flex-1 rounded-lg overflow-hidden border border-border min-h-[420px]">
        {/* Loading overlay */}
        {status === "loading" && (
          <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-foreground" />
            <p className="text-xs text-muted-foreground">{loadMsg}</p>
          </div>
        )}

        {/* Demo notice */}
        {status === "demo" && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[500] px-3 py-1.5 rounded-md border border-amber-500/40 bg-amber-950/60 backdrop-blur-sm text-amber-400 text-xs pointer-events-none">
            ⚠ Datos de ejemplo — API no disponible
          </div>
        )}

        {/* El div donde Leaflet monta el mapa */}
        <div ref={mapRef} className="h-full w-full" />
      </div>

      {/* Leyenda de partidos */}
      {legendItems.length > 0 && (
        <div className="mt-4 space-y-1">
          {legendItems.slice(0, 6).map(ag => (
            <div key={ag.id} className="flex items-center gap-2 text-xs">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: partyColor(ag.nombre) }}
              />
              <span className="flex-1 truncate text-muted-foreground">
                {ag.nombre.length > 32 ? ag.nombre.slice(0, 30) + "…" : ag.nombre}
              </span>
              <span className="text-foreground font-medium tabular-nums">
                {ag.porcentaje.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* CSS scoped inline para popups de Leaflet (que viven fuera del shadow DOM) */}
      <style>{`
        .em-popup-title  { font-size:.85rem; font-weight:600; margin-bottom:2px; }
        .em-popup-sub    { font-size:.7rem; color:#6e7681; margin-bottom:6px; }
        .em-popup-total  { font-size:.75rem; color:#8b949e; margin-bottom:8px; line-height:1.4; }
        .em-party-row    { display:flex; align-items:center; gap:6px; margin-bottom:2px; font-size:.78rem; }
        .em-dot          { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
        .em-party-name   { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .em-party-votes  { color:#8b949e; }
        .em-party-pct    { font-weight:600; min-width:40px; text-align:right; }
        .em-bar-wrap     { background:#21262d; border-radius:2px; height:3px; margin-bottom:5px; }
        .em-bar-fill     { height:3px; border-radius:2px; transition:width .3s; }
        .em-mesas        { font-size:.7rem; color:#6e7681; margin-top:6px; }
        .em-no-data      { font-size:.78rem; color:#6e7681; }
        .leaflet-popup-content-wrapper { background:#161b22 !important; color:#e6edf3 !important; border:1px solid #30363d; border-radius:8px !important; box-shadow:0 4px 16px rgba(0,0,0,.5) !important; }
        .leaflet-popup-tip             { background:#161b22 !important; }
        .leaflet-popup-content         { margin:12px 14px !important; }
        .leaflet-tooltip               { background:#161b22 !important; color:#e6edf3 !important; border:1px solid #30363d !important; border-radius:6px !important; font-size:.78rem !important; }
      `}</style>
    </div>
  )
}
