/**
 * EmptyState — componente reutilizable para vistas sin datos.
 *
 * Ejemplos de uso:
 *
 * // Sin candidatos configurados
 * <EmptyState
 *   icon={<Users className="h-8 w-8" />}
 *   title="No hay candidatos configurados"
 *   description="Agregá los candidatos y actores políticos que querés monitorear. Los alias que definas se usan para detectar menciones automáticamente en el texto."
 *   actionLabel="Configurar candidatos"
 *   onAction={() => setCandidatesOpen(true)}
 * />
 *
 * // Sin geografía configurada
 * <EmptyState
 *   icon={<MapPin className="h-8 w-8" />}
 *   title="Territorio sin configurar"
 *   description="Definí el municipio, los IDs de distrito y sección, y cargá los polígonos GeoJSON para que el mapa electoral pueda mostrarse."
 *   actionLabel="Configurar geografía"
 *   onAction={() => setGeographyOpen(true)}
 * />
 *
 * // Sin datos ingestados todavía
 * <EmptyState
 *   icon={<Rss className="h-8 w-8" />}
 *   title="Todavía no hay datos"
 *   description="Las fuentes de datos están configuradas pero aún no se procesaron menciones. Los primeros resultados aparecen dentro de las próximas horas."
 * />
 */

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-md border border-dashed border-border bg-muted/30 px-8 py-14 text-center',
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </div>

      <div className="flex flex-col gap-1.5 max-w-xs">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>

      {actionLabel && onAction && (
        <Button
          size="sm"
          variant="outline"
          onClick={onAction}
          className="mt-1"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
