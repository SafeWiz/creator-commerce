"use client"

import type { ComponentProps } from "react"
import Link from "next/link"
import { getToolName, isToolUIPart, type UIMessage } from "ai"
import { Check, Loader2, X } from "lucide-react"
import { Streamdown } from "streamdown"

// Client-side copy of the tool names in lib/server/tools — the registry is
// server-only. An unknown name falls back to the generic label.
const TOOL_LABELS: Record<string, { running: string; done: string }> = {
  get_help_topic: { running: "Checking the guide…", done: "Checked the guide" },
  get_account_status: { running: "Looking at your account…", done: "Looked at your account" },
  list_my_products: { running: "Looking up your products…", done: "Looked up your products" },
  get_my_product: { running: "Opening the product…", done: "Opened the product" },
  get_sales_summary: { running: "Adding up your sales…", done: "Added up your sales" },
  list_recent_sales: { running: "Looking up recent sales…", done: "Looked up recent sales" },
  list_my_purchases: { running: "Looking up your purchases…", done: "Looked up your purchases" },
  list_my_downloads: { running: "Looking up your downloads…", done: "Looked up your downloads" },
  search_marketplace: { running: "Searching the marketplace…", done: "Searched the marketplace" },
}
const FALLBACK_LABEL = { running: "Looking something up…", done: "Looked something up" }

// Shared across tools rather than per-tool: the user doesn't need to know
// which lookup failed, only that this one did.
const TOOL_FAILURE_LABEL = "Couldn't look that up"

// A path on this app. `//` and `/\` are excluded because browsers read both
// as the start of another host. The regex alone would accept inputs like
// `/\t/evil.com`; it is safe because streamdown's default `rehype-harden`
// step normalizes relative hrefs (via `new URL(href, base)`) before
// AnswerLink sees them — overriding streamdown's `rehypePlugins` would need
// this rechecked.
const APP_PATH = /^\/(?![\/\\])/

/**
 * Links in an answer. Only app paths become links: an answer can quote
 * marketplace text other users wrote, and a prompt-injected answer must not be
 * able to hand the user a link off the site. Everything else is plain text.
 * next/link keeps the panel open while the page behind it navigates.
 */
function AnswerLink({ href, children }: ComponentProps<"a">) {
  if (typeof href === "string" && APP_PATH.test(href)) {
    return (
      <Link href={href} className="font-medium text-primary underline underline-offset-2">
        {children}
      </Link>
    )
  }
  return <span>{children}</span>
}

// Images are never rendered: nothing Cece says needs one, and an image url is
// a request to a host of someone else's choosing.
function NoImage() {
  return null
}

const MARKDOWN_COMPONENTS = { a: AnswerLink, img: NoImage }

export function CeceMessage({
  message,
  streaming,
}: {
  message: UIMessage
  // True while this message is the one being streamed.
  streaming: boolean
}) {
  if (message.role === "user") {
    return (
      <div className="ml-8 self-end rounded-lg bg-primary px-3 py-2 text-sm whitespace-pre-wrap text-primary-foreground">
        {message.parts.map((part) => (part.type === "text" ? part.text : "")).join("")}
      </div>
    )
  }

  return (
    <div className="mr-4 flex flex-col gap-2 text-sm">
      {message.parts.map((part, i) => {
        if (part.type === "text") {
          return (
            <Streamdown key={i} components={MARKDOWN_COMPONENTS} isAnimating={streaming}>
              {part.text}
            </Streamdown>
          )
        }
        if (isToolUIPart(part)) {
          const label = TOOL_LABELS[getToolName(part)] ?? FALLBACK_LABEL
          const failed = part.state === "output-error"
          const done = part.state === "output-available"
          return (
            <span
              key={i}
              className="inline-flex w-fit items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
            >
              {failed ? (
                <X className="size-3" />
              ) : done ? (
                <Check className="size-3" />
              ) : (
                <Loader2 className="size-3 animate-spin" />
              )}
              {failed ? TOOL_FAILURE_LABEL : done ? label.done : label.running}
            </span>
          )
        }
        // Step markers, reasoning and anything else carry nothing to show.
        return null
      })}
    </div>
  )
}
