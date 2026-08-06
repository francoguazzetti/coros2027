'use client'

import { useState, useEffect, useRef, KeyboardEvent, DragEvent } from 'react'
import { X, Plus, Pencil, Trash2, ChevronUp, UploadCloud, FileJson } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  getProjectGeography,
  updateProjectGeography,
  uploadGeojson,
} from '@/lib/actions/settings'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Circuit {
  codigo: string
  nombre: string
  lat: number
  lng: number
}

export interface ProjectGeography {
  municipio: string
  distrito_id: number | ''
  seccion_id: number | ''
  center_lat: number | ''
  center_lng: number | ''
  zoom: number | ''
  circuitos: Circuit[]
  geojson_filename?: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_GEO: ProjectGeography = {
  municipio: '',
  distrito_id: '',
  seccion_id: '',
  center_lat: '',
  center_lng: '',
  zoom: '',
  circuitos: [],
  geojson_filename: undefined,
}

const DEFAULT_CIRCUIT: Circuit = { codigo: '', nombre: '', lat: 0, lng: 0 }

// ── Validation helpers ────────────────────────────────────────────────────────

function clampLat(v: string): string | number {
  const n = parseFloat(v)
  if (isNaN(n)) return v
  return Math.min(90, Math.max(-90, n))
}
function clampLng(v: string): string | number {
  const n = parseFloat(v)
  if (isNaN(n)) return v
  return Math.min(180, Math.max(-180, n))
}
function clampZoom(v: string): string | number {
  const n = parseInt(v, 10)
  if (isNaN(n)) return v
  return Math.min(18, Math.max(1, n))
}

function validLat(v: number | ''): boolean {
  return typeof v === 'number' && v >= -90 && v <= 90
}
function validLng(v: number | ''): boolean {
  return typeof v === 'number' && v >= -180 && v <= 180
}
function validZoom(v: number | ''): boolean {
  return typeof v === 'number' && v >= 1 && v <= 18
}
function validId(v: number | ''): boolean {
  return typeof v === 'number' && v > 0
}

function isGeoValid(g: ProjectGeography): boolean {
  return (
    g.municipio.trim() !== '' &&
    validId(g.distrito_id) &&
    validId(g.seccion_id) &&
    validLat(g.center_lat) &&
    validLng(g.center_lng) &&
    validZoom(g.zoom)
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

interface GeographySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
}

export function GeographySheet({ open, onOpenChange, projectId }: GeographySheetProps) {
  const [geo, setGeo] = useState<ProjectGeography>(DEFAULT_GEO)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Circuit inline add
  const [showAddCircuit, setShowAddCircuit] = useState(false)
  const [addCircuit, setAddCircuit] = useState<Circuit>(DEFAULT_CIRCUIT)
  const [editingCircuitIdx, setEditingCircuitIdx] = useState<number | null>(null)
  const [editCircuit, setEditCircuit] = useState<Circuit>(DEFAULT_CIRCUIT)
  const [confirmDeleteCircuitIdx, setConfirmDeleteCircuitIdx] = useState<number | null>(null)

  // GeoJSON dropzone
  const [isDragging, setIsDragging] = useState(false)
  const [geojsonFile, setGeojsonFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      loadGeo()
    }
  }, [open, projectId])

  const loadGeo = async () => {
    setIsLoading(true)
    setMessage(null)
    try {
      const result = await getProjectGeography(projectId)
      if ('error' in result) {
        setMessage({ type: 'error', text: 'No se pudo cargar la configuración geográfica.' })
      } else {
        setGeo(result.data ?? DEFAULT_GEO)
      }
    } catch {
      setMessage({ type: 'error', text: 'No se pudo cargar la configuración geográfica.' })
    } finally {
      setIsLoading(false)
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!isGeoValid(geo)) return
    setIsSaving(true)
    setMessage(null)
    try {
      const result = await updateProjectGeography(projectId, geo)
      if ('error' in result) {
        setMessage({ type: 'error', text: 'Error al guardar la configuración.' })
      } else {
        setMessage({ type: 'success', text: 'Configuración guardada.' })
        setTimeout(() => onOpenChange(false), 1500)
      }
    } catch {
      setMessage({ type: 'error', text: 'Error al guardar la configuración.' })
    } finally {
      setIsSaving(false)
    }
  }

  // ── Circuits ──────────────────────────────────────────────────────────────

  const handleAddCircuit = () => {
    if (!addCircuit.codigo.trim() || !addCircuit.nombre.trim()) return
    setGeo((g) => ({ ...g, circuitos: [...g.circuitos, { ...addCircuit }] }))
    setAddCircuit(DEFAULT_CIRCUIT)
    setShowAddCircuit(false)
  }

