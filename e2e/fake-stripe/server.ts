/**
 * A fake Stripe, just big enough for one hosted Checkout.
 *
 * Why a server rather than `page.route()`: every Stripe call in this app is made
 * by the Next.js server (lib/server/checkout.ts creates the session,
 * app/checkout/return/route.ts retrieves it), and Playwright can only intercept
 * what the *browser* sends. So the seam is the Stripe SDK's own `host`/`port`/
 * `protocol` options — lib/server/stripe.ts reads them from STRIPE_API_BASE —
 * and this process answers on the other side of it.
 *
 * It plays both of Stripe's roles:
 *
 * - The API: `POST /v1/checkout/sessions` and `GET /v1/checkout/sessions/:id`,
 *   the only two endpoints the purchase path calls. Anything else answers with
 *   a Stripe-shaped 404, so a new call the app starts making fails loudly
 *   instead of being silently stubbed.
 * - The hosted page: a session's `url` points back here, at `/pay/:id`, which
 *   renders a Pay and a Cancel button. Pay marks the session paid and redirects
 *   to its `success_url`, exactly as checkout.stripe.com would.
 *
 * Plus one thing Stripe doesn't have: `GET /__fake/sessions/:id` returns the
 * session together with the parameters it was created with, so a spec can
 * assert on what the app *sent* to Stripe — the line items, the amounts —
 * which is the part a mock exists to check.
 *
 * State is in memory and lives as long as the process. No webhook is sent: the
 * return route fulfils the order on its own, which is the path under test.
 *
 * Run with `npx tsx e2e/fake-stripe/server.ts`; playwright.config.ts does.
 */
import { randomBytes } from 'node:crypto'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'

import { FAKE_STRIPE_URL } from './url'

type Params = Record<string, unknown>

type FakeSession = {
  id: string
  object: 'checkout.session'
  mode: string
  status: 'open' | 'complete' | 'expired'
  payment_status: 'unpaid' | 'paid'
  payment_intent: string | null
  amount_total: number
  currency: string
  customer_email: string | null
  client_reference_id: string | null
  metadata: Record<string, string>
  success_url: string
  cancel_url: string
  expires_at: number
  url: string | null
}

const sessions = new Map<string, { session: FakeSession; params: Params }>()
// Stripe replays the original response for a repeated Idempotency-Key, and
// checkoutAction relies on that (the order id is the key).
const byIdempotencyKey = new Map<string, string>()

const id = (prefix: string) => `${prefix}_fake_${randomBytes(12).toString('hex')}`

/**
 * Stripe's v1 API takes `application/x-www-form-urlencoded` with bracketed
 * keys — `line_items[0][price_data][unit_amount]=500` — so the body has to be
 * folded back into the object the SDK was given.
 */
function parseStripeForm(body: string): Params {
  const root: Params = {}

  for (const [key, value] of new URLSearchParams(body)) {
    const path = key.replace(/\]/g, '').split('[')
    let node = root as Record<string, unknown>
    path.forEach((segment, i) => {
      if (i === path.length - 1) {
        node[segment] = value
      } else {
        node[segment] ??= {}
        node = node[segment] as Record<string, unknown>
      }
    })
  }

  return toArrays(root) as Params
}

// `{ 0: a, 1: b }` → `[a, b]`, recursively.
function toArrays(value: unknown): unknown {
  if (typeof value !== 'object' || value === null) return value
  const entries = Object.entries(value).map(([k, v]) => [k, toArrays(v)] as const)
  const isList = entries.length > 0 && entries.every(([k], i) => k === String(i))
  return isList ? entries.map(([, v]) => v) : Object.fromEntries(entries)
}

