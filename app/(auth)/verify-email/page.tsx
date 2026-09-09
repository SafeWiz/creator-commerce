import type { Metadata } from "next"

import { getUser } from "@/lib/server/request/session"

import { VerifyEmailView } from "./verify-email-view"

export const metadata: Metadata = {
  title: "Confirm your email",
}

/**
 * One page for both arrivals: the emailed link, and the banner.
 *
 * They are told apart without a marker in the url, because the session already
 * answers it. autoSignInAfterVerification means whoever followed the link is
 * signed in by the time this renders, with emailVerified true — so a verified
 * session *is* the success state.
 *
 * getUser rather than requireUser: someone can land here signed out, from a link
 * opened in another browser, and bouncing them to /login would strand a
 * perfectly good token outcome behind a password prompt.
 */
export default async function VerifyEmailPage({
  searchParams,
}: PageProps<"/verify-email">) {
  const params = await searchParams
  const failed = typeof params.error === "string"
  const user = await getUser()

  return (
    <VerifyEmailView
      failed={failed}
      verified={user?.emailVerified ?? false}
      email={user?.email ?? null}
    />
  )
}
