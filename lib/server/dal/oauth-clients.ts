import 'server-only'

import { eq } from 'drizzle-orm'

import db from '@/lib/server/db'
import { oauthAccessToken, oauthApplication } from '@/lib/server/db/schemas/auth'

const DANGEROUS_SCHEMES = new Set(['javascript:', 'data:', 'vbscript:'])
const MAX_NAME_LENGTH = 80

function truncateName(name: string): string {
  return name.length > MAX_NAME_LENGTH ? `${name.slice(0, MAX_NAME_LENGTH)}…` : name
}

/**
 * Reduces a registered redirect url to what the consent page shows as "where
 * Allow sends you": the origin for http(s), or `scheme:` plus everything
 * before any `?` for a custom scheme (e.g. a desktop client's own
 * `myapp://callback`). Never the full url — a query string can carry a state
 * or code value that means nothing to a user and is not this page's business
 * to show.
 */
function redirectTarget(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.origin
  if (DANGEROUS_SCHEMES.has(parsed.protocol)) return null
  // Not http(s): the url itself already reads as "scheme:" followed by
  // whatever the client put after it, so trimming the query is enough.
  return url.split('?')[0]
}

/**
 * The OAuth client's self-declared name and registered redirect targets, for
 * the consent screen.
 *
 * The name is self-declared: MCP clients register dynamically and choose
 * this string, so the page shows it as the app's own claim, never as
 * something we vouch for. `redirectUrls` is stored comma-joined (the mcp
 * plugin's own format, split with `.split(',')` wherever it reads the
 * column), so a client that registered more than one redirect url shows more
 * than one target.
 */
export async function getOAuthClient(
  clientId: string,
): Promise<{ name: string | null; redirectTargets: string[] } | null> {
  const [row] = await db
    .select({ name: oauthApplication.name, redirectUrls: oauthApplication.redirectUrls })
    .from(oauthApplication)
    .where(eq(oauthApplication.clientId, clientId))
    .limit(1)

  if (!row) return null

  const redirectTargets = (row.redirectUrls ?? '')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean)
    .map(redirectTarget)
    .filter((target): target is string => target !== null)

  return {
    name: row.name ? truncateName(row.name) : null,
    redirectTargets,
  }
}

/**
 * Deletes every OAuth access/refresh token issued to this user, across every
 * client they connected.
 *
 * Called from Better Auth's `emailAndPassword.onPasswordReset` (lib/server/auth.ts):
 * `revokeSessionsOnPasswordReset` revokes sessions, not OAuth tokens, and a
 * password reset exists to lock out whoever else had access — an MCP client
 * authorized before the reset would otherwise keep working after it.
 */
export async function deleteUserOAuthTokens(userId: string): Promise<void> {
  await db.delete(oauthAccessToken).where(eq(oauthAccessToken.userId, userId))
}
