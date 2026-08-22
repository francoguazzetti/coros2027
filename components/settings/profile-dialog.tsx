'use client'

import { useState } from 'react'
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
import { updateProfile, requestPasswordReset } from '@/lib/actions/settings'

interface ProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: {
    id: string
    full_name: string | null
    email: string | null
  }
}

export function ProfileDialog({ open, onOpenChange, profile }: ProfileDialogProps) {
  const [fullName, setFullName] = useState(profile.full_name || '')
  const [isLoading, setIsLoading] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSave = async () => {
    setIsLoading(true)
    setMessage(null)
    try {
      await updateProfile(fullName)
      setMessage({ type: 'success', text: 'Perfil actualizado correctamente.' })
      setTimeout(() => onOpenChange(false), 1500)
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al actualizar el perfil.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordReset = async () => {
    setIsResetting(true)
    setMessage(null)
    try {
      await requestPasswordReset()
      setMessage({ type: 'success', text: 'Te enviamos un email para resetear tu contraseña.' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al enviar el email de reseteo.' })
    } finally {
      setIsResetting(false)
    }
  }

  // Get initials for avatar
  const initials = fullName
    ? fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : (profile.email?.[0]?.toUpperCase() || 'U')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Perfil</DialogTitle>
          <DialogDescription>Administra tu información personal.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Avatar */}
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-xl font-semibold text-muted-foreground">
              {initials}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName">Nombre completo</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Tu nombre"
            />
          </div>

          {/* Email (readonly) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={profile.email || ''} disabled className="bg-muted" />
          </div>

          {/* Security */}
          <div className="space-y-2 border-t border-border pt-4">
            <h4 className="text-sm font-medium">Seguridad</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePasswordReset}
              disabled={isResetting}
              className="transition-all duration-200 hover:scale-102 active:scale-98"
            >
              {isResetting ? 'Enviando...' : 'Cambiar contraseña'}
            </Button>
          </div>

          {/* Message */}
          {message && (
            <p
              className={`text-sm ${
                message.type === 'success' ? 'text-claribi-positive' : 'text-claribi-negative'
              }`}
            >
              {message.text}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="transition-all duration-200 hover:scale-102 active:scale-98"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading}
            className="transition-all duration-200 hover:scale-102 active:scale-98"
          >
            {isLoading ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
