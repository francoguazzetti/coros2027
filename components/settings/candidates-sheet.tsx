'use client'

import { useState, useEffect, KeyboardEvent } from 'react'
import { X, Plus, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
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
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
// Stubs — reemplazar cuando los server actions estén implementados en lib/actions/settings.ts
async function getProjectCandidates(
  _projectId: string,
): Promise<{ data?: Candidate[]; error?: string }> {
  return { data: [] }
}
async function upsertProjectCandidate(
  _projectId: string,
  _candidate: Omit<Candidate, 'id'> & { id?: string },
): Promise<{ data?: Candidate; error?: string }> {
  return { data: { id: crypto.randomUUID(), ..._candidate } as Candidate }
}
async function deleteProjectCandidate(
  _projectId: string,
  _candidateId: string,
): Promise<{ error?: string }> {
  return {}
}
import { cn } from '@/lib/utils'

export interface Candidate {
  id: string
  nombre: string
  tipo: 'propio' | 'oposicion' | 'partido'
  alias: string[]
  color: string
  activo: boolean
}

type CandidateForm = Omit<Candidate, 'id'> & { id?: string }

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

const DEFAULT_FORM: CandidateForm = {
  nombre: '',
  tipo: 'propio',
  alias: [],
  color: '#0E4C5C',
  activo: true,
}

interface CandidatesSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
}

