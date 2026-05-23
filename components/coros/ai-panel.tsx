"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { ArrowRight, Loader2 } from "lucide-react"
import { useState } from "react"

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

export function AIPanel({ suggestedQuestions, projectId }: AIPanelProps) {
  const [input, setInput] = useState("")

  const { messages, sendMessage, status } = useChat({
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
    <div className="flex h-full w-[280px] flex-col border-l border-border bg-background">
      {/* Suggested Questions */}
      <div className="flex flex-1 flex-col overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-end gap-2">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => handleSuggestedQuestion(question.text)}
                disabled={isLoading}
                className="text-right text-sm text-foreground underline underline-offset-4 hover:text-foreground/80 disabled:opacity-50 transition-all duration-200 hover:scale-105 active:scale-95 relative group"
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

        {/* Messages */}
        {messages.length > 0 && (
          <div className="flex flex-col gap-3">
            {messages.map((message) => {
              const text = getUIMessageText(message)
              if (!text) return null
              
              return (
                <div
                  key={message.id}
                  className={`text-sm ${
                    message.role === "user"
                      ? "self-end rounded bg-primary px-3 py-2 text-primary-foreground"
                      : "self-start text-foreground"
                  }`}
                >
                  {text}
                </div>
              )
            })}
            
            {isLoading && (
              <div className="flex items-center gap-2 self-start text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Pensando...
              </div>
            )}
          </div>
        )}
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
