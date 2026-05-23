"use client"

import { Settings } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface NavItem {
  label: string
  href: string
  isActive?: boolean
  indent?: boolean
}

interface CorosSidebarProps {
  projectName: string
  navItems: NavItem[]
  currentView?: string
}

export function CorosSidebar({ projectName, navItems, currentView }: CorosSidebarProps) {
  return (
    <aside className="flex h-full w-[200px] flex-col border-r border-border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between py-4 px-4 pr-0">
        <Link href="/projects" className="text-sm font-bold text-foreground hover:text-foreground/80 transition-all duration-200 hover:scale-102 active:scale-98 inline-block">
          Coro
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
      </div>
    </aside>
  )
}
