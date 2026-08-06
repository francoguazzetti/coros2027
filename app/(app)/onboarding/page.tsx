'use client'

import { useState, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus, Pencil, Trash2, UploadCloud, FileJson, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { Candidate } from '@/components/settings/candidates-sheet'
import type { Circuit, ProjectGeography } from '@/components/settings/geography-sheet'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProjectInfo {
  name: string
  description: string
}

type CandidateForm = Omit<Candidate, 'id'> & { id?: string }

const DEFAULT_CANDIDATE_FORM: CandidateForm = {
  nombre: '',
  tipo: 'propio',
  alias: [],
  color: '#0E4C5C',
  activo: true,
}

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

const TIPO_LABELS: Record<Candidate['tipo'], string> = {
  propio: 'Propio',
  oposicion: 'Oposición',
  partido: 'Partido',
}

const TIPO_BADGE_CLASS: Record<Candidate['tipo'], string> = {
  propio: 'bg-primary/15 text-primary',
  oposicion: 'bg-destructive/15 text-destructive',
  partido: 'bg-muted text-muted-foreground',
}

// ── Geo validation helpers ────────────────────────────────────────────────────

function clampLat(v: string) {
  const n = parseFloat(v)
  return isNaN(n) ? v : Math.min(90, Math.max(-90, n))
}
function clampLng(v: string) {
  const n = parseFloat(v)
  return isNaN(n) ? v : Math.min(180, Math.max(-180, n))
}
function clampZoom(v: string) {
  const n = parseInt(v, 10)
  return isNaN(n) ? v : Math.min(18, Math.max(1, n))
}
function validLat(v: number | '') {
  return typeof v === 'number' && v >= -90 && v <= 90
}
function validLng(v: number | '') {
  return typeof v === 'number' && v >= -180 && v <= 180
}
function validZoom(v: number | '') {
  return typeof v === 'number' && v >= 1 && v <= 18
}
function validId(v: number | '') {
  return typeof v === 'number' && v > 0
}

// ── Step indicator ────────────────────────────────────────────────────────────

const STEPS = ['Proyecto', 'Candidatos', 'Territorio']

function StepIndicator({ current }: { current: number }) {
  return (
    <nav aria-label="Progreso del wizard" className="flex items-center gap-0">
      {STEPS.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'active' : 'pending'
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all duration-200',
                  state === 'done' && 'bg-primary border-primary text-primary-foreground',
                  state === 'active' && 'bg-background border-primary text-primary',
                  state === 'pending' && 'bg-background border-border text-muted-foreground'
                )}
                aria-current={state === 'active' ? 'step' : undefined}
              >
                {state === 'done' ? (
                  <svg
                    viewBox="0 0 12 12"
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <polyline points="1.5,6 4.5,9 10.5,3" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={cn(
                  'text-[11px] font-medium whitespace-nowrap',
                  state === 'active' ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'h-px w-16 mx-2 mb-5 transition-colors duration-300',
                  i < current ? 'bg-primary' : 'bg-border'
                )}
                aria-hidden="true"
              />
            )}
          </div>
        )
      })}
    </nav>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Step 1
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>({ name: '', description: '' })

  // Step 2 — candidates
  const [candidates, setCandidates] = useState<(CandidateForm & { _key: number })[]>([])
  const [showAddCandidate, setShowAddCandidate] = useState(false)
  const [addForm, setAddForm] = useState<CandidateForm>(DEFAULT_CANDIDATE_FORM)
  const [addAliasDraft, setAddAliasDraft] = useState('')
  const [editingCandidateKey, setEditingCandidateKey] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<CandidateForm>(DEFAULT_CANDIDATE_FORM)
  const [editAliasDraft, setEditAliasDraft] = useState('')
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<number | null>(null)
  const [nextKey, setNextKey] = useState(0)

  // Step 3 — geography
  const [geo, setGeo] = useState<ProjectGeography>(DEFAULT_GEO)
  const [showAddCircuit, setShowAddCircuit] = useState(false)
  const [addCircuit, setAddCircuit] = useState<Circuit>(DEFAULT_CIRCUIT)
  const [editingCircuitIdx, setEditingCircuitIdx] = useState<number | null>(null)
  const [editCircuit, setEditCircuit] = useState<Circuit>(DEFAULT_CIRCUIT)
  const [confirmDeleteCircuitIdx, setConfirmDeleteCircuitIdx] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [geojsonFile, setGeojsonFile] = useState<File | null>(null)
  const [geoFileError, setGeoFileError] = useState<string | null>(null)

  // ── Alias helpers ───────────────────────────────────────────────────────────

  const makeAliasKeyDown =
    (
      draft: string,
      form: CandidateForm,
      setForm: (f: CandidateForm) => void,
      setDraft: (v: string) => void
    ) =>
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.nativeEvent.isComposing || e.keyCode === 229) return
      if (e.key === 'Enter' && draft.trim()) {
        e.preventDefault()
        const val = draft.trim()
        if (!form.alias.includes(val)) setForm({ ...form, alias: [...form.alias, val] })
        setDraft('')
      }
    }

  const renderAliasInput = (
    aliases: string[],
    draft: string,
    onDraftChange: (v: string) => void,
    onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void,
    onRemove: (i: number) => void
  ) => (
    <div className="space-y-2">
      <Input
        placeholder="Escribí un alias y presioná Enter"
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        onKeyDown={onKeyDown}
        className="text-sm"
      />
      <div className="flex flex-wrap gap-1.5 min-h-[24px]">
        {aliases.map((alias, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-muted rounded-full"
          >
            {alias}
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="hover:text-destructive transition-colors"
              aria-label={`Eliminar alias ${alias}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {aliases.length === 0 && (
          <p className="text-xs text-muted-foreground">Sin alias todavía.</p>
        )}
      </div>
    </div>
  )

  const renderCandidateForm = (
    form: CandidateForm,
    setForm: (f: CandidateForm) => void,
    aliasDraft: string,
    setAliasDraft: (v: string) => void,
    onConfirm: () => void,
    onCancel: () => void,
    confirmLabel: string
  ) => {
    const aliasKeyDown = makeAliasKeyDown(aliasDraft, form, setForm, setAliasDraft)
    return (
      <div className="space-y-3 p-3 border border-border rounded-md bg-muted/30">
        <div className="space-y-1.5">
          <Label className="text-xs">Nombre *</Label>
          <Input
            placeholder="ej. Fernández"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            className="text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo</Label>
            <Select
              value={form.tipo}
              onValueChange={(v) => setForm({ ...form, tipo: v as Candidate['tipo'] })}
            >
              <SelectTrigger className="text-sm h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="propio">Propio</SelectItem>
                <SelectItem value="oposicion">Oposición</SelectItem>
                <SelectItem value="partido">Partido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Color</Label>
            <div className="flex items-center gap-2 h-9">
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="h-7 w-7 rounded cursor-pointer border border-border bg-transparent"
                aria-label="Seleccionar color"
              />
              <span className="text-xs text-muted-foreground font-mono">{form.color}</span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">
            Alias{' '}
            <span className="text-muted-foreground font-normal">
              — variantes de nombre para el clasificador
            </span>
          </Label>
          {renderAliasInput(
            form.alias,
            aliasDraft,
            setAliasDraft,
            aliasKeyDown,
            (i) => setForm({ ...form, alias: form.alias.filter((_, idx) => idx !== i) })
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              id={`activo-${confirmLabel}`}
              checked={form.activo}
              onCheckedChange={(v) => setForm({ ...form, activo: v })}
            />
            <Label htmlFor={`activo-${confirmLabel}`} className="text-xs cursor-pointer">
              Activo
            </Label>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={onConfirm}
              disabled={!form.nombre.trim()}
            >
              {confirmLabel}
            </Button>
            <Button size="sm" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Candidate handlers ──────────────────────────────────────────────────────

  const handleAddCandidate = () => {
    if (!addForm.nombre.trim()) return
    setCandidates((prev) => [...prev, { ...addForm, _key: nextKey }])
    setNextKey((k) => k + 1)
    setAddForm(DEFAULT_CANDIDATE_FORM)
    setAddAliasDraft('')
    setShowAddCandidate(false)
  }

  const openEditCandidate = (key: number) => {
    const c = candidates.find((c) => c._key === key)
    if (!c) return
    setEditForm({ ...c })
    setEditAliasDraft('')
    setEditingCandidateKey(key)
    setConfirmDeleteKey(null)
    setShowAddCandidate(false)
  }

  const handleConfirmEditCandidate = () => {
    if (!editForm.nombre.trim() || editingCandidateKey === null) return
    setCandidates((prev) =>
      prev.map((c) => (c._key === editingCandidateKey ? { ...editForm, _key: c._key } : c))
    )
    setEditingCandidateKey(null)
  }

  const handleDeleteCandidate = (key: number) => {
    setCandidates((prev) => prev.filter((c) => c._key !== key))
    setConfirmDeleteKey(null)
  }

  // ── Circuit handlers ────────────────────────────────────────────────────────

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
        >
          {confirmLabel}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  )

  // ── GeoJSON dropzone ────────────────────────────────────────────────────────

  const handleFileAccept = (file: File) => {
    if (!file.name.endsWith('.geojson') && !file.name.endsWith('.json')) {
      setGeoFileError('El archivo debe ser .geojson o .json.')
      return
    }
    setGeojsonFile(file)
    setGeo((g) => ({ ...g, geojson_filename: file.name }))
    setGeoFileError(null)
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  const canAdvanceStep1 = projectInfo.name.trim().length > 0

  const handleFinish = async () => {
    setIsSubmitting(true)
    // Server actions are assumed to exist; here we only navigate
    // In production: await createProject(projectInfo), await upsertProjectCandidates(...), etc.
    try {
      // Simulate async; replace with real action calls
      await new Promise((r) => setTimeout(r, 600))
      router.push('/projects')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Geo field errors ────────────────────────────────────────────────────────

  const latError = geo.center_lat !== '' && !validLat(geo.center_lat)
  const lngError = geo.center_lng !== '' && !validLng(geo.center_lng)
  const zoomError = geo.zoom !== '' && !validZoom(geo.zoom)

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-12 px-4">
      {/* Shell */}
      <div className="w-full max-w-xl">

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Configurar proyecto
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Completá los datos para empezar a monitorear tu campaña.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex justify-center mb-8">
          <StepIndicator current={step} />
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-md overflow-hidden">

          {/* ── STEP 1: Proyecto ──────────────────────────────────────────── */}
          {step === 0 && (
            <div className="p-6 space-y-5">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold">Información del proyecto</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Nombrá tu proyecto. Podés cambiarlo después desde la configuración.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="project-name" className="text-xs">
                  Nombre del proyecto *
                </Label>
                <Input
                  id="project-name"
                  placeholder="ej. Campaña Municipales 2027"
                  value={projectInfo.name}
                  onChange={(e) => setProjectInfo((p) => ({ ...p, name: e.target.value }))}
                  className="text-sm"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="project-desc" className="text-xs">
                  Descripción{' '}
                  <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Textarea
                  id="project-desc"
                  placeholder="Breve descripción del proyecto o la campaña."
                  value={projectInfo.description}
                  onChange={(e) => setProjectInfo((p) => ({ ...p, description: e.target.value }))}
                  className="text-sm resize-none"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* ── STEP 2: Candidatos ────────────────────────────────────────── */}
          {step === 1 && (
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold">Candidatos y actores</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Agregá los candidatos que la plataforma tiene que monitorear. Los{' '}
                  <strong>alias</strong> son variantes del nombre (apodos, apellidos, siglas) que el
                  clasificador usa para detectar menciones en noticias y redes.
                </p>
              </div>

              {/* Add button / form */}
              {!showAddCandidate ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddCandidate(true)
                    setEditingCandidateKey(null)
                    setConfirmDeleteKey(null)
                  }}
                  className="w-full"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Agregar candidato
                </Button>
              ) : (
                renderCandidateForm(
                  addForm,
                  setAddForm,
                  addAliasDraft,
                  setAddAliasDraft,
                  handleAddCandidate,
                  () => {
                    setShowAddCandidate(false)
                    setAddForm(DEFAULT_CANDIDATE_FORM)
                    setAddAliasDraft('')
                  },
                  'Agregar'
                )
              )}

              {candidates.length > 0 && <Separator />}

              {/* Candidate list */}
              {candidates.length === 0 && !showAddCandidate ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    No hay candidatos. Podés agregarlos ahora o más tarde desde la configuración.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {candidates.map((candidate) => (
                    <div
                      key={candidate._key}
                      className="rounded-md border border-border overflow-hidden"
                    >
                      <div
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 group transition-colors duration-150',
                          editingCandidateKey === candidate._key
                            ? 'bg-muted/50'
                            : 'hover:bg-accent/30'
                        )}
                      >
                        <span
                          className="h-3 w-3 rounded-full flex-shrink-0 border border-border/50"
                          style={{ backgroundColor: candidate.color }}
                          aria-hidden="true"
                        />
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <p
                            className={cn(
                              'text-sm font-medium truncate',
                              !candidate.activo && 'text-muted-foreground line-through'
                            )}
                          >
                            {candidate.nombre}
                          </p>
                          <span
                            className={cn(
                              'text-[10px] px-1.5 py-0.5 rounded-sm font-medium flex-shrink-0',
                              TIPO_BADGE_CLASS[candidate.tipo]
                            )}
                          >
                            {TIPO_LABELS[candidate.tipo]}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() =>
                              editingCandidateKey === candidate._key
                                ? setEditingCandidateKey(null)
                                : openEditCandidate(candidate._key)
                            }
                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            aria-label={`Editar ${candidate.nombre}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              setConfirmDeleteKey(
                                confirmDeleteKey === candidate._key ? null : candidate._key
                              )
                            }
                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                            aria-label={`Eliminar ${candidate.nombre}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Delete confirmation */}
                      {confirmDeleteKey === candidate._key && (
                        <div className="flex items-center justify-between px-3 py-2 bg-destructive/8 border-t border-destructive/20">
                          <p className="text-xs text-destructive">
                            ¿Eliminar a <strong>{candidate.nombre}</strong>?
                          </p>
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteCandidate(candidate._key)}
                              className="h-6 text-xs px-2"
                            >
                              Sí, eliminar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setConfirmDeleteKey(null)}
                              className="h-6 text-xs px-2"
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Edit form */}
                      {editingCandidateKey === candidate._key && (
                        <div className="border-t border-border p-3">
                          {renderCandidateForm(
                            editForm,
                            setEditForm,
                            editAliasDraft,
                            setEditAliasDraft,
                            handleConfirmEditCandidate,
                            () => setEditingCandidateKey(null),
                            'Guardar cambios'
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: Territorio ───────────────────────────────────────── */}
          {step === 2 && (
            <div className="p-6 space-y-5">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold">Territorio electoral</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Sin esta configuración el mapa electoral no se puede mostrar. Podés completarla
                  ahora o saltear este paso y configurarlo después.
                </p>
              </div>

              {/* Municipio */}
              <div className="space-y-4">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Municipio
                </h3>
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
                      API del Ministerio del Interior
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
                      API del Ministerio del Interior
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Centro del mapa */}
              <div className="space-y-4">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Centro del mapa
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="geo-lat" className="text-xs">Latitud</Label>
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
                        if (e.target.value !== '')
                          setGeo((g) => ({ ...g, center_lat: clampLat(e.target.value) }))
                      }}
                      className={cn('text-sm', latError && 'border-destructive')}
                    />
                    {latError && (
                      <p className="text-[11px] text-destructive">Entre -90 y 90.</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="geo-lng" className="text-xs">Longitud</Label>
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
                        if (e.target.value !== '')
                          setGeo((g) => ({ ...g, center_lng: clampLng(e.target.value) }))
                      }}
                      className={cn('text-sm', lngError && 'border-destructive')}
                    />
                    {lngError && (
                      <p className="text-[11px] text-destructive">Entre -180 y 180.</p>
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
                      if (e.target.value !== '')
                        setGeo((g) => ({ ...g, zoom: clampZoom(e.target.value) }))
                    }}
                    className={cn('text-sm w-28', zoomError && 'border-destructive')}
                  />
                  {zoomError && (
                    <p className="text-[11px] text-destructive">Entre 1 y 18.</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Circuitos */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Circuitos electorales
                  </h3>
                  {!showAddCircuit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowAddCircuit(true)
                        setEditingCircuitIdx(null)
                        setConfirmDeleteCircuitIdx(null)
                      }}
                      className="h-7 text-xs"
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
                  <p className="text-sm text-muted-foreground py-1 text-center">
                    Sin circuitos configurados.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {geo.circuitos.map((circuit, idx) => (
                      <div key={idx} className="rounded-md border border-border overflow-hidden">
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
                                  setEditCircuit({ ...circuit })
                                  setEditingCircuitIdx(idx)
                                  setConfirmDeleteCircuitIdx(null)
                                  setShowAddCircuit(false)
                                }
                              }}
                              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              aria-label={`Editar circuito ${circuit.nombre}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                setConfirmDeleteCircuitIdx(
                                  confirmDeleteCircuitIdx === idx ? null : idx
                                )
                              }
                              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                              aria-label={`Eliminar circuito ${circuit.nombre}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

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
                                className="h-6 text-xs px-2"
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

              {/* GeoJSON dropzone */}
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  GeoJSON de circuitos
                </h3>
                {geo.geojson_filename ? (
                  <div className="flex items-center gap-3 p-3 border border-border rounded-md bg-muted/30">
                    <FileJson className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{geo.geojson_filename}</p>
                      {geojsonFile && (
                        <p className="text-xs text-muted-foreground">
                          {(geojsonFile.size / 1024).toFixed(1)} KB · Pendiente de subida
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setGeojsonFile(null)
                        setGeo((g) => ({ ...g, geojson_filename: undefined }))
                      }}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Quitar archivo"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label="Zona para soltar archivo GeoJSON"
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setIsDragging(false)
                      const file = e.dataTransfer.files[0]
                      if (file) handleFileAccept(file)
                    }}
                    onClick={() => {
                      const input = document.createElement('input')
                      input.type = 'file'
                      input.accept = '.geojson,.json'
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0]
                        if (file) handleFileAccept(file)
                      }
                      input.click()
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') e.currentTarget.click()
                    }}
                    className={cn(
                      'flex flex-col items-center gap-2 p-6 border-2 border-dashed rounded-md cursor-pointer transition-colors duration-150',
                      isDragging
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-muted/30'
                    )}
                  >
                    <UploadCloud className="h-6 w-6 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground text-center">
                      Arrastrá un archivo o{' '}
                      <span className="text-primary font-medium">hacé clic para seleccionar</span>
                    </p>
                    <p className="text-xs text-muted-foreground">.geojson · .json</p>
                  </div>
                )}
                {geoFileError && (
                  <p className="text-xs text-destructive">{geoFileError}</p>
                )}
              </div>
            </div>
          )}

          {/* ── Footer navigation ────────────────────────────────────────── */}
          <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3 bg-muted/20">
            {/* Skip / Back */}
            <div className="flex items-center gap-2">
              {step > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep((s) => s - 1)}
                  disabled={isSubmitting}
                  className="gap-1.5"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Atrás
                </Button>
              )}
            </div>

            {/* Right side: skip + next/finish */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/projects')}
                disabled={isSubmitting}
                className="text-muted-foreground hover:text-foreground"
              >
                Configurar después
              </Button>

              {step < STEPS.length - 1 ? (
                <Button
                  size="sm"
                  onClick={() => setStep((s) => s + 1)}
                  disabled={step === 0 && !canAdvanceStep1}
                  className="gap-1.5"
                >
                  Siguiente
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleFinish}
                  disabled={isSubmitting}
                  className="gap-1.5"
                >
                  {isSubmitting ? 'Guardando...' : 'Finalizar'}
                  {!isSubmitting && <ChevronRight className="h-3.5 w-3.5" />}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Subtle helper under card */}
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Todos los datos se pueden editar después desde la configuración del proyecto.
        </p>
      </div>
    </div>
  )
}
