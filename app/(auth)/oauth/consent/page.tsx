import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { z } from "zod"

import { getOAuthClient } from "@/lib/server/dal/oauth-clients"
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

// Better Auth's mcp plugin sends the browser here with these two, plus
// `scope`, after the user has signed in. `scope` is not read: the access is
// the same fixed, read-only set whatever a client asks for.
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

  // A client that never registered (or whose row is gone) keeps the
  // "expired" card — nothing was approved, so nothing to show. A client that
  // registered without a name, or with an empty string, is a different case:
  // it exists, so it gets "An unnamed app" instead.
  const client = params.success ? await getOAuthClient(params.data.client_id) : null

  if (!params.success || !client) {
    return (
      <CardHeader>
        <CardTitle className="text-xl">This link has expired</CardTitle>
        <CardDescription>
          Start connecting again from the app you were setting up.
        </CardDescription>
      </CardHeader>
    )
  }

  const name = client.name && client.name.length > 0 ? client.name : "An unnamed app"

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
        {client.redirectTargets.length > 0 && (
          <p className="text-sm text-muted-foreground">
            After you allow, you&rsquo;ll be sent to{" "}
            {client.redirectTargets.map((target, index) => (
              <span key={target}>
                {index > 0 &&
                  (index === client.redirectTargets.length - 1 ? " or " : ", ")}
                <strong>{target}</strong>
              </span>
            ))}
            .
          </p>
        )}
        <ConsentForm consentCode={params.data.consent_code} />
      </CardContent>
    </>
  )
}
