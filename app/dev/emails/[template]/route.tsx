import { render } from '@react-email/components'
import type { NextRequest } from 'next/server'

import { ReceiptEmail, type ReceiptEmailProps } from '@/components/email/receipt'

/**
 * Looking at an email while building it.
 *
 * A route in the app already running rather than the react-email CLI, which
 * boots its own Next app and expects an emails/ directory at the repo root. This
 * gives the same loop — edit, refresh — for no extra dependency.
 *
 * Fixtures live here rather than beside the template: they exist to exercise the
 * layout (a long name that has to wrap, a zero price), and nothing in production
 * should be able to import them.
 */
const APP_URL = process.env.APP_URL ?? 'http://localhost:3000'

const FIXTURES: { receipt: ReceiptEmailProps } = {
  receipt: {
    orderId: '3f1c0b8e-9d2a-4f77-9a1e-5c6f2b7d8e90',
    appUrl: APP_URL,
    items: [
      {
        productId: 1,
        productName: 'Lightroom Presets — Golden Hour',
        priceInCents: 12900,
      },
      {
        productId: 2,
        productName:
          'A deliberately long product name that has to wrap inside a narrow email column without pushing the price out of alignment',
        priceInCents: 4900,
      },
      { productId: 3, productName: 'Free sample pack', priceInCents: 0 },
    ],
  },
}

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<'/dev/emails/[template]'>,
) {
  // Before anything renders. This route exposes fixtures and, later, a send
  // trigger; neither belongs to a deployed app.
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not found', { status: 404 })
  }

  const { template } = await ctx.params
  if (template !== 'receipt') {
    return new Response(`Unknown template: ${template}`, { status: 404 })
  }

  const html = await render(<ReceiptEmail {...FIXTURES.receipt} />)

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
