'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'

const themes = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
] as const

export function AppearanceView() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="space-y-3 p-2">
      <h4 className="text-sm font-medium text-foreground px-2">Apariencia</h4>
      <div className="grid grid-cols-3 gap-2">
        {themes.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-md border p-2 transition-all duration-200 hover:scale-102 active:scale-98',
              theme === value
                ? 'border-primary bg-primary/10'
                : 'border-border bg-background hover:bg-accent'
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="text-xs">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
