'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { inviteUserToProject } from '@/lib/actions/projects'
import { updateMemberRole, removeMember } from '@/lib/actions/settings'
import { cn } from '@/lib/utils'

interface Member {
  id: string
  user_id: string
  role: string
  profiles: {
    id: string
    email: string | null
    full_name: string | null
  } | null
}

interface MembersListProps {
  projectId: string
  members: Member[]
  canManage: boolean
  onMembersChange?: () => void
}

export function MembersList({ projectId, members, canManage, onMembersChange }: MembersListProps) {
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer')
  const [isInviting, setIsInviting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return

    setIsInviting(true)
    setMessage(null)

    try {
      await inviteUserToProject(inviteEmail, projectId, inviteRole)
      setMessage({ type: 'success', text: `Invitación enviada a ${inviteEmail}` })
      setInviteEmail('')
      onMembersChange?.()
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error al enviar la invitación.'
      setMessage({ type: 'error', text: msg })
    } finally {
      setIsInviting(false)
    }
  }

  const handleRoleChange = async (memberId: string, newRole: 'editor' | 'viewer') => {
    try {
      await updateMemberRole(projectId, memberId, newRole)
      onMembersChange?.()
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al cambiar el rol.' })
    }
  }

  const handleRemove = async (memberId: string) => {
    try {
      await removeMember(projectId, memberId)
      onMembersChange?.()
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al eliminar el miembro.' })
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default'
      case 'editor':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Propietario'
      case 'editor':
        return 'Editor'
      default:
        return 'Viewer'
    }
  }

  return (
    <div className="space-y-4">
      {/* Invite Section */}
      {canManage && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Invitar usuario</h4>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="email@ejemplo.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1"
            />
            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'editor' | 'viewer')}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleInvite}
              disabled={isInviting || !inviteEmail.trim()}
              className="transition-all duration-200 hover:scale-102 active:scale-98"
            >
              {isInviting ? '...' : 'Invitar'}
            </Button>
          </div>
          {message && (
            <p
              className={cn(
                'text-sm',
                message.type === 'success' ? 'text-coros-positive' : 'text-coros-negative'
              )}
            >
              {message.text}
            </p>
          )}
        </div>
      )}

      {/* Members List */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Personas con acceso</h4>
        <ScrollArea className="h-[200px]">
          <div className="space-y-2 pr-4">
            {members.map((member) => {
              const profile = member.profiles
              const initials = profile?.full_name
                ? profile.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)
                : (profile?.email?.[0]?.toUpperCase() || 'U')

              const isOwner = member.role === 'owner'

              return (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-all duration-200"
                >
                  {/* Avatar */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {initials}
                  </div>

                  {/* Info */}
                  <div className="flex flex-1 flex-col overflow-hidden">
                    <span className="text-sm font-medium truncate">
                      {profile?.full_name || 'Sin nombre'}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">{profile?.email}</span>
                  </div>

                  {/* Role */}
                  {canManage && !isOwner ? (
                    <Select
                      value={member.role}
                      onValueChange={(v) => handleRoleChange(member.id, v as 'editor' | 'viewer')}
                    >
                      <SelectTrigger className="w-24 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={getRoleBadgeVariant(member.role)}>{getRoleLabel(member.role)}</Badge>
                  )}

                  {/* Remove Button */}
                  {canManage && !isOwner && (
                    <button
                      onClick={() => handleRemove(member.id)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      title="Eliminar"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