  const handleConfirmEditCircuit = () => {
    if (editingCircuitIdx === null) return
    if (!editCircuit.codigo.trim() || !editCircuit.nombre.trim()) return
    setGeo((g) => {
      const updated = [...g.circuitos]
      updated[editingCircuitIdx] = { ...editCircuit }
      return { ...g, circuitos: updated }
    })
    setEditingCircuitIdx(null)
  }

  const handleDeleteCircuit = (idx: number) => {
    setGeo((g) => ({ ...g, circuitos: g.circuitos.filter((_, i) => i !== idx) }))
    setConfirmDeleteCircuitIdx(null)
  }

  // ── GeoJSON dropzone ──────────────────────────────────────────────────────

  const isValidGeoFile = (file: File) =>
    file.name.endsWith('.geojson') || file.name.endsWith('.json')

  const handleFileAccept = (file: File) => {
    if (!isValidGeoFile(file)) {
      setMessage({ type: 'error', text: 'El archivo debe ser .geojson o .json.' })
      return
    }
    setGeojsonFile(file)
    setGeo((g) => ({ ...g, geojson_filename: file.name }))
    setMessage(null)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileAccept(file)
  }

  const handleUploadGeojson = async () => {
    if (!geojsonFile) return
    setIsUploading(true)
    setMessage(null)
    try {
      const result = await uploadGeojson(projectId, geojsonFile)
      if ('error' in result) {
        setMessage({ type: 'error', text: 'Error al subir el archivo GeoJSON.' })
      } else {
        setMessage({ type: 'success', text: 'GeoJSON subido correctamente.' })
        setGeojsonFile(null)
      }
    } catch {
      setMessage({ type: 'error', text: 'Error al subir el archivo GeoJSON.' })
    } finally {
      setIsUploading(false)
    }
  }

  // ── Circuit form renderer ─────────────────────────────────────────────────

