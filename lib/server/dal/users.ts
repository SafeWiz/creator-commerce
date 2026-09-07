import 'server-only'

import { cache } from 'react'
import { eq } from 'drizzle-orm'

import db from '@/lib/server/db'
import { user } from '@/lib/server/db/schemas/auth'

// What a storefront needs to render a seller. Deliberately narrow: email and
// the rest of the auth row have no business on a public page.
export type PublicUser = {
  id: string
  name: string
  handle: string
  image: string | null
}

// Handles are stored without the leading "@" (see the signup form's
// [a-z0-9_-]{3,30} pattern) — the URL segment is what carries it, so callers
// strip it before calling this.
//
// cache()d because a storefront request resolves the same handle three times:
// the layout, the page, and generateMetadata.
export const getUserByHandle = cache(
  async (handle: string): Promise<PublicUser | null> => {
    const [found] = await db
      .select({
        id: user.id,
        name: user.name,
        handle: user.handle,
        image: user.image,
      })
      .from(user)
      .where(eq(user.handle, handle))
      .limit(1)

    return found ?? null
  },
)

/**
 * The address a transactional email goes to.
 *
 * The account email rather than what Stripe collected: this is where /purchases
 * and, later, password reset already live, and Stripe's field is whatever the
 * buyer typed into a checkout form — not necessarily an address tied to any
 * account.
 *
 * Not cache()d, unlike getUserByHandle: the caller is a webhook, not a render
 * pass, and it asks once.
 */
export async function getUserEmail(userId: string): Promise<string | null> {
  const [found] = await db
    .select({ email: user.email })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)

  return found?.email ?? null
}
