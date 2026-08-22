'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowUpRight, Plus, X } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  assignMemberToProject,
  setProjectMemberRole,
  unassignMemberFromProject,
  type AdminMember,
  type AdminProject,
  type ProjectRole,
} from '@/lib/actions/admin'
import { absoluteDate, relativeTime } from './utils'
import { PROJECT_ROLE_LABEL, PROJECT_ROLE_OPTIONS } from '@/lib/roles'

interface ProjectDetailSheetProps {
  project: AdminProject | null
  members: AdminMember[]
  onOpenChange: (open: boolean) => void
}

export function ProjectDetailSheet({ project, members, onOpenChange }: ProjectDetailSheetProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [newUserId, setNewUserId] = useState('')
  const [newRole, setNewRole] = useState<ProjectRole>('viewer')

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

  const assigned = project
    ? members
        .map((member) => {
          const membership = member.memberships.find((m) => m.projectId === project.id)
          return membership ? { member, membership } : null
        })
        .filter((row): row is { member: AdminMember; membership: AdminMember['memberships'][0] } =>
          Boolean(row)
        )
    : []

  const assignedIds = new Set(assigned.map((row) => row.member.id))
  const available = members.filter((m) => !assignedIds.has(m.id))

  const dataRows = project
    ? [
        { label: 'Artículos de prensa', value: project.rows.articulos },
        { label: 'Posts', value: project.rows.posts },
        { label: 'Publicaciones oposición', value: project.rows.opo },
      ]
    : []

  return (
    <Sheet open={Boolean(project)} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        {project && (
          <>
            <SheetHeader className="border-b border-border">
              <SheetTitle className="text-base">{project.name}</SheetTitle>
              <SheetDescription className="text-xs">
                {project.description || 'Sin descripción'}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-8 p-4">
              {error && (
                <p className="rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </p>
              )}

              <section className="flex flex-col gap-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Datos
                </h3>
                <dl className="flex flex-col divide-y divide-border rounded border border-border">
                  {dataRows.map((row) => (
                    <div key={row.label} className="flex items-center justify-between px-3 py-2">
                      <dt className="text-sm text-muted-foreground">{row.label}</dt>
                      <dd className="font-mono text-sm tabular-nums text-foreground">
                        {row.value.toLocaleString('es-AR')}
                      </dd>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-3 py-2">
                    <dt className="text-sm text-muted-foreground">Última actualización</dt>
                    <dd className="text-sm text-foreground">
                      {relativeTime(project.lastDataUpdate)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <dt className="text-sm text-muted-foreground">Enlace público</dt>
                    <dd className="text-sm text-foreground">
                      {project.share_enabled
                        ? `Activo · ${project.share_role ?? 'viewer'}`
                        : 'Desactivado'}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Miembros
                  </h3>
                  <span className="font-mono text-xs text-muted-foreground">
                    {assigned.length}
                  </span>
                </div>

                {assigned.length === 0 ? (
                  <p className="rounded border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                    Nadie tiene acceso a este proyecto.
                  </p>
                ) : (
                  <ul className="flex flex-col divide-y divide-border rounded border border-border">
                    {assigned.map(({ member, membership }) => (
                      <li key={membership.membershipId} className="flex items-center gap-2 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-foreground">
                            {member.full_name || 'Sin nombre'}
                          </p>
                          <p className="truncate font-mono text-[11px] text-muted-foreground">
                            {member.email}
                          </p>
                        </div>
                        <Select
                          value={membership.role}
                          disabled={isPending}
                          onValueChange={(v) =>
                            run(() =>
                              setProjectMemberRole(membership.membershipId, v as ProjectRole)
                            )
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
                          onClick={() =>
                            run(() => unassignMemberFromProject(membership.membershipId))
                          }
                          className="rounded p-1 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                          aria-label={`Quitar a ${member.full_name || member.email} del proyecto`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex flex-col gap-2 rounded border border-border p-3">
                  <p className="text-xs text-muted-foreground">Agregar miembro</p>
                  <div className="flex gap-2">
                    <Select
                      value={newUserId}
                      disabled={isPending || available.length === 0}
                      onValueChange={setNewUserId}
                    >
                      <SelectTrigger className="h-8 flex-1 text-xs">
                        <SelectValue
                          placeholder={available.length === 0 ? 'Todos asignados' : 'Elegir usuario'}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {available.map((m) => (
                          <SelectItem key={m.id} value={m.id} className="text-xs">
                            {m.full_name || m.email || m.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={newRole}
                      disabled={isPending}
                      onValueChange={(v) => setNewRole(v as ProjectRole)}
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
                    disabled={isPending || !newUserId}
                    onClick={() =>
                      run(async () => {
                        await assignMemberToProject(newUserId, project.id, newRole)
                        setNewUserId('')
                      })
                    }
                    className="h-8 gap-1.5 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Agregar
                  </Button>
                </div>
              </section>

              <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                <span className="text-xs text-muted-foreground">
                  Creado {absoluteDate(project.created_at)}
                </span>
                <Link
                  href={`/projects/${project.id}/candidato`}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Abrir proyecto
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
