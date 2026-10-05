"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"

const FAILED = "Could not complete the connection. Start again from your app."

// Mirrors Better Auth's isSafeUrlScheme
// (@better-auth/core/utils/url, DANGEROUS_URL_SCHEMES) rather than importing
// it: that package sits on the server side of the client/server boundary
// this app draws for auth code, and the rule itself is three literal
// strings, cheap to keep in sync by hand. A redirect uri is registered by
// the client itself at /mcp/register, unauthenticated — these are the only
// three schemes a browser would actually act on if asked to navigate there
// (javascript: runs script, data: and vbscript: can render or execute
// content), so excluding exactly them is what lets every other scheme,
// including a desktop client's own custom one (e.g. cursor://), be followed.
const DANGEROUS_SCHEMES = new Set(["javascript:", "data:", "vbscript:"])

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

    // The redirect uri was registered by the client itself. Any scheme is
    // followed except the three a browser would act on if navigated to
    // directly (see isSafeUrlScheme above) — including a custom one like
    // cursor://, which http(s)-only used to block. window.location.href,
    // not an http client or fetch, so the browser itself resolves a custom
    // scheme to whatever app registered as its handler.
    let url: URL | null = null
    try {
      url = target ? new URL(target) : null
    } catch {
      url = null
    }
    if (!url || DANGEROUS_SCHEMES.has(url.protocol)) {
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
