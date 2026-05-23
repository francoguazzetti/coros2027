'use client'

import { useState, useEffect } from 'react'
import { UserPlus, Copy, Check, X, Link2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { inviteUserToProject, getProjectMembers } from '@/lib/actions/projects'
import {
  enableShareLink,
  disableShareLink,
  updateShareRole,
  updateMemberRole,
  removeMember,
} from '@/lib/actions/settings'
import { cn } from '@/lib/utils'

interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectName: string
  userRole?: string | null
  shareToken?: string | null
  shareEnabled?: boolean
  shareRole?: string | null
}

interface MemberProfile {
  id: string
  email: string | null
  full_name: string | null
}

interface Member {
  id: string
  user_id: string
  role: string
  // Supabase join can return array or single object depending on the relationship
  profiles: MemberProfile | MemberProfile[] | null
}

export function ShareDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  userRole,
  shareToken: initialShareToken,
  shareEnabled: initialShareEnabled,
  shareRole: initialShareRole,
}: ShareDialogProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer')
  const [isInviting, setIsInviting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Share link state
  const [shareEnabled, setShareEnabled] = useState(initialShareEnabled || false)
  const [shareToken, setShareToken] = useState(initialShareToken || null)
  const [shareRole, setShareRole] = useState<'viewer' | 'editor'>((initialShareRole as 'viewer' | 'editor') || 'viewer')
  const [copied, setCopied] = useState(false)

  const canManage = userRole === 'owner' || userRole === 'editor'

  // Supabase joins can return profile as array or object — normalize to single
  const getProfile = (member: Member): MemberProfile | null => {
    if (!member.profiles) return null
    return Array.isArray(member.profiles) ? member.profiles[0] ?? null : member.profiles
  }

  useEffect(() => {
    if (open) {
      loadMembers()
      setShareEnabled(initialShareEnabled || false)
      setShareToken(initialShareToken || null)
      setShareRole((initialShareRole as 'viewer' | 'editor') || 'viewer')
    }
  }, [open, projectId, initialShareEnabled, initialShareToken, initialShareRole])

  const loadMembers = async () => {
    try {
      const data = await getProjectMembers(projectId)
      setMembers(data || [])
    } catch (error) {
      console.error('Failed to load members:', error)
    }
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return

    setIsInviting(true)
    setMessage(null)

    try {
      await inviteUserToProject(inviteEmail, projectId, inviteRole)
      setMessage({ type: 'success', text: `Invitación enviada a ${inviteEmail}` })
      setInviteEmail('')
      loadMembers()
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al enviar la invitación.' })
    } finally {
      setIsInviting(false)
    }
  }

  const handleRoleChange = async (memberId: string, newRole: 'editor' | 'viewer') => {
    try {
      await updateMemberRole(projectId, memberId, newRole)
      loadMembers()
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al cambiar el rol.' })
    }
  }

  const handleRemove = async (memberId: string) => {
    try {
      await removeMember(projectId, memberId)
      loadMembers()
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al eliminar el miembro.' })
    }
  }

  const handleToggleShareLink = async (enabled: boolean) => {
    try {
      if (enabled) {
        const result = await enableShareLink(projectId, shareRole)
        setShareToken(result.shareToken)
        setShareEnabled(true)
      } else {
        await disableShareLink(projectId)
        setShareToken(null)
        setShareEnabled(false)
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al actualizar el enlace.' })
    }
  }

  const handleShareRoleChange = async (newRole: 'viewer' | 'editor') => {
    setShareRole(newRole)
    if (shareEnabled) {
      try {
        await updateShareRole(projectId, newRole)
      } catch (error) {
        setMessage({ type: 'error', text: 'Error al actualizar el permiso.' })
      }
    }
  }

  const copyShareLink = () => {
    if (!shareToken) return
    const url = `${window.location.origin}/join/${shareToken}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareUrl = shareToken ? `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${shareToken}` : ''

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compartir "{projectName}"</DialogTitle>
          <DialogDescription>Invita personas o comparte un enlace de acceso.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Invite Section - Only for creators/admins */}
          {canManage && (
            <div className="space-y-3">
              <Label>Invitar personas</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Agregar personas por email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1"
                />
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'editor' | 'viewer')}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="editor">Puede editar</SelectItem>
                    <SelectItem value="viewer">Puede ver</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleInvite}
                  disabled={isInviting || !inviteEmail.trim()}
                  className="transition-all duration-200 hover:scale-102 active:scale-98"
                >
                  Invitar
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
          <div className="space-y-3">
            <Label>Personas con acceso</Label>
            <ScrollArea className="h-[160px]">
              <div className="space-y-1 pr-4">
                {members.map((member) => {
                  const profile = getProfile(member)
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
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {initials}
                      </div>
                      <div className="flex flex-1 flex-col overflow-hidden">
                        <span className="text-sm font-medium truncate">
                          {profile?.full_name || 'Sin nombre'}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">{profile?.email}</span>
                      </div>

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
                        <Badge variant={getRoleBadgeVariant(member.role)}>
                          {member.role === 'owner' ? 'Propietario' : member.role === 'editor' ? 'Editor' : 'Viewer'}
                        </Badge>
                      )}

                      {canManage && !isOwner && (
                        <button
                          onClick={() => handleRemove(member.id)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
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

          {/* Share Link Section */}
          {canManage && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    <Label>Enlace de acceso</Label>
                  </div>
                  <Switch checked={shareEnabled} onCheckedChange={handleToggleShareLink} />
                </div>

                {shareEnabled && shareToken ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        value={shareUrl}
                        readOnly
                        className="text-xs bg-muted"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={copyShareLink}
                        className="shrink-0 transition-all duration-200 hover:scale-102 active:scale-98"
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Permiso:</span>
                      <Select value={shareRole} onValueChange={handleShareRoleChange}>
                        <SelectTrigger className="w-32 h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Solo lectura</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cualquier persona con este enlace debe iniciar sesión para acceder.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Solo las personas invitadas pueden acceder.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="transition-all duration-200 hover:scale-102 active:scale-98"
          >
            Listo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
