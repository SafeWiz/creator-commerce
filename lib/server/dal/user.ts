import 'server-only'

import { cache } from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { auth } from '@/lib/server/auth'

// cache() memoizes per render pass, so several components can each ask for the
// current user without re-validating the session every time.
export const getUser = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user ?? null
})

export async function requireUser() {
  const user = await getUser()
  if (!user) {
    redirect('/login')
  }
  return user
}