export function CandidatesSheet({ open, onOpenChange, projectId }: CandidatesSheetProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Inline add form
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState<CandidateForm>(DEFAULT_FORM)
  const [addAliasDraft, setAddAliasDraft] = useState('')
  const [isSavingAdd, setIsSavingAdd] = useState(false)

  // Inline edit form (keyed by candidate id)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<CandidateForm>(DEFAULT_FORM)
  const [editAliasDraft, setEditAliasDraft] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (open) {
      loadCandidates()
    }
  }, [open, projectId])

  const loadCandidates = async () => {
    setIsLoading(true)
    setMessage(null)
    try {
      const result = await getProjectCandidates(projectId)
      if ('error' in result) {
        setMessage({ type: 'error', text: 'No se pudieron cargar los candidatos.' })
      } else {
        setCandidates(result.data ?? [])
      }
    } catch {
      setMessage({ type: 'error', text: 'No se pudieron cargar los candidatos.' })
    } finally {
      setIsLoading(false)
    }
  }

  // ── Add handlers ────────────────────────────────────────────────────────────

  const handleAddAliasKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return
    if (e.key === 'Enter' && addAliasDraft.trim()) {
      e.preventDefault()
      const val = addAliasDraft.trim()
      if (!addForm.alias.includes(val)) {
        setAddForm((f) => ({ ...f, alias: [...f.alias, val] }))
      }
      setAddAliasDraft('')
    }
  }

  const removeAddAlias = (index: number) => {
    setAddForm((f) => ({ ...f, alias: f.alias.filter((_, i) => i !== index) }))
  }

  const handleConfirmAdd = async () => {
    if (!addForm.nombre.trim()) return
    setIsSavingAdd(true)
    setMessage(null)
    // Optimistic
    const optimistic: Candidate = { id: `temp-${Date.now()}`, ...addForm }
    setCandidates((prev) => [...prev, optimistic])
    try {
      const result = await upsertProjectCandidate(projectId, addForm)
      if ('error' in result) {
        setCandidates((prev) => prev.filter((c) => c.id !== optimistic.id))
        setMessage({ type: 'error', text: 'Error al guardar el candidato.' })
      } else {
        setCandidates((prev) =>
          prev.map((c) => (c.id === optimistic.id ? (result.data as Candidate) : c))
        )
        setMessage({ type: 'success', text: 'Candidato agregado.' })
        setShowAddForm(false)
        setAddForm(DEFAULT_FORM)
        setAddAliasDraft('')
      }
    } catch {
      setCandidates((prev) => prev.filter((c) => c.id !== optimistic.id))
      setMessage({ type: 'error', text: 'Error al guardar el candidato.' })
    } finally {
      setIsSavingAdd(false)
    }
  }

  const handleCancelAdd = () => {
    setShowAddForm(false)
    setAddForm(DEFAULT_FORM)
    setAddAliasDraft('')
    setMessage(null)
  }

  // ── Edit handlers ────────────────────────────────────────────────────────────

  const openEdit = (candidate: Candidate) => {
    setEditingId(candidate.id)
    setEditForm({ ...candidate })
    setEditAliasDraft('')
    setConfirmDeleteId(null)
    setShowAddForm(false)
  }

  const handleEditAliasKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return
    if (e.key === 'Enter' && editAliasDraft.trim()) {
      e.preventDefault()
      const val = editAliasDraft.trim()
      if (!editForm.alias.includes(val)) {
        setEditForm((f) => ({ ...f, alias: [...f.alias, val] }))
      }
      setEditAliasDraft('')
    }
  }

  const removeEditAlias = (index: number) => {
    setEditForm((f) => ({ ...f, alias: f.alias.filter((_, i) => i !== index) }))
  }

  const handleConfirmEdit = async () => {
    if (!editForm.nombre.trim() || !editingId) return
    setIsSavingEdit(true)
    setMessage(null)
    const previous = candidates.find((c) => c.id === editingId)!
    // Optimistic
    setCandidates((prev) =>
      prev.map((c) => (c.id === editingId ? { id: editingId, ...editForm } : c))
    )
    try {
      const result = await upsertProjectCandidate(projectId, { id: editingId, ...editForm })
      if ('error' in result) {
        setCandidates((prev) => prev.map((c) => (c.id === editingId ? previous : c)))
        setMessage({ type: 'error', text: 'Error al guardar los cambios.' })
      } else {
        setCandidates((prev) =>
          prev.map((c) => (c.id === editingId ? (result.data as Candidate) : c))
        )
        setMessage({ type: 'success', text: 'Candidato actualizado.' })
        setEditingId(null)
      }
    } catch {
      setCandidates((prev) => prev.map((c) => (c.id === editingId ? previous : c)))
      setMessage({ type: 'error', text: 'Error al guardar los cambios.' })
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditAliasDraft('')
    setMessage(null)
  }

  // ── Delete handlers ──────────────────────────────────────────────────────────

  const handleConfirmDelete = async (id: string) => {
    setIsDeleting(true)
    setMessage(null)
    const previous = candidates.find((c) => c.id === id)!
    // Optimistic
    setCandidates((prev) => prev.filter((c) => c.id !== id))
    try {
      const result = await deleteProjectCandidate(projectId, id)
      if ('error' in result) {
        setCandidates((prev) => [...prev, previous].sort((a, b) => a.nombre.localeCompare(b.nombre)))
        setMessage({ type: 'error', text: 'Error al eliminar el candidato.' })
      } else {
        setMessage({ type: 'success', text: 'Candidato eliminado.' })
      }
    } catch {
      setCandidates((prev) => [...prev, previous].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setMessage({ type: 'error', text: 'Error al eliminar el candidato.' })
    } finally {
      setIsDeleting(false)
      setConfirmDeleteId(null)
    }
  }

  // ── Render helpers ───────────────────────────────────────────────────────────

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

  const renderForm = (
    form: CandidateForm,
    setForm: (updater: (f: CandidateForm) => CandidateForm) => void,
    aliasDraft: string,
    setAliasDraft: (v: string) => void,
    aliasKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void,
    removeAlias: (i: number) => void,
    onConfirm: () => void,
    onCancel: () => void,
    isSaving: boolean,
    confirmLabel: string
  ) => (
    <div className="space-y-3 p-3 border border-border rounded-md bg-muted/30">
      <div className="space-y-1.5">
        <Label className="text-xs">Nombre *</Label>
        <Input
          placeholder="ej. Fernández"
          value={form.nombre}
          onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
          className="text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Tipo</Label>
          <Select
            value={form.tipo}
            onValueChange={(v) => setForm((f) => ({ ...f, tipo: v as Candidate['tipo'] }))}
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
              onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
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
        {renderAliasInput(form.alias, aliasDraft, setAliasDraft, aliasKeyDown, removeAlias)}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch
            id={`activo-${confirmLabel}`}
            checked={form.activo}
            onCheckedChange={(v) => setForm((f) => ({ ...f, activo: v }))}
          />
          <Label htmlFor={`activo-${confirmLabel}`} className="text-xs cursor-pointer">
            Activo
          </Label>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isSaving || !form.nombre.trim()}
            className="transition-all duration-200 hover:scale-102 active:scale-98"
          >
            {isSaving ? 'Guardando...' : confirmLabel}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
            className="transition-all duration-200 hover:scale-102 active:scale-98"
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-96">
        <SheetHeader>
          <SheetTitle>Candidatos y actores</SheetTitle>
          <SheetDescription>
            Administrá los candidatos que la plataforma monitorea en medios y redes.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-4 py-6">
            {/* Add button / form */}
            <div className="space-y-3">
              {!showAddForm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddForm(true)
                    setEditingId(null)
                    setConfirmDeleteId(null)
                  }}
                  className="w-full transition-all duration-200 hover:scale-102 active:scale-98"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Agregar candidato
                </Button>
              )}

              {showAddForm &&
                renderForm(
                  addForm,
                  setAddForm,
                  addAliasDraft,
                  setAddAliasDraft,
                  handleAddAliasKeyDown,
                  removeAddAlias,
                  handleConfirmAdd,
                  handleCancelAdd,
                  isSavingAdd,
                  'Agregar'
                )}
            </div>

            <Separator />

            {/* Candidates list */}
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-12 rounded-md bg-muted animate-pulse"
                    aria-hidden="true"
                  />
                ))}
              </div>
            ) : candidates.length === 0 ? (
              <div className="py-8 text-center space-y-1.5">
                <p className="text-sm font-medium text-muted-foreground">
                  No hay candidatos configurados.
                </p>
                <p className="text-xs text-muted-foreground max-w-[260px] mx-auto leading-relaxed">
                  Agregá candidatos con sus alias para que el clasificador detecte menciones en
                  noticias y redes sociales.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {candidates.map((candidate) => (
                  <div key={candidate.id} className="rounded-md border border-border overflow-hidden">
                    {/* Row */}
                    <div
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 group transition-colors duration-150',
                        editingId === candidate.id ? 'bg-muted/50' : 'hover:bg-accent/30'
                      )}
                    >
                      {/* Color swatch */}
                      <span
                        className="h-3 w-3 rounded-full flex-shrink-0 border border-border/50"
                        style={{ backgroundColor: candidate.color }}
                        aria-hidden="true"
                      />

                      {/* Name + badge */}
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

                      {/* Actions */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() =>
                            editingId === candidate.id ? handleCancelEdit() : openEdit(candidate)
                          }
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={editingId === candidate.id ? 'Cerrar edición' : `Editar ${candidate.nombre}`}
                        >
                          {editingId === candidate.id ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <Pencil className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() =>
                            setConfirmDeleteId(
                              confirmDeleteId === candidate.id ? null : candidate.id
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
                    {confirmDeleteId === candidate.id && (
                      <div className="flex items-center justify-between px-3 py-2 bg-destructive/8 border-t border-destructive/20">
                        <p className="text-xs text-destructive">
                          ¿Eliminar a <strong>{candidate.nombre}</strong>?
                        </p>
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleConfirmDelete(candidate.id)}
                            disabled={isDeleting}
                            className="h-6 text-xs px-2 transition-all duration-200 hover:scale-102 active:scale-98"
                          >
                            {isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirmDeleteId(null)}
                            disabled={isDeleting}
                            className="h-6 text-xs px-2"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Inline edit form */}
                    {editingId === candidate.id && (
                      <div className="border-t border-border p-3">
                        {renderForm(
                          editForm,
                          setEditForm,
                          editAliasDraft,
                          setEditAliasDraft,
                          handleEditAliasKeyDown,
                          removeEditAlias,
                          handleConfirmEdit,
                          handleCancelEdit,
                          isSavingEdit,
                          'Guardar'
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <SheetFooter className="pt-4">
          {message && (
            <p
              className={cn(
                'text-sm mr-auto',
                message.type === 'success' ? 'text-claribi-positive' : 'text-claribi-negative'
              )}
            >
              {message.text}
            </p>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
