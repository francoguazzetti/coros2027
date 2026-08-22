export function relativeTime(value: string | null | undefined) {
  if (!value) return 'nunca'

  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return 'nunca'

  const diff = Date.now() - then
  const minutes = Math.floor(diff / 60000)

  if (minutes < 1) return 'ahora'
  if (minutes < 60) return `hace ${minutes} min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`

  const days = Math.floor(hours / 24)
  if (days < 30) return `hace ${days} d`

  const months = Math.floor(days / 30)
  if (months < 12) return `hace ${months} mes${months === 1 ? '' : 'es'}`

  return `hace ${Math.floor(months / 12)} a`
}

export function absoluteDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Staleness bucket used to colour the "last updated" indicator. */
export function freshness(value: string | null | undefined): 'fresh' | 'aging' | 'stale' | 'empty' {
  if (!value) return 'empty'
  const days = (Date.now() - new Date(value).getTime()) / 86_400_000
  if (Number.isNaN(days)) return 'empty'
  if (days <= 2) return 'fresh'
  if (days <= 14) return 'aging'
  return 'stale'
}

export function initialsOf(fullName: string | null, email: string | null) {
  if (fullName?.trim()) {
    return fullName
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  return (email?.[0] ?? 'U').toUpperCase()
}

export function compactNumber(value: number) {
  return new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 }).format(
    value
  )
}
