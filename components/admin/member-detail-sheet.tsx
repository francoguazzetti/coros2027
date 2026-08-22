'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  assignMemberToProject,
  setCanCreateProjects,
  setGlobalRole,
  setProjectMemberRole,
  unassignMemberFromProject,
  type AdminMember,
  type AdminProject,
  type GlobalRole,
  type ProjectRole,
} from '@/lib/actions/admin'
import { initialsOf, absoluteDate, relativeTime } from './utils'
import {
  GLOBAL_ROLE_HINT,
  GLOBAL_ROLE_LABEL,
  GLOBAL_ROLE_OPTIONS,
  PROJECT_ROLE_LABEL,
  PROJECT_ROLE_OPTIONS,
} from '@/lib/roles'
import { cn } from '@/lib/utils'

interface MemberDetailSheetProps {
  member: AdminMember | null
  projects: AdminProject[]
  isSelf: boolean
  onOpenChange: (open: boolean) => void
}

export function MemberDetailSheet({
  member,
  projects,
  isSelf,
  onOpenChange,
}: MemberDetailSheetProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [newProjectId, setNewProjectId] = useState('')
  const [newProjectRole, setNewProjectRole] = useState<ProjectRole>('viewer')

  const run = (fn: () => Promise<unknown>) => {
    setError(null)
    startTransition(async () => {
      try {
        await fn()
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo aplicar el cambio.')
      }
    })
  }

  const assignedIds = new Set(member?.memberships.map((m) => m.projectId) ?? [])
  const available = projects.filter((p) => !assignedIds.has(p.id))

  return (
    <Sheet open={Boolean(member)} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        {member && (
          <>
            <SheetHeader className="border-b border-border">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                  {initialsOf(member.full_name, member.email)}
                </div>
                <div className="min-w-0">
                  <SheetTitle className="truncate text-base">
                    {member.full_name || 'Sin nombre'}
                  </SheetTitle>
                  <SheetDescription className="truncate font-mono text-xs">
                    {member.email ?? 'sin email'}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="flex flex-col gap-8 p-4">
              {error && (
                <p className="rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </p>
              )}

              <section className="flex flex-col gap-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Rol en la plataforma
                </h3>
                <Select
                  value={member.role}
                  disabled={isPending || isSelf}
                  onValueChange={(v) => run(() => setGlobalRole(member.id, v as GlobalRole))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GLOBAL_ROLE_OPTIONS.map((role) => (
                      <SelectItem key={role} value={role}>
                        {GLOBAL_ROLE_LABEL[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {isSelf
                    ? 'No podés modificar tu propio rol de administrador.'
                    : GLOBAL_ROLE_HINT[member.role]}
                </p>

                <div className="flex items-center justify-between gap-4 rounded border border-border px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">Puede crear proyectos</p>
                    <p className="text-xs text-muted-foreground">
                      Habilita el alta de proyectos nuevos.
                    </p>
                  </div>
                  <Switch
                    checked={member.can_create_projects}
                    disabled={isPending}
                    onCheckedChange={(checked) =>
                      run(() => setCanCreateProjects(member.id, checked))
                    }
                  />
                </div>
              </section>

              <section className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Consumo del chat IA
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {member.aiUsage.lastUsedAt
                      ? `último uso ${relativeTime(member.aiUsage.lastUsedAt)}`
                      : 'sin uso'}
                  </span>
                </div>
                {member.aiUsage.events === 0 ? (
                  <p className="rounded border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                    Todavía no usó el chat de IA.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-px overflow-hidden rounded border border-border bg-border">
                    {[
                      ['Consultas', member.aiUsage.events.toLocaleString('es-AR')],
                      ['Tokens totales', member.aiUsage.totalTokens.toLocaleString('es-AR')],
                      ['Entrada', member.aiUsage.inputTokens.toLocaleString('es-AR')],
                      ['Salida', member.aiUsage.outputTokens.toLocaleString('es-AR')],
                      ['Últimos 30 días', member.aiUsage.tokens30d.toLocaleString('es-AR')],
                      ['Cacheados', member.aiUsage.cachedInputTokens.toLocaleString('es-AR')],
                    ].map(([label, value]) => (
                      <div key={label} className="bg-card px-3 py-2.5">
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          {label}
                        </p>
                        <p className="mt-0.5 font-mono text-sm tabular-nums text-foreground">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Proyectos asignados
                  </h3>
                  <span className="font-mono text-xs text-muted-foreground">
                    {member.memberships.length}
                  </span>
                </div>

                {member.memberships.length === 0 ? (
                  <p className="rounded border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                    Sin proyectos asignados.
                  </p>
                ) : (
                  <ul className="flex flex-col divide-y divide-border rounded border border-border">
                    {member.memberships.map((m) => (
                      <li key={m.membershipId} className="flex items-center gap-2 px-3 py-2">
                        <span className="flex-1 truncate text-sm text-foreground">
                          {m.projectName}
                        </span>
                        <Select
                          value={m.role}
                          disabled={isPending}
                          onValueChange={(v) =>
                            run(() => setProjectMemberRole(m.membershipId, v as ProjectRole))
                          }
                        >
                          <SelectTrigger className="h-7 w-[112px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PROJECT_ROLE_OPTIONS.map((role) => (
                              <SelectItem key={role} value={role} className="text-xs">
                                {PROJECT_ROLE_LABEL[role]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => run(() => unassignMemberFromProject(m.membershipId))}
                          className="rounded p-1 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                          aria-label={`Quitar de ${m.projectName}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex flex-col gap-2 rounded border border-border p-3">
                  <p className="text-xs text-muted-foreground">Asignar a un proyecto</p>
                  <div className="flex gap-2">
                    <Select
                      value={newProjectId}
                      disabled={isPending || available.length === 0}
                      onValueChange={setNewProjectId}
                    >
                      <SelectTrigger className="h-8 flex-1 text-xs">
                        <SelectValue
                          placeholder={
                            available.length === 0 ? 'Ya está en todos' : 'Elegir proyecto'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {available.map((p) => (
                          <SelectItem key={p.id} value={p.id} className="text-xs">
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={newProjectRole}
                      disabled={isPending}
                      onValueChange={(v) => setNewProjectRole(v as ProjectRole)}
                    >
                      <SelectTrigger className="h-8 w-[112px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROJECT_ROLE_OPTIONS.map((role) => (
                          <SelectItem key={role} value={role} className="text-xs">
                            {PROJECT_ROLE_LABEL[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isPending || !newProjectId}
                    onClick={() =>
                      run(async () => {
                        await assignMemberToProject(member.id, newProjectId, newProjectRole)
                        setNewProjectId('')
                      })
                    }
                    className="h-8 gap-1.5 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Asignar
                  </Button>
                </div>
              </section>

              <p className={cn('text-xs text-muted-foreground', isPending && 'animate-pulse')}>
                Miembro desde {absoluteDate(member.created_at)}
                {isPending ? ' · guardando…' : ''}
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
