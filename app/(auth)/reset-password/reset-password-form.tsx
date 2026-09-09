"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { authClient } from "@/lib/client/auth"
import { PASSWORD_MIN_LENGTH } from "@/lib/schemas/auth"
import { Button } from "@/components/ui/button"
import { CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * The token arrives already validated by Better Auth's endpoint — this form
 * spends it, it does not check it.
 *
 * No auto sign-in afterwards, unlike email verification: that token confirms an
 * address, this one changes a credential, and the two do not deserve the same
 * trust. Better Auth does not sign the user in here either.
 */
export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const password = String(formData.get("password"))

    if (password !== String(formData.get("confirm"))) {
      setError("Those passwords don't match.")
      return
    }

    setPending(true)
    setError(null)

    const { error } = await authClient.resetPassword({
      newPassword: password,
      token,
    })

    if (error) {
      setError(error.message ?? "Could not reset your password. Please try again.")
      setPending(false)
      return
    }

    router.push("/login")
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit}>
      <CardContent className="flex flex-col gap-3.5">
        <div className="grid gap-1.5">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={PASSWORD_MIN_LENGTH}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="confirm">Confirm new password</Label>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            minLength={PASSWORD_MIN_LENGTH}
            required
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="mt-1 w-full" disabled={pending}>
          {pending ? "Saving…" : "Save new password"}
        </Button>
      </CardContent>
    </form>
  )
}
