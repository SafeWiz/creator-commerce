import 'server-only'

import Stripe from 'stripe'

/**
 * The Stripe client, one per process — the sibling of lib/server/db/index.ts.
 *
 * apiVersion is pinned rather than left to follow the account's dashboard
 * setting: unpinned, someone flipping a version in the Stripe dashboard changes
 * the shape of responses this codebase already has types for, and it surfaces at
 * runtime instead of at compile time. This is the version stripe@22.5.0's typings
 * are generated against (node_modules/stripe/cjs/apiVersion.js).
 *
 * maxNetworkRetries is Stripe's own retry, and it is idempotency-aware — so a
 * session create that times out mid-flight retries under the same key rather than
 * charging twice.
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-07-29.dahlia',
  maxNetworkRetries: 2,
  ...apiBaseOverride(),
})

/**
 * Points the SDK somewhere other than api.stripe.com — the e2e suite's fake
 * (e2e/fake-stripe/server.ts), which playwright.config.ts starts and hands to
 * the dev server as STRIPE_API_BASE. Ignored in a production build, so a stray
 * variable can never send real payments to the wrong host.
 */
function apiBaseOverride(): Pick<
  Stripe.StripeConfig,
  'host' | 'port' | 'protocol'
> {
  const base = process.env.STRIPE_API_BASE
  if (!base || process.env.NODE_ENV === 'production') return {}

  const url = new URL(base)
  return {
    host: url.hostname,
    port: url.port,
    protocol: url.protocol === 'http:' ? 'http' : 'https',
  }
}
