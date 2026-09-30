"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Plus, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { CecePanel } from "@/components/cece/cece-panel"

/**
 * "Ask Cece" in the dashboard topbar, and the conversation behind it.
 *
 * useChat lives here, not in the sheet: the sheet's content unmounts when it
 * closes, and this component does not — it sits in DashboardShell, which
 * stays mounted across dashboard navigations. So the conversation survives
 * closing the panel and moving between pages; a reload clears it.
 *
 * The sheet is non-modal and ignores outside clicks, so the page behind it
 * stays usable: someone stuck on a form can follow Cece's steps on it.
 */
export function CeceLauncher() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Created once: a new transport per render would make useChat start over.
  // It carries no pathname of its own — CecePanel reads the current one as a
  // prop and sends it per-message, so each request carries the page the user
  // is on at send time without a ref closing over a long-lived transport.
  const [transport] = useState(() => new DefaultChatTransport({ api: "/api/cece" }))
  const chat = useChat({ transport })

  function newChat() {
    void chat.stop()
    chat.setMessages([])
    chat.clearError()
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Sparkles /> Ask Cece
      </Button>
      <Sheet open={open} onOpenChange={setOpen} modal={false} disablePointerDismissal>
        <SheetContent
          side="right"
          showOverlay={false}
          className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md"
        >
          <SheetHeader className="flex-row items-center gap-2 border-b pr-12">
            <SheetTitle>Cece</SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={newChat}
              disabled={chat.messages.length === 0}
            >
              <Plus /> New chat
            </Button>
          </SheetHeader>
          <CecePanel chat={chat} pathname={pathname} />
        </SheetContent>
      </Sheet>
    </>
  )
}
