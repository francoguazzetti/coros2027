'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, User, FolderOpen, Rss, Palette, LogOut, ChevronLeft } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { ProfileDialog } from './profile-dialog'
import { ProjectDialog } from './project-dialog'
import { DataSourcesSheet } from './data-sources-sheet'
import { AppearanceView } from './appearance-view'
import { logout } from '@/lib/actions/auth'
import { cn } from '@/lib/utils'

interface Profile {
  id: string
  full_name: string | null
  email: string | null
  role?: string
}

interface Project {
  id: string
  name: string
  description?: string | null
}

interface SettingsPopoverProps {
  profile: Profile
  project?: Project | null
  userRole?: string | null
}

type View = 'main' | 'appearance'

export function SettingsPopover({ profile, project, userRole }: SettingsPopoverProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>('main')
  const [profileOpen, setProfileOpen] = useState(false)
  const [projectOpen, setProjectOpen] = useState(false)
  const [dataSourcesOpen, setDataSourcesOpen] = useState(false)

  const isCreatorOrAdmin = userRole === 'owner' || userRole === 'editor' || profile.role === 'admin'

  const handleLogout = async () => {
    setOpen(false)
    await logout()
  }

  // Get initials for avatar
  const initials = profile.full_name
    ? profile.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : (profile.email?.[0]?.toUpperCase() || 'U')

  const menuItems = [
    {
      icon: User,
      label: 'Perfil',
      onClick: () => {
        setOpen(false)
        setProfileOpen(true)
      },
    },
    ...(isCreatorOrAdmin && project
      ? [
          {
            icon: FolderOpen,
            label: 'Proyecto',
            onClick: () => {
              setOpen(false)
              setProjectOpen(true)
            },
          },
          {
            icon: Rss,
            label: 'Fuentes de datos',
            onClick: () => {
              setOpen(false)
              setDataSourcesOpen(true)
            },
          },
        ]
      : []),
    {
      icon: Palette,
      label: 'Apariencia',
      onClick: () => setView('appearance'),
    },
  ]

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className="flex items-center justify-center text-foreground hover:text-foreground/80 transition-all duration-200 hover:scale-110 active:scale-95 relative group"
            aria-label="Settings"
            title="Settings"
          >
            <Settings className="h-5 w-5" />
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-foreground rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-200">
              Settings
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="start" className="w-56 p-0">
          {view === 'main' ? (
            <>
              {/* User Header */}
              <div className="flex items-center gap-3 p-3 border-b border-border">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
                  {initials}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-medium text-foreground truncate">
                    {profile.full_name || 'Usuario'}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">{profile.email}</span>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-1">
                {menuItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={item.onClick}
                    className={cn(
                      'flex w-full items-center gap-3 px-3 py-2 text-sm text-foreground',
                      'transition-all duration-200 hover:bg-accent hover:scale-102 active:scale-98'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                ))}
              </div>

              <Separator />

              {/* Logout */}
              <div className="py-1">
                <button
                  onClick={handleLogout}
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-2 text-sm text-destructive',
                    'transition-all duration-200 hover:bg-destructive/10 hover:scale-102 active:scale-98'
                  )}
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Back Button */}
              <button
                onClick={() => setView('main')}
                className="flex w-full items-center gap-2 p-3 text-sm text-muted-foreground border-b border-border hover:bg-accent transition-all duration-200"
              >
                <ChevronLeft className="h-4 w-4" />
                Volver
              </button>

              {/* Appearance View */}
              <AppearanceView />
            </>
          )}
        </PopoverContent>
      </Popover>

      {/* Dialogs */}
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} profile={profile} />

      {project && (
        <>
          <ProjectDialog
            open={projectOpen}
            onOpenChange={setProjectOpen}
            project={project}
            userRole={userRole}
          />
          <DataSourcesSheet
            open={dataSourcesOpen}
            onOpenChange={setDataSourcesOpen}
            projectId={project.id}
          />
        </>
      )}
    </>
  )
}
