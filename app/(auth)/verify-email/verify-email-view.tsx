"use client"

import { useState } from "react"
import Link from "next/link"

import { authClient } from "@/lib/client/auth"
import { Button } from "@/components/ui/button"
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * Four states, derived rather than signalled:
 *
 *   verified              → done, regardless of failed — a user who verified via
 *                            a newer link and then clicks an older expired one is
 *                            still verified; showing the expired card would send
 *                            them to a resend button that fails with
 *                            EMAIL_ALREADY_VERIFIED
 *   failed, not verified  → the link expired; offer a fresh one
 *   signed in, unverified → we sent one; offer a resend
 *   signed out            → offer a resend, but ask which address
 *
 * The resend is the one place in this whole surface where a send failure can be
 * reported. /send-verification-email awaits its hook and rethrows, unlike the
 * signup and reset paths, which swallow inside runInBackgroundOrAwait and answer
 * status: true regardless. So this button says what actually happened, and no
 * other view claims a send succeeded.
 */
export function VerifyEmailView({
  failed,
  verified,
  email,
}: {
  failed: boolean
  verified: boolean
  email: string | null
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resent, setResent] = useState(false)

  async function resend(address: string) {
    setPending(true)
    setError(null)

    const { error } = await authClient.sendVerificationEmail({
      email: address,
      callbackURL: "/verify-email",
    })

    setPending(false)

    if (error) {
      setError(error.message ?? "Could not send the email. Please try again.")
      return
    }

    setResent(true)
  }

  if (verified) {
    return (
      <>
        <CardHeader>
          <CardTitle className="text-xl">Email confirmed</CardTitle>
          <CardDescription>
            Thanks — that address is verified.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            nativeButton={false}
            render={<Link href="/dashboard" />}
          >
            Go to your dashboard
          </Button>
        </CardContent>
      </>
    )
  }

  const title = failed ? "This link has expired" : "Confirm your email"
  const description = failed
    ? "Confirmation links work for one hour. We can send another."
    : email
      ? `We sent a link to ${email}.`
      : "Enter your email and we'll send a new link."

  return (
    <>
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3.5">
        {resent && (
          <p className="text-sm text-muted-foreground">
            Sent. Check your inbox.
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}

        {email ? (
          <Button
            className="w-full"
            disabled={pending || resent}
            onClick={() => resend(email)}
          >
            {pending ? "Sending…" : "Resend the link"}
          </Button>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              const formData = new FormData(event.currentTarget)
              void resend(String(formData.get("email")))
            }}
            className="flex flex-col gap-3.5"
          >
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
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Sending…" : "Send a new link"}
            </Button>
          </form>
        )}

        <p className="mt-1.5 text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </>
  )
}
