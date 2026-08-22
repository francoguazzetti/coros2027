"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { SettingsPopover } from "@/components/settings/settings-popover"

interface NavItem {
  label: string
  href: string
  isActive?: boolean
  indent?: boolean
}

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

interface ClariBISidebarProps {
  projectName: string
  navItems: NavItem[]
  currentView?: string
  profile?: Profile | null
  project?: Project | null
  userRole?: string | null
}

export function ClariBISidebar({ 
  projectName, 
  navItems, 
  currentView,
  profile,
  project,
  userRole,
}: ClariBISidebarProps) {
  return (
    <aside className="flex h-full w-[200px] flex-col border-r border-border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between py-4 px-4 pr-0">
        <Link href="/projects" className="text-sm font-bold text-foreground hover:text-foreground/80 transition-all duration-200 hover:scale-102 active:scale-98 inline-block">
          ClariBI
        </Link>
        <span className="text-sm font-bold text-foreground">{projectName}</span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col px-4 py-2 pr-[13px]">
        {navItems.map((item, index) => {
          const isActive = item.isActive || item.href === currentView
          const isSection = !item.indent
          return (
            <Link
              key={index}
              href={item.href}
              className={cn(
                "py-1 text-sm text-foreground transition-all duration-200 hover:text-foreground/80 hover:scale-102 active:scale-98 inline-block",
                item.indent && "pl-4",
                isSection && "underline underline-offset-4 mb-1",
                isActive && item.indent && "font-medium"
              )}
              title={item.label}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Settings */}
      <div className="px-4 py-4">
        {profile ? (
          <SettingsPopover 
            profile={profile} 
            project={project} 
            userRole={userRole} 
          />
        ) : (
          <div className="h-5 w-5" /> // Placeholder while loading
        )}
      </div>
    </aside>
  )
}
