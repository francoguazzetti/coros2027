import type { GlobalRole, ProjectRole } from '@/lib/actions/admin'

/** Values allowed by the `profiles_role_check` constraint. */
export const GLOBAL_ROLE_OPTIONS: GlobalRole[] = ['admin', 'creator', 'member']

/** Values allowed by the `project_members_role_check` constraint. */
export const PROJECT_ROLE_OPTIONS: ProjectRole[] = ['owner', 'admin', 'editor', 'viewer']

export const GLOBAL_ROLE_LABEL: Record<GlobalRole, string> = {
  admin: 'Administrador',
  creator: 'Creador',
  member: 'Miembro',
}

export const GLOBAL_ROLE_HINT: Record<GlobalRole, string> = {
  admin: 'Acceso total a la plataforma y a este panel de control.',
  creator: 'Puede crear proyectos nuevos además de los que tenga asignados.',
  member: 'Solo accede a los proyectos donde esté asignado.',
}

export const PROJECT_ROLE_LABEL: Record<ProjectRole, string> = {
  owner: 'Propietario',
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
}

export function globalRoleLabel(role: string) {
  return GLOBAL_ROLE_LABEL[role as GlobalRole] ?? role
}

export function projectRoleLabel(role: string) {
  return PROJECT_ROLE_LABEL[role as ProjectRole] ?? role
}
