import type { Metadata } from "next"
import Link from "next/link"

import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

import { ResetPasswordForm } from "./reset-password-form"

export const metadata: Metadata = {
  title: "Choose a new password",
}

/**
 * Reached from the email, by way of Better Auth.
 *
 * The emailed link points at /api/auth/reset-password/<token>, which validates
 * the token and only then redirects here with ?token=, or with
 * ?error=INVALID_TOKEN when it is expired or forged. So the token this page
 * receives has already been checked, and an error here is an ordinary outcome —
 * mail sits in inboxes for days — rather than something to throw over.
 */
export default async function ResetPasswordPage({
  searchParams,
}: PageProps<"/reset-password">) {
  const params = await searchParams
  const token = typeof params.token === "string" ? params.token : null

  if (!token) {
    return (
      <>
        <CardHeader>
          <CardTitle className="text-xl">This link has expired</CardTitle>
          <CardDescription>
            Reset links work for one hour. Ask for a fresh one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            nativeButton={false}
            render={<Link href="/forgot-password" />}
          >
            Send a new link
          </Button>
        </CardContent>
      </>
    )
  }

  return (
    <>
      <CardHeader>
        <CardTitle className="text-xl">Choose a new password</CardTitle>
        <CardDescription>
          You&apos;ll sign in with this from now on.
        </CardDescription>
      </CardHeader>
      <ResetPasswordForm token={token} />
    </>
  )
}
