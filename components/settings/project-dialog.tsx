'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { MembersList } from './members-list'
import { updateProject, deleteProject } from '@/lib/actions/settings'
import { getProjectMembers } from '@/lib/actions/projects'

interface Project {
  id: string
  name: string
  description?: string | null
}

interface ProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project
  userRole?: string | null
}

export function ProjectDialog({ open, onOpenChange, project, userRole }: ProjectDialogProps) {
  const router = useRouter()
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description || '')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [members, setMembers] = useState<any[]>([])

  const isOwner = userRole === 'owner'
  const canManage = userRole === 'owner' || userRole === 'editor'

  useEffect(() => {
    if (open) {
      setName(project.name)
      setDescription(project.description || '')
      loadMembers()
    }
  }, [open, project])

  const loadMembers = async () => {
    try {
      const data = await getProjectMembers(project.id)
      setMembers(data || [])
    } catch (error) {
      console.error('Failed to load members:', error)
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    setMessage(null)
    try {
      await updateProject(project.id, { name, description })
      setMessage({ type: 'success', text: 'Proyecto actualizado correctamente.' })
      setTimeout(() => {
        onOpenChange(false)
        router.refresh()
      }, 1000)
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al actualizar el proyecto.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (deleteConfirmName !== project.name) {
      setMessage({ type: 'error', text: 'El nombre del proyecto no coincide.' })
      return
    }

    setIsDeleting(true)
    try {
      await deleteProject(project.id, deleteConfirmName)
      setDeleteConfirmOpen(false)
      onOpenChange(false)
      router.push('/projects')
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al eliminar el proyecto.' })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Configuración del Proyecto</DialogTitle>
            <DialogDescription>Administra la configuración y miembros del proyecto.</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="members">Miembros</TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="projectName">Nombre del proyecto</Label>
                <Input
                  id="projectName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre del proyecto"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="projectDescription">Descripción (opcional)</Label>
                <Textarea
                  id="projectDescription"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe el proyecto..."
                  rows={3}
                />
              </div>

              {message && (
                <p
                  className={`text-sm ${
                    message.type === 'success' ? 'text-coros-positive' : 'text-coros-negative'
                  }`}
                >
                  {message.text}
                </p>
              )}

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
                  {isLoading ? 'Guardando...' : 'Guardar'}
                </Button>
              </DialogFooter>

              {/* Danger Zone */}
              {isOwner && (
                <>
                  <Separator className="my-4" />
                  <div className="space-y-3 rounded-md border border-destructive/30 p-4">
                    <h4 className="text-sm font-medium text-destructive">Zona de peligro</h4>
                    <p className="text-xs text-muted-foreground">
                      Eliminar proyecto — Esta acción no se puede deshacer.
                    </p>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteConfirmOpen(true)}
                      className="transition-all duration-200 hover:scale-102 active:scale-98"
                    >
                      Eliminar proyecto
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Members Tab */}
            <TabsContent value="members" className="py-4">
              <MembersList
                projectId={project.id}
                members={members}
                canManage={canManage}
                onMembersChange={loadMembers}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán permanentemente todos los datos del
              proyecto, incluyendo posts, miembros y configuraciones.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="confirmDelete">
              Escribe <span className="font-semibold">{project.name}</span> para confirmar:
            </Label>
            <Input
              id="confirmDelete"
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder={project.name}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting || deleteConfirmName !== project.name}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar proyecto'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