  const renderCircuitForm = (
    circuit: Circuit,
    setCircuit: (c: Circuit) => void,
    onConfirm: () => void,
    onCancel: () => void,
    confirmLabel: string
  ) => (
    <div className="space-y-2.5 p-3 border border-border rounded-md bg-muted/30">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Código *</Label>
          <Input
            placeholder="ej. 001"
            value={circuit.codigo}
            onChange={(e) => setCircuit({ ...circuit, codigo: e.target.value })}
            className="text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Nombre *</Label>
          <Input
            placeholder="ej. Circuito Norte"
            value={circuit.nombre}
            onChange={(e) => setCircuit({ ...circuit, nombre: e.target.value })}
            className="text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Latitud</Label>
          <Input
            type="number"
            step="any"
            placeholder="-34.6"
            value={circuit.lat}
            onChange={(e) => setCircuit({ ...circuit, lat: parseFloat(e.target.value) || 0 })}
            className="text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Longitud</Label>
          <Input
            type="number"
            step="any"
            placeholder="-58.4"
            value={circuit.lng}
            onChange={(e) => setCircuit({ ...circuit, lng: parseFloat(e.target.value) || 0 })}
            className="text-sm"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          onClick={onConfirm}
          disabled={!circuit.codigo.trim() || !circuit.nombre.trim()}
          className="transition-all duration-200 hover:scale-102 active:scale-98"
        >
          {confirmLabel}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onCancel}
          className="transition-all duration-200 hover:scale-102 active:scale-98"
        >
          Cancelar
        </Button>
      </div>
    </div>
  )

  // ── Field error helpers ───────────────────────────────────────────────────

  const latError = geo.center_lat !== '' && !validLat(geo.center_lat)
  const lngError = geo.center_lng !== '' && !validLng(geo.center_lng)
  const zoomError = geo.zoom !== '' && !validZoom(geo.zoom)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[420px]">
        <SheetHeader>
          <SheetTitle>Territorio electoral</SheetTitle>
          <SheetDescription>
            Configurá el municipio, los identificadores y el mapa base del proyecto.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 pr-4 -mr-4">
          {isLoading ? (
            <div className="space-y-3 py-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-9 rounded-md bg-muted animate-pulse" aria-hidden="true" />
              ))}
            </div>
          ) : (
            <div className="space-y-6 py-6">

              {/* ── Municipio ─────────────────────────────────────────────── */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Municipio</h4>

                <div className="space-y-1.5">
                  <Label htmlFor="geo-municipio" className="text-xs">
                    Nombre del municipio
                  </Label>
                  <Input
                    id="geo-municipio"
                    placeholder="ej. Partido de La Matanza"
                    value={geo.municipio}
                    onChange={(e) => setGeo((g) => ({ ...g, municipio: e.target.value }))}
                    className="text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="geo-distrito" className="text-xs">
                      ID de distrito
                    </Label>
                    <Input
                      id="geo-distrito"
                      type="number"
                      min={1}
                      placeholder="ej. 270"
                      value={geo.distrito_id}
                      onChange={(e) =>
                        setGeo((g) => ({
                          ...g,
                          distrito_id: e.target.value === '' ? '' : parseInt(e.target.value, 10),
                        }))
                      }
                      className="text-sm"
                    />
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      Identificador en la API del Ministerio del Interior
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="geo-seccion" className="text-xs">
                      ID de sección
                    </Label>
                    <Input
                      id="geo-seccion"
                      type="number"
                      min={1}
                      placeholder="ej. 1"
                      value={geo.seccion_id}
                      onChange={(e) =>
                        setGeo((g) => ({
                          ...g,
                          seccion_id: e.target.value === '' ? '' : parseInt(e.target.value, 10),
                        }))
                      }
                      className="text-sm"
                    />
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      Identificador en la API del Ministerio del Interior
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* ── Centro del mapa ───────────────────────────────────────── */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Centro del mapa</h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="geo-lat" className="text-xs">
                      Latitud
                    </Label>
                    <Input
                      id="geo-lat"
                      type="number"
                      step="any"
                      placeholder="-34.6"
                      value={geo.center_lat}
                      onChange={(e) =>
                        setGeo((g) => ({
                          ...g,
                          center_lat: e.target.value === '' ? '' : parseFloat(e.target.value),
                        }))
                      }
                      onBlur={(e) => {
                        if (e.target.value !== '') {
                          setGeo((g) => ({ ...g, center_lat: clampLat(e.target.value) }))
                        }
                      }}
                      className={cn('text-sm', latError && 'border-destructive focus-visible:ring-destructive')}
                    />
                    {latError && (
                      <p className="text-[11px] text-destructive">Debe estar entre -90 y 90.</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="geo-lng" className="text-xs">
                      Longitud
                    </Label>
                    <Input
                      id="geo-lng"
                      type="number"
                      step="any"
                      placeholder="-58.4"
                      value={geo.center_lng}
                      onChange={(e) =>
                        setGeo((g) => ({
                          ...g,
                          center_lng: e.target.value === '' ? '' : parseFloat(e.target.value),
                        }))
                      }
                      onBlur={(e) => {
                        if (e.target.value !== '') {
                          setGeo((g) => ({ ...g, center_lng: clampLng(e.target.value) }))
                        }
                      }}
                      className={cn('text-sm', lngError && 'border-destructive focus-visible:ring-destructive')}
                    />
                    {lngError && (
                      <p className="text-[11px] text-destructive">Debe estar entre -180 y 180.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="geo-zoom" className="text-xs">
                    Zoom inicial{' '}
                    <span className="text-muted-foreground font-normal">(1 – 18)</span>
                  </Label>
                  <Input
                    id="geo-zoom"
                    type="number"
                    min={1}
                    max={18}
                    step={1}
                    placeholder="12"
                    value={geo.zoom}
                    onChange={(e) =>
                      setGeo((g) => ({
                        ...g,
                        zoom: e.target.value === '' ? '' : parseInt(e.target.value, 10),
                      }))
                    }
                    onBlur={(e) => {
                      if (e.target.value !== '') {
                        setGeo((g) => ({ ...g, zoom: clampZoom(e.target.value) }))
                      }
                    }}
                    className={cn('text-sm w-28', zoomError && 'border-destructive focus-visible:ring-destructive')}
                  />
                  {zoomError && (
                    <p className="text-[11px] text-destructive">Debe estar entre 1 y 18.</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* ── Circuitos ────────────────────────────────────────────── */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Circuitos electorales</h4>
                  {!showAddCircuit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowAddCircuit(true)
                        setEditingCircuitIdx(null)
                        setConfirmDeleteCircuitIdx(null)
                      }}
                      className="h-7 text-xs transition-all duration-200 hover:scale-102"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Agregar
                    </Button>
                  )}
                </div>

                {showAddCircuit &&
                  renderCircuitForm(
                    addCircuit,
                    setAddCircuit,
                    handleAddCircuit,
                    () => {
                      setShowAddCircuit(false)
                      setAddCircuit(DEFAULT_CIRCUIT)
                    },
                    'Agregar circuito'
                  )}

                {geo.circuitos.length === 0 && !showAddCircuit ? (
                  <p className="text-sm text-muted-foreground py-2 text-center">
                    Sin circuitos configurados.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {geo.circuitos.map((circuit, idx) => (
                      <div
                        key={idx}
                        className="rounded-md border border-border overflow-hidden"
                      >
                        {/* Circuit row */}
                        <div
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 group transition-colors duration-150',
                            editingCircuitIdx === idx ? 'bg-muted/50' : 'hover:bg-accent/30'
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{circuit.nombre}</p>
                            <p className="text-[11px] text-muted-foreground font-mono">
                              {circuit.codigo} · {circuit.lat}, {circuit.lng}
                            </p>
                          </div>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                if (editingCircuitIdx === idx) {
                                  setEditingCircuitIdx(null)
                                } else {
                                  setEditingCircuitIdx(idx)
                                  setEditCircuit({ ...circuit })
                                  setConfirmDeleteCircuitIdx(null)
                                  setShowAddCircuit(false)
                                }
                              }}
                              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              aria-label={editingCircuitIdx === idx ? 'Cerrar edición' : `Editar ${circuit.nombre}`}
                            >
                              {editingCircuitIdx === idx ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <Pencil className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() =>
                                setConfirmDeleteCircuitIdx(
                                  confirmDeleteCircuitIdx === idx ? null : idx
                                )
                              }
                              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                              aria-label={`Eliminar ${circuit.nombre}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Delete confirmation */}
                        {confirmDeleteCircuitIdx === idx && (
                          <div className="flex items-center justify-between px-3 py-2 bg-destructive/8 border-t border-destructive/20">
                            <p className="text-xs text-destructive">
                              ¿Eliminar <strong>{circuit.nombre}</strong>?
                            </p>
                            <div className="flex gap-1.5">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteCircuit(idx)}
                                className="h-6 text-xs px-2 transition-all duration-200 hover:scale-102 active:scale-98"
                              >
                                Sí, eliminar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setConfirmDeleteCircuitIdx(null)}
                                className="h-6 text-xs px-2"
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Edit form */}
                        {editingCircuitIdx === idx && (
                          <div className="border-t border-border p-3">
                            {renderCircuitForm(
                              editCircuit,
                              setEditCircuit,
                              handleConfirmEditCircuit,
                              () => setEditingCircuitIdx(null),
                              'Guardar cambios'
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* ── GeoJSON ──────────────────────────────────────────────── */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium">Polígonos GeoJSON</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Cargá un archivo GeoJSON con los polígonos de los circuitos para mostrarlos
                    sobre el mapa.
                  </p>
                </div>

                {/* Dropzone */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Zona de carga de archivo GeoJSON"
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
                  className={cn(
                    'border-2 border-dashed rounded-md px-4 py-6 flex flex-col items-center gap-2 cursor-pointer transition-colors duration-150 select-none',
                    isDragging
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-muted/40'
                  )}
                >
                  {geojsonFile || geo.geojson_filename ? (
                    <>
                      <FileJson className="h-6 w-6 text-primary" />
                      <p className="text-sm font-medium text-center truncate max-w-full px-2">
                        {geojsonFile ? geojsonFile.name : geo.geojson_filename}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {geojsonFile ? 'Listo para subir · ' : 'Archivo actual · '}
                        Clic para reemplazar
                      </p>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-6 w-6 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground text-center">
                        Arrastrá un archivo o hacé clic para seleccionar
                      </p>
                      <p className="text-xs text-muted-foreground">.geojson · .json</p>
                    </>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".geojson,.json"
                  className="sr-only"
                  aria-hidden="true"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileAccept(file)
                    e.target.value = ''
                  }}
                />

                {geojsonFile && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleUploadGeojson}
                      disabled={isUploading}
                      className="transition-all duration-200 hover:scale-102 active:scale-98"
                    >
                      {isUploading ? 'Subiendo...' : 'Subir GeoJSON'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setGeojsonFile(null)
                        setGeo((g) => ({ ...g, geojson_filename: undefined }))
                      }}
                      disabled={isUploading}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Empty state (only when nothing is configured at all) */}
              {!isLoading &&
                !geo.municipio &&
                !geo.distrito_id &&
                !geo.seccion_id &&
                geo.circuitos.length === 0 && (
                  <div className="py-4 text-center space-y-1.5">
                    <p className="text-xs text-muted-foreground max-w-[280px] mx-auto leading-relaxed">
                      Sin configuración geográfica, el mapa electoral no se puede mostrar. Completá
                      al menos el municipio, los IDs y las coordenadas del centro.
                    </p>
                  </div>
                )}
            </div>
          )}
        </ScrollArea>

        <SheetFooter className="pt-4">
          {message && (
            <p
              className={cn(
                'text-sm mr-auto',
                message.type === 'success' ? 'text-coros-positive' : 'text-coros-negative'
              )}
            >
              {message.text}
            </p>
          )}
          <Button
            onClick={handleSave}
            disabled={isSaving || isLoading || !isGeoValid(geo)}
            className="transition-all duration-200 hover:scale-102 active:scale-98"
          >
            {isSaving ? 'Guardando...' : 'Guardar configuración'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
