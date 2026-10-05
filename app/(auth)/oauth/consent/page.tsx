import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { z } from "zod"

import { getPendingConsent } from "@/lib/server/dal/oauth-clients"
import { getUser } from "@/lib/server/request/session"
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { ConsentForm } from "./consent-form"

export const metadata: Metadata = {
  title: "Connect an app",
}

// Better Auth's mcp plugin sends the browser here with this, plus `client_id`
// and `scope`, after the user has signed in. Neither of those is read: the
// client and the redirect target it shows come from the pending consent row
// the code itself points at (getPendingConsent), not the url, and the access
// is the same fixed, read-only set whatever a client asks for.
const paramsSchema = z.object({
  consent_code: z.string().min(1).max(512),
})

export default async function ConsentPage({
  searchParams,
}: PageProps<"/oauth/consent">) {
  const params = paramsSchema.safeParse(await searchParams)
  // The plugin only redirects here with a session, so no session means the
  // tab sat open past it. Signing in again restarts nothing — the client has
  // to start over — but it is the page that explains itself.
  const user = await getUser()
  if (!user) redirect("/login")

  // getPendingConsent reads the client and the destination off the code's
  // own pending verification row, scoped to this user — a code that's
  // missing, expired, or bound to someone else, or whose client row is gone,
  // all collapse to the same "expired" card below. A client that registered
  // without a name, or with an empty string, is a different case: it exists,
  // so it gets "An unnamed app" instead.
  const pending = params.success
    ? await getPendingConsent(params.data.consent_code, user.id)
    : null

  if (!params.success || !pending) {
    return (
      <CardHeader>
        <CardTitle className="text-xl">This link has expired</CardTitle>
        <CardDescription>
          Start connecting again from the app you were setting up.
        </CardDescription>
      </CardHeader>
    )
  }

  const name = pending.name && pending.name.length > 0 ? pending.name : "An unnamed app"

  return (
    <>
      <CardHeader>
        <CardTitle className="text-xl">
          &ldquo;{name}&rdquo; wants to connect to your account
        </CardTitle>
        <CardDescription>
          It will be able to read your products, sales, purchases, downloads
          and account basics. It cannot change anything.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3.5">
        <p className="text-sm text-muted-foreground">
          The name is chosen by the app itself. Only allow apps you set up
          yourself, signed in as {user.email}.
        </p>
        {pending.target && (
          <p className="text-sm text-muted-foreground">
            After you allow, you&rsquo;ll be sent to <strong>{pending.target}</strong>.
          </p>
        )}
        <ConsentForm consentCode={params.data.consent_code} />
      </CardContent>
    </>
  )
}
