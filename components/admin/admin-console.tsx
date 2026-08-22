'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { AdminMember, AdminOverview, AdminProject } from '@/lib/actions/admin'
import { MemberDetailSheet } from './member-detail-sheet'
import { ProjectDetailSheet } from './project-detail-sheet'
import { freshness, initialsOf, relativeTime } from './utils'
import { globalRoleLabel, projectRoleLabel } from '@/lib/roles'
import { cn } from '@/lib/utils'

type Tab = 'projects' | 'members'

const FRESHNESS_DOT: Record<ReturnType<typeof freshness>, string> = {
  fresh: 'bg-coros-positive',
  aging: 'bg-coros-neutral',
  stale: 'bg-coros-negative',
  empty: 'bg-border',
}

const FRESHNESS_LABEL: Record<ReturnType<typeof freshness>, string> = {
  fresh: 'Datos al día',
  aging: 'Datos con demora',
  stale: 'Datos desactualizados',
  empty: 'Sin datos',
}



export function AdminConsole({
  overview,
  currentUserId,
}: {
  overview: AdminOverview
  currentUserId: string
}) {
  const [tab, setTab] = useState<Tab>('projects')
  const [query, setQuery] = useState('')
  const [openProjectId, setOpenProjectId] = useState<string | null>(null)
  const [openMemberId, setOpenMemberId] = useState<string | null>(null)

  const { projects, members, totals } = overview
  const needle = query.trim().toLowerCase()

  const filteredProjects = useMemo(
    () =>
      needle
        ? projects.filter(
            (p) =>
              p.name.toLowerCase().includes(needle) ||
              (p.description ?? '').toLowerCase().includes(needle)
          )
        : projects,
    [projects, needle]
  )

  const filteredMembers = useMemo(
    () =>
      needle
        ? members.filter(
            (m) =>
              (m.full_name ?? '').toLowerCase().includes(needle) ||
              (m.email ?? '').toLowerCase().includes(needle) ||
              m.memberships.some((x) => x.projectName.toLowerCase().includes(needle))
          )
        : members,
    [members, needle]
  )

  const openProject = projects.find((p) => p.id === openProjectId) ?? null
  const openMember = members.find((m) => m.id === openMemberId) ?? null

  const stats: { label: string; value: string; hint?: string }[] = [
    { label: 'Proyectos', value: String(totals.projects) },
    { label: 'Miembros', value: String(totals.members), hint: `${totals.admins} admin` },
    { label: 'Registros', value: totals.rows.toLocaleString('es-AR') },
    { label: 'Último dato', value: relativeTime(totals.lastDataUpdate) },
    {
      label: 'Sin asignar',
      value: String(totals.unassignedMembers),
      hint: totals.unassignedMembers > 0 ? 'requieren acceso' : 'todo en orden',
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Signature element: the platform vitals strip */}
      <section
        aria-label="Resumen de la plataforma"
        className="grid grid-cols-2 divide-border overflow-hidden rounded border border-border bg-card sm:grid-cols-3 lg:grid-cols-5 lg:divide-x"
      >
        {stats.map((stat) => (
          <div key={stat.label} className="border-b border-border px-4 py-3 lg:border-b-0">
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-1.5 font-mono text-2xl leading-none tabular-nums text-foreground">
              {stat.value}
            </p>
            {stat.hint && <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>}
          </div>
        ))}
      </section>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Secciones del panel"
          className="inline-flex w-fit rounded border border-border bg-card p-0.5"
        >
          {(
            [
              ['projects', `Proyectos (${projects.length})`],
              ['members', `Miembros (${members.length})`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={cn(
                'rounded px-3 py-1.5 text-sm transition-colors duration-150',
                tab === value
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === 'projects' ? 'Buscar proyecto…' : 'Buscar persona o email…'}
            className="pl-8"
            aria-label="Buscar"
          />
        </div>
      </div>

      {tab === 'projects' ? (
        <ProjectsTable projects={filteredProjects} onSelect={setOpenProjectId} />
      ) : (
        <MembersTable
          members={filteredMembers}
          currentUserId={currentUserId}
          onSelect={setOpenMemberId}
        />
      )}

      <ProjectDetailSheet
        project={openProject}
        members={members}
        onOpenChange={(open) => !open && setOpenProjectId(null)}
      />
      <MemberDetailSheet
        member={openMember}
        projects={projects}
        isSelf={openMember?.id === currentUserId}
        onOpenChange={(open) => !open && setOpenMemberId(null)}
      />
    </div>
  )
}

function ProjectsTable({
  projects,
  onSelect,
}: {
  projects: AdminProject[]
  onSelect: (id: string) => void
}) {
  if (projects.length === 0) return <EmptyRow text="No hay proyectos que coincidan." />

  return (
    <div className="overflow-x-auto rounded border border-border bg-card">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <Th className="w-[34%]">Proyecto</Th>
            <Th className="text-right">Prensa</Th>
            <Th className="text-right">Posts</Th>
            <Th className="text-right">Oposición</Th>
            <Th className="text-right">Miembros</Th>
            <Th>Último dato</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {projects.map((project) => {
            const state = freshness(project.lastDataUpdate)
            return (
              <tr
                key={project.id}
                tabIndex={0}
                onClick={() => onSelect(project.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect(project.id)
                  }
                }}
                className="cursor-pointer transition-colors duration-150 hover:bg-accent/10 focus:bg-accent/10 focus:outline-none"
              >
                <Td>
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{project.name}</span>
                    {project.description && (
                      <span className="line-clamp-1 text-xs text-muted-foreground">
                        {project.description}
                      </span>
                    )}
                  </div>
                </Td>
                <Num value={project.rows.articulos} />
                <Num value={project.rows.posts} />
                <Num value={project.rows.opo} />
                <Num value={project.memberCount} />
                <Td>
                  <span className="flex items-center gap-2">
                    <span
                      className={cn('h-1.5 w-1.5 shrink-0 rounded-full', FRESHNESS_DOT[state])}
                      aria-hidden="true"
                    />
                    <span className="text-muted-foreground">
                      {relativeTime(project.lastDataUpdate)}
                    </span>
                    <span className="sr-only">{FRESHNESS_LABEL[state]}</span>
                  </span>
                </Td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function MembersTable({
  members,
  currentUserId,
  onSelect,
}: {
  members: AdminMember[]
  currentUserId: string
  onSelect: (id: string) => void
}) {
  if (members.length === 0) return <EmptyRow text="No hay miembros que coincidan." />

  return (
    <div className="overflow-x-auto rounded border border-border bg-card">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <Th className="w-[34%]">Persona</Th>
            <Th>Rol</Th>
            <Th>Puede crear</Th>
            <Th className="w-[34%]">Proyectos</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {members.map((member) => (
            <tr
              key={member.id}
              tabIndex={0}
              onClick={() => onSelect(member.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(member.id)
                }
              }}
              className="cursor-pointer transition-colors duration-150 hover:bg-accent/10 focus:bg-accent/10 focus:outline-none"
            >
              <Td>
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-foreground">
                    {initialsOf(member.full_name, member.email)}
                  </span>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium text-foreground">
                      {member.full_name || 'Sin nombre'}
                      {member.id === currentUserId && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          (vos)
                        </span>
                      )}
                    </span>
                    <span className="truncate font-mono text-xs text-muted-foreground">
                      {member.email}
                    </span>
                  </div>
                </div>
              </Td>
              <Td>
                <Badge variant={member.role === 'admin' ? 'default' : 'outline'}>
                  {globalRoleLabel(member.role)}
                </Badge>
              </Td>
              <Td>
                <span className="text-muted-foreground">
                  {member.can_create_projects ? 'Sí' : 'No'}
                </span>
              </Td>
              <Td>
                {member.memberships.length === 0 ? (
                  <span className="text-xs text-muted-foreground">Sin asignar</span>
                ) : (
                  <span className="flex flex-wrap gap-1">
                    {member.memberships.slice(0, 3).map((m) => (
                      <span
                        key={m.membershipId}
                        className="rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground"
                      >
                        {m.projectName}
                        <span className="ml-1 opacity-60">{projectRoleLabel(m.role)}</span>
                      </span>
                    ))}
                    {member.memberships.length > 3 && (
                      <span className="px-1 py-0.5 text-xs text-muted-foreground">
                        +{member.memberships.length - 3}
                      </span>
                    )}
                  </span>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn(
        'px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground',
        className
      )}
    >
      {children}
    </th>
  )
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn('px-4 py-3 align-middle', className)}>{children}</td>
}

function Num({ value }: { value: number }) {
  return (
    <td className="px-4 py-3 text-right font-mono tabular-nums text-foreground">
      {value.toLocaleString('es-AR')}
    </td>
  )
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="rounded border border-dashed border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
      {text}
    </div>
  )
}
