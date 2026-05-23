'use client'

import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ShareDialog } from './share-dialog'

interface ShareButtonProps {
  projectId: string
  projectName: string
  userRole?: string | null
  shareToken?: string | null
  shareEnabled?: boolean
  shareRole?: string | null
}

export function ShareButton({
  projectId,
  projectName,
  userRole,
  shareToken,
  shareEnabled,
  shareRole,
}: ShareButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 text-sm transition-all duration-200 hover:scale-102 active:scale-98 relative group"
        title="Compartir proyecto"
      >
        <UserPlus className="h-4 w-4 mr-2" />
        Compartir
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-foreground rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-200">
          Compartir proyecto
        </span>
      </Button>

      <ShareDialog
        open={open}
        onOpenChange={setOpen}
        projectId={projectId}
        projectName={projectName}
        userRole={userRole}
        shareToken={shareToken}
        shareEnabled={shareEnabled}
        shareRole={shareRole}
      />
    </>
  )
}
