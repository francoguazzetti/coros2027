"use client"

import { useTransition } from "react"
import { NewsCard } from "@/components/claribi/comment-card"
import type { NewsArticle } from "@/components/claribi/comment-card"
import { deleteArticulo } from "@/lib/actions/settings"

interface NewsListClientProps {
  articles: (NewsArticle & { filterBySourceHref?: string })[]
  projectId: string
}

export function NewsListClient({ articles, projectId }: NewsListClientProps) {
  const [pending, startTransition] = useTransition()

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteArticulo(id, projectId)
    })
  }

  if (articles.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Sin resultados para los filtros seleccionados.</p>
  }

  return (
    <div className="space-y-3">
      {articles.map((article) => (
        <div key={article.id}>
          <NewsCard
            article={article}
            onDelete={handleDelete}
            deleting={pending}
          />
          {article.filterBySourceHref && (
            <div className="mt-1 ml-1">
              <a
                href={article.filterBySourceHref}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              >
                Filtrar por {article.source}
              </a>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
