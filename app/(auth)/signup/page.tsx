import type { Metadata } from "next"

import { nextPathSchema, oauthAuthorizeQuery } from "@/lib/schemas/auth"
import {
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { SignupForm } from "./signup-form"

export const metadata: Metadata = {
  title: "Sign up",
}

export default async function SignupPage({
  searchParams,
}: PageProps<"/signup">) {
  // Read once: both `next` and the oauth authorize query below come from it.
  const params = await searchParams
  // See the note in the login page: validated on the server before it reaches
  // the client.
  const next = nextPathSchema.parse(params.next)
  // Set when an MCP client's sign-in sent the user here instead of `next` —
  // see lib/schemas/auth.ts.
  const oauthQuery = oauthAuthorizeQuery(params)

  return (
    <>
      <CardHeader>
        <CardTitle className="text-xl">Create your account</CardTitle>
        <CardDescription>Claim your handle and start selling.</CardDescription>
      </CardHeader>
      <SignupForm next={next} oauthQuery={oauthQuery} />
    </>
  )
}
