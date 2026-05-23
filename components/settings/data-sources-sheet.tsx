'use client'

import { useState, useEffect, KeyboardEvent } from 'react'
import { X, Plus } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getProjectSettings, updateProjectSettings } from '@/lib/actions/settings'
import { cn } from '@/lib/utils'

interface RssFeed {
  url: string
  name: string
  enabled: boolean
}

interface DataSourcesSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
}

export function DataSourcesSheet({ open, onOpenChange, projectId }: DataSourcesSheetProps) {
  const [rssFeeds, setRssFeeds] = useState<RssFeed[]>([])
  const [keywords, setKeywords] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // New feed form
  const [newFeedUrl, setNewFeedUrl] = useState('')
  const [newFeedName, setNewFeedName] = useState('')
  const [showNewFeedForm, setShowNewFeedForm] = useState(false)

  // New keyword
  const [newKeyword, setNewKeyword] = useState('')

  useEffect(() => {
    if (open) {
      loadSettings()
    }
  }, [open, projectId])

  const loadSettings = async () => {
    setIsLoading(true)
    try {
      const settings = await getProjectSettings(projectId)
      setRssFeeds(settings.rss_feeds || [])
      setKeywords(settings.keywords || [])
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setMessage(null)
    try {
      await updateProjectSettings(projectId, {
        rss_feeds: rssFeeds,
        keywords: keywords,
      })
      setMessage({ type: 'success', text: 'Configuración guardada correctamente.' })
      setTimeout(() => onOpenChange(false), 1500)
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al guardar la configuración.' })
    } finally {
      setIsSaving(false)
    }
  }

  // RSS Feed handlers
  const toggleFeed = (index: number) => {
    const updated = [...rssFeeds]
    updated[index].enabled = !updated[index].enabled
    setRssFeeds(updated)
  }

  const removeFeed = (index: number) => {
    setRssFeeds(rssFeeds.filter((_, i) => i !== index))
  }

  const addFeed = () => {
    if (!newFeedUrl.trim() || !newFeedName.trim()) return
    setRssFeeds([...rssFeeds, { url: newFeedUrl, name: newFeedName, enabled: true }])
    setNewFeedUrl('')
    setNewFeedName('')
    setShowNewFeedForm(false)
  }

  // Keyword handlers
  const handleKeywordKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && newKeyword.trim()) {
      e.preventDefault()
      const keyword = newKeyword.trim().replace(/,+$/, '')
      if (keyword && !keywords.includes(keyword)) {
        setKeywords([...keywords, keyword])
      }
      setNewKeyword('')
    }
  }

  const removeKeyword = (index: number) => {
    setKeywords(keywords.filter((_, i) => i !== index))
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-96">
        <SheetHeader>
          <SheetTitle>Fuentes de datos</SheetTitle>
          <SheetDescription>Configura las fuentes RSS y palabras clave.</SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-6 py-6">
            {/* RSS Feeds Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">RSS / Medios locales</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewFeedForm(!showNewFeedForm)}
                  className="h-7 text-xs transition-all duration-200 hover:scale-102"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Agregar
                </Button>
              </div>

              {/* New Feed Form */}
              {showNewFeedForm && (
                <div className="space-y-2 p-3 border border-border rounded-md bg-muted/30">
                  <Input
                    placeholder="URL del feed"
                    value={newFeedUrl}
                    onChange={(e) => setNewFeedUrl(e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    placeholder="Nombre"
                    value={newFeedName}
                    onChange={(e) => setNewFeedName(e.target.value)}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={addFeed}
                      disabled={!newFeedUrl.trim() || !newFeedName.trim()}
                      className="flex-1 transition-all duration-200 hover:scale-102 active:scale-98"
                    >
                      Confirmar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowNewFeedForm(false)
                        setNewFeedUrl('')
                        setNewFeedName('')
                      }}
                      className="transition-all duration-200 hover:scale-102 active:scale-98"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {/* Feeds List */}
              <div className="space-y-2">
                {rssFeeds.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No hay fuentes configuradas.
                  </p>
                ) : (
                  rssFeeds.map((feed, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-accent transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-3 flex-1 overflow-hidden">
                        <Switch
                          checked={feed.enabled}
                          onCheckedChange={() => toggleFeed(index)}
                        />
                        <div className="overflow-hidden">
                          <p className="text-sm font-medium truncate">{feed.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{feed.url}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFeed(index)}
                        className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <Separator />

            {/* Keywords Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Palabras clave</h4>
              <p className="text-xs text-muted-foreground">
                Las palabras clave se usan para filtrar artículos relevantes.
              </p>

              <Input
                placeholder="Escribe y presiona Enter o coma"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={handleKeywordKeyDown}
                className="text-sm"
              />

              {/* Keywords Tags */}
              <div className="flex flex-wrap gap-2">
                {keywords.map((keyword, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-muted rounded-full transition-all duration-200 hover:bg-muted/80"
                  >
                    {keyword}
                    <button
                      onClick={() => removeKeyword(index)}
                      className="hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {keywords.length === 0 && (
                  <p className="text-sm text-muted-foreground">Sin palabras clave configuradas.</p>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="pt-4">
          {message && (
            <p
              className={cn(
                'text-sm mr-auto',
                message.type === 'success' ? 'text-coros-positive' : 'text-coros-negative'
              )}
            >
              {message.text}
            </p>
          )}
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="transition-all duration-200 hover:scale-102 active:scale-98"
          >
            {isSaving ? 'Guardando...' : 'Guardar configuración'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
