"use client"

import { useState } from "react"
import Link from "next/link"

import { authClient } from "@/lib/client/auth"
import { Button } from "@/components/ui/button"
import { CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * One outcome, always.
 *
 * Better Auth spends a dummy token generation and a dummy verification lookup on
 * an unknown address specifically so the response cannot be timed apart from a
 * known one. Branching the UI on that response would hand back the enumeration
 * signal it just paid to suppress — so the confirmation below is rendered on
 * success and on failure alike. The call's result is never even destructured:
 * no error is surfaced, not a rate limit, not a 500, nothing. That is the
 * deliberate trade — the alternative is picking apart which failures are safe
 * to show without leaking whether the address exists, and getting that wrong
 * once reopens the enumeration Better Auth just paid to close.
 */
export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    setPending(true)

    await authClient.requestPasswordReset({
      email: String(formData.get("email")),
      redirectTo: "/reset-password",
    })

    setPending(false)
    setSent(true)
  }

  if (sent) {
    return (
      <CardContent className="flex flex-col gap-3.5">
        <p className="text-sm text-muted-foreground">
          If that email is registered, a reset link is on its way. The link works
          for one hour.
        </p>
        <Button
          variant="outline"
          className="w-full"
          nativeButton={false}
          render={<Link href="/login" />}
        >
          Back to sign in
        </Button>
      </CardContent>
    )
  }

  return (
    <form onSubmit={onSubmit}>
      <CardContent className="flex flex-col gap-3.5">
        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </div>
        <Button type="submit" className="mt-1 w-full" disabled={pending}>
          {pending ? "Sending…" : "Send reset link"}
        </Button>
        <p className="mt-1.5 text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </form>
  )
}
