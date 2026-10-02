import 'server-only'

import { eq } from 'drizzle-orm'

import db from '@/lib/server/db'
import { oauthApplication } from '@/lib/server/db/schemas/auth'

/**
 * The name an OAuth client registered itself under, for the consent screen.
 *
 * Self-declared: MCP clients register dynamically and choose this string, so
 * the page shows it as the app's own claim, never as something we vouch for.
 */
export async function getOAuthClientName(clientId: string): Promise<string | null> {
  const [row] = await db
    .select({ name: oauthApplication.name })
    .from(oauthApplication)
    .where(eq(oauthApplication.clientId, clientId))
    .limit(1)

  return row?.name ?? null
}
