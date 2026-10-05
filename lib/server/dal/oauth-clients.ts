import 'server-only'

import { desc, eq } from 'drizzle-orm'

import db from '@/lib/server/db'
import {
  oauthAccessToken,
  oauthApplication,
  verification,
} from '@/lib/server/db/schemas/auth'

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
 * The pending authorization a `consent_code` points at, for the consent
 * screen — the client's self-declared name and the single redirect target
 * `/mcp/authorize` actually matched, never the full list a client registered
 * and never the url's own `client_id`.
 *
 * `/oauth/consent` only has the url Better Auth built for it
 * (`authorize.mjs`'s `consentURI`), and that url's `client_id` is exactly the
 * one its own `redirectURI` was matched against — but trusting it anyway
 * would let a client that registered a second, unrelated redirect url (or,
 * in principle, a mismatched `client_id` on the url) dilute or misattribute
 * the warning the page shows. The pending verification row is the one thing
 * `/mcp/authorize` itself wrote, so both the name and the destination are
 * read off it instead: `clientId` and `redirectURI` from its JSON `value`
 * (the same shape `refuseForeignConsent` in `lib/server/auth.ts` already
 * reads through `ctx.context.internalAdapter.findVerificationValue`, which a
 * page can't call).
 *
 * `verification.identifier` holds `consent_code` as issued, not hashed: this
 * app's Better Auth config sets no `verification.storeIdentifier`, so
 * `processIdentifier` (`better-auth/dist/db/verification-token-storage.mjs`)
 * takes its default, unhashed branch.
 *
 * Returns `null` for a code that's missing, expired, or bound to a different
 * user — the three cases the caller folds into the same "This link has
 * expired" card — and also when the client row itself is gone, the same as
 * the old `getOAuthClient` did.
 */
export async function getPendingConsent(
  consentCode: string,
  userId: string,
): Promise<{ name: string | null; target: string | null } | null> {
  // Mirrors findVerificationValue's own `orderBy desc(createdAt) limit 1`:
  // identifier isn't unique in the schema, so this is the same tie-break the
  // library itself would apply, not a new assumption.
  const [pending] = await db
    .select({ value: verification.value, expiresAt: verification.expiresAt })
    .from(verification)
    .where(eq(verification.identifier, consentCode))
    .orderBy(desc(verification.createdAt))
    .limit(1)

  if (!pending || pending.expiresAt < new Date()) return null

  let value: { clientId?: unknown; redirectURI?: unknown; userId?: unknown }
  try {
    value = JSON.parse(pending.value)
  } catch {
    return null
  }

  // JSON.parse("null") succeeds; no Better Auth flow writes it, but a bad row
  // must still land on the "expired" card rather than a 500.
  if (
    !value ||
    typeof value !== 'object' ||
    value.userId !== userId ||
    typeof value.clientId !== 'string' ||
    typeof value.redirectURI !== 'string'
  ) {
    return null
  }

  const [client] = await db
    .select({ name: oauthApplication.name })
    .from(oauthApplication)
    .where(eq(oauthApplication.clientId, value.clientId))
    .limit(1)

  if (!client) return null

  return {
    name: client.name ? truncateName(client.name) : null,
    target: redirectTarget(value.redirectURI),
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
