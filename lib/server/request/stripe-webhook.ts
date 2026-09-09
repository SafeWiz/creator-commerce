import 'server-only'

import type Stripe from 'stripe'

import { deletePendingCheckoutSession } from '@/lib/server/dal/purchases'
import { stripe } from '@/lib/server/stripe'
import { fulfillAndNotify } from './checkout'

/**
 * Stripe's side of the flow. Mounted at app/api/stripe/webhook/route.ts.
 *
 * Here rather than in lib/server/checkout.ts because it is a route handler in
 * everything but name: it reads a raw body, reads a signature header, and
 * answers in status codes. Keeping it next to the pure fulfilment logic made
 * that module's own docblock false and made a fulfillAndNotify wrapper
 * impossible without an import cycle.
 *
 * Status codes are the contract here, not decoration: 400 tells Stripe the
 * request was never valid, 500 asks it to retry with backoff, and 200 means done
 * — including for events we do not handle, since anything else marks the
 * endpoint as failing in the dashboard.
 */
export async function handleStripeWebhook(request: Request): Promise<Response> {
  // Before anything else, and text() rather than json(): the signature covers the
  // raw bytes, so re-serialising a parsed body would invalidate it.
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    )
  } catch (error) {
    // A 400 here means the secret is wrong or the request is forged. Stripe will
    // retry and keep failing, which is the point — this should be loud rather
    // than silently swallowed with a 200.
    const message = error instanceof Error ? error.message : 'Invalid signature'
    console.error(`[checkout] webhook signature rejected: ${message}`)
    return new Response('Invalid signature', { status: 400 })
  }

  // log event type
  console.log('stripe event:', event.type)

  // Anything thrown past here is left to propagate: a database failure should
  // become a 500 so Stripe retries, rather than a 200 that loses the order.
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object
      // 'completed' fires for delayed payment methods too, where the session is
      // done but the money is not in yet. That case is finished later by
      // async_payment_succeeded.
      if (session.payment_status !== 'unpaid') {
        await fulfillAndNotify(session)
      }
      break
    }
    case 'checkout.session.expired':
    case 'checkout.session.async_payment_failed': {
      await deletePendingCheckoutSession(event.data.object.id)
      break
    }
  }

  return Response.json({ received: true })
}