function createSession(params: Params): FakeSession {
  const lineItems = (params.line_items ?? []) as Array<{
    quantity: string
    price_data: { currency: string; unit_amount: string }
  }>
  const sessionId = id('cs_test')

  return {
    id: sessionId,
    object: 'checkout.session',
    mode: String(params.mode),
    status: 'open',
    payment_status: 'unpaid',
    payment_intent: null,
    amount_total: lineItems.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.price_data.unit_amount),
      0,
    ),
    currency: lineItems[0]?.price_data.currency ?? 'usd',
    customer_email: (params.customer_email as string) ?? null,
    client_reference_id: (params.client_reference_id as string) ?? null,
    metadata: (params.metadata ?? {}) as Record<string, string>,
    success_url: String(params.success_url),
    cancel_url: String(params.cancel_url),
    expires_at: Number(params.expires_at),
    url: `${FAKE_STRIPE_URL}/pay/${sessionId}`,
  }
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

// The shape the SDK turns into a StripeInvalidRequestError.
function notFound(res: ServerResponse, message: string) {
  json(res, 404, {
    error: { type: 'invalid_request_error', code: 'resource_missing', message },
  })
}

function redirect(res: ServerResponse, location: string) {
  res.writeHead(303, { Location: location })
  res.end()
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString('utf8')
}

function payPage(session: FakeSession): string {
  const amount = (session.amount_total / 100).toFixed(2)
  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>Fake Stripe Checkout</title></head>
  <body>
    <h1>Fake Stripe Checkout</h1>
    <p>Total: ${amount} ${session.currency.toUpperCase()}</p>
    <form method="post" action="/pay/${session.id}"><button>Pay</button></form>
    <form method="post" action="/pay/${session.id}/cancel"><button>Cancel</button></form>
  </body>
</html>`
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', FAKE_STRIPE_URL)
  const path = url.pathname
  let match: RegExpMatchArray | null

  // Playwright's readiness probe.
  if (req.method === 'GET' && path === '/') {
    return json(res, 200, { ok: true })
  }

  // ---- The API ----

  if (req.method === 'POST' && path === '/v1/checkout/sessions') {
    const key = req.headers['idempotency-key']
    const replayed = typeof key === 'string' && byIdempotencyKey.get(key)
    if (replayed) return json(res, 200, sessions.get(replayed)!.session)

    const params = parseStripeForm(await readBody(req))
    const session = createSession(params)
    sessions.set(session.id, { session, params })
    if (typeof key === 'string') byIdempotencyKey.set(key, session.id)

    return json(res, 200, session)
  }

  if (req.method === 'GET' && (match = path.match(/^\/v1\/checkout\/sessions\/([^/]+)$/))) {
    const entry = sessions.get(match[1])
    if (!entry) return notFound(res, `No such checkout.session: '${match[1]}'`)
    return json(res, 200, entry.session)
  }

  // ---- The hosted page ----

  if ((match = path.match(/^\/pay\/([^/]+)(\/cancel)?$/))) {
    const entry = sessions.get(match[1])
    if (!entry) return notFound(res, `No such checkout.session: '${match[1]}'`)
    const { session } = entry
    const cancelling = Boolean(match[2])

    if (req.method === 'GET' && !cancelling) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      return res.end(payPage(session))
    }

    if (req.method === 'POST' && cancelling) {
      return redirect(res, session.cancel_url)
    }

    if (req.method === 'POST') {
      session.status = 'complete'
      session.payment_status = 'paid'
      session.payment_intent = id('pi')
      session.url = null
      // Stripe's own substitution — see success_url in lib/server/checkout.ts.
      return redirect(res, session.success_url.replace('{CHECKOUT_SESSION_ID}', session.id))
    }
  }

  // ---- Test-only introspection ----

  if (req.method === 'GET' && (match = path.match(/^\/__fake\/sessions\/([^/]+)$/))) {
    const entry = sessions.get(match[1])
    if (!entry) return notFound(res, `No such checkout.session: '${match[1]}'`)
    return json(res, 200, entry)
  }

  console.error(`[fake-stripe] unhandled ${req.method} ${path}`)
  notFound(res, `The fake Stripe does not implement ${req.method} ${path}`)
})

const { hostname, port } = new URL(FAKE_STRIPE_URL)
server.listen(Number(port), hostname, () => {
  console.log(`[fake-stripe] listening on ${FAKE_STRIPE_URL}`)
})
