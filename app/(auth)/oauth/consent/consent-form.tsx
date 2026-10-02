"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"

const FAILED = "Could not complete the connection. Start again from your app."

/**
 * Posts the user's answer to Better Auth, which replies with where to send the
 * browser: back to the app with a code on Allow, or with access_denied on
 * Deny. Either way the app, not this page, shows what happens next.
 */
export function ConsentForm({ consentCode }: { consentCode: string }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function respond(accept: boolean) {
    setPending(true)
    setError(null)

    const response = await fetch("/api/auth/oauth2/consent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accept, consent_code: consentCode }),
    }).catch(() => null)
    const data: unknown = await response?.json().catch(() => null)
    const target =
      response?.ok && typeof data === "object" && data !== null && "redirectURI" in data
        ? String(data.redirectURI)
        : null

    // The redirect uri was registered by the client itself; only an http(s)
    // one is followed, so a registered javascript: uri cannot run here.
    let url: URL | null = null
    try {
      url = target ? new URL(target) : null
    } catch {
      url = null
    }
    if (!url || (url.protocol !== "https:" && url.protocol !== "http:")) {
      setError(FAILED)
      setPending(false)
      return
    }

    window.location.href = url.href
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <Button onClick={() => void respond(true)} disabled={pending}>
        Allow
      </Button>
      <Button variant="outline" onClick={() => void respond(false)} disabled={pending}>
        Deny
      </Button>
    </div>
  )
}
