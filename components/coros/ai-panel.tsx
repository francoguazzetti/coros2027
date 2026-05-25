"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { ArrowRight, Loader2, AlertCircle } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

interface SuggestedQuestion {
  text: string
}

interface AIPanelProps {
  suggestedQuestions: SuggestedQuestion[]
  projectId: string
}

function getUIMessageText(msg: { parts?: Array<{ type: string; text?: string }> }): string {
  if (!msg.parts || !Array.isArray(msg.parts)) return ""
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text)
    .join("")
}

const MIN_WIDTH = 220
const MAX_WIDTH = 600
const DEFAULT_WIDTH = 280

export function AIPanel({ suggestedQuestions, projectId }: AIPanelProps) {
  const [input, setInput] = useState("")
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(DEFAULT_WIDTH)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true
    startX.current = e.clientX
    startWidth.current = width
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
  }, [width])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      // Panel is on the right, so dragging left (negative delta) makes it wider
      const delta = startX.current - e.clientX
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta))
      setWidth(next)
    }
    const onMouseUp = () => {
      if (!isDragging.current) return
      isDragging.current = false
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }
  }, [])

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ id, messages }) => ({
        body: {
          messages,
          id,
          projectId,
        },
      }),
    }),
  })

  const isLoading = status === "streaming" || status === "submitted"

  // Visible messages only — skip tool-call/tool-result steps
  const visibleMessages = messages
    .map((m) => ({ ...m, text: getUIMessageText(m) }))
    .filter((m) => m.text.length > 0)

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [visibleMessages.length, isLoading])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput("")
  }

  const handleSuggestedQuestion = (question: string) => {
    if (isLoading) return
    sendMessage({ text: question })
  }

  return (
    <div
      className="relative flex h-full flex-col border-l border-border bg-background"
      style={{ width }}
    >
      {/* Drag handle */}
      <div
        onMouseDown={onMouseDown}
        className="absolute left-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/30 transition-colors"
        title="Drag to resize"
      />
      {/* Messages / Suggested questions */}
      <div className="flex flex-1 flex-col overflow-y-auto p-4">

        {/* Suggested questions — only before first message */}
        {messages.length === 0 && (
          <div className="flex flex-col items-end gap-2">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => handleSuggestedQuestion(question.text)}
                disabled={isLoading}
                className="text-right text-sm text-foreground underline underline-offset-4 hover:text-foreground/80 disabled:opacity-50 transition-all duration-200 hover:scale-102 active:scale-98 relative group"
                title={question.text}
              >
                {question.text}
                <span className="absolute bottom-full right-0 mb-2 px-2 py-1 text-xs text-white bg-foreground rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-200">
                  {question.text}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Conversation */}
        {visibleMessages.length > 0 && (
          <div className="flex flex-col gap-3">
            {visibleMessages.map((message) => (
              <div
                key={message.id}
                className={`text-sm ${
                  message.role === "user"
                    ? "self-end rounded bg-primary px-3 py-2 text-primary-foreground"
                    : "self-start text-foreground"
                }`}
              >
                {message.text}
              </div>
            ))}

            {/* Spinner — shown while loading AND no partial assistant text yet */}
            {isLoading && (
              <div className="flex items-center gap-2 self-start text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Consultando datos...
              </div>
            )}

            {/* Error state */}
            {error && !isLoading && (
              <div className="flex items-center gap-2 self-start text-sm text-destructive">
                <AlertCircle className="h-3 w-3" />
                Ocurrió un error. Intentá de nuevo.
              </div>
            )}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-border p-4">
        <div className="flex items-center gap-2 border border-border bg-input px-3 py-2 rounded-[5px] transition-all duration-200 focus-within:ring-2 focus-within:ring-ring/50">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder=""
            disabled={isLoading}
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="text-foreground hover:text-foreground/80 disabled:opacity-50 transition-all duration-200 hover:scale-110 active:scale-95 relative group"
            aria-label="Send message"
            title="Send message"
          >
            <ArrowRight className="h-4 w-4" />
            <span className="absolute bottom-full right-0 mb-2 px-2 py-1 text-xs text-white bg-foreground rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-200">
              Send
            </span>
          </button>
        </div>
      </form>
    </div>
  )
}
