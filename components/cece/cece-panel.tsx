"use client"

import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import type { UseChatHelpers } from "@ai-sdk/react"
import { APICallError, type UIMessage } from "ai"
import { ArrowUp, RotateCcw, Square } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { CeceMessage } from "@/components/cece/cece-message"

// Matches MAX_QUESTION_CHARS in lib/server/request/cece.ts.
const MAX_QUESTION_CHARS = 2000

const STARTERS = [
  "How do I publish a product?",
  "How are my sales this month?",
  "What should I do next?",
]

const GENERIC_ERROR = "Something went wrong."

// A non-OK response is an APICallError whose message is the route's body,
// which is written for the user (401, 429, 400). Anything else — offline, a
// stream cut mid-way, the stream's own error chunk — gets the generic line.
function errorMessage(error: Error) {
  return APICallError.isInstance(error) && error.message ? error.message : GENERIC_ERROR
}

export function CecePanel({
  chat,
  pathname,
}: {
  chat: UseChatHelpers<UIMessage>
  // The page the user is on. Read here, in an event handler, rather than via
  // a ref inside the transport: this component re-renders with the latest
  // value on every navigation, so each send carries the current page without
  // needing a ref to dodge a stale closure in a long-lived object.
  pathname: string
}) {
  const { messages, sendMessage, status, stop, error, regenerate } = chat
  const [input, setInput] = useState("")
  const bottom = useRef<HTMLDivElement>(null)
  const busy = status === "submitted" || status === "streaming"

  // Both a fresh send and a retry must carry the page the user is on: the
  // transport has no body of its own, so whichever call skips this sends no
  // pathname at all.
  const requestOptions = { body: { pathname } }

  // Follow the answer as it streams.
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" })
  }, [messages])

  function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || busy) return
    void sendMessage({ text: trimmed }, requestOptions)
    setInput("")
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter is a new line. isComposing: an IME's Enter
    // confirms a character, it does not send.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      send(input)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-2">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-3 pt-4">
            <p className="text-sm text-muted-foreground">
              Hi, I&apos;m Cece. Ask me how anything works here, or about your products, sales and
              purchases. I can look things up, but I can&apos;t change anything.
            </p>
            <div className="flex flex-col items-start gap-2">
              {STARTERS.map((starter) => (
                <Button key={starter} variant="outline" size="sm" onClick={() => send(starter)}>
                  {starter}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, i) => (
            <CeceMessage
              key={message.id}
              message={message}
              streaming={status === "streaming" && i === messages.length - 1}
            />
          ))
        )}
        {error && (
          <div role="alert" className="flex items-center gap-2 text-sm text-destructive">
            <span>{errorMessage(error)}</span>
            <Button variant="ghost" size="sm" onClick={() => void regenerate(requestOptions)}>
              <RotateCcw /> Retry
            </Button>
          </div>
        )}
        <div ref={bottom} />
      </div>

      <form
        className="flex items-end gap-2 border-t p-3"
        onSubmit={(event) => {
          event.preventDefault()
          send(input)
        }}
      >
        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask Cece…"
          maxLength={MAX_QUESTION_CHARS}
          rows={2}
          className="max-h-40 min-h-10 resize-none"
          aria-label="Message Cece"
        />
        {busy ? (
          <Button type="button" size="icon" variant="outline" onClick={() => void stop()} aria-label="Stop">
            <Square />
          </Button>
        ) : (
          <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Send">
            <ArrowUp />
          </Button>
        )}
      </form>
    </div>
  )
}
