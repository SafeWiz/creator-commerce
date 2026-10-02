import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { z } from "zod"

import { getOAuthClientName } from "@/lib/server/dal/oauth-clients"
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

// Better Auth's mcp plugin sends the browser here with these three, after the
// user has signed in. `scope` is not read: the access is the same fixed,
// read-only set whatever a client asks for.
const paramsSchema = z.object({
  consent_code: z.string().min(1).max(512),
  client_id: z.string().min(1).max(255),
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

  const name = params.success ? await getOAuthClientName(params.data.client_id) : null

  if (!params.success || !name) {
    return (
      <CardHeader>
        <CardTitle className="text-xl">This link has expired</CardTitle>
        <CardDescription>
          Start connecting again from the app you were setting up.
        </CardDescription>
      </CardHeader>
    )
  }

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
        <ConsentForm consentCode={params.data.consent_code} />
      </CardContent>
    </>
  )
}
