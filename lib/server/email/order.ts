import 'server-only'

import type { Purchase } from '@/lib/server/db/schemas/purchase'
import { sendReceiptEmail } from './receipt'

/**
 * Every email one paid order produces.
 *
 * Its own module rather than more of the request layer: fulfillAndNotify's job
 * is to schedule, not to decide who hears about a sale.
 *
 * Today that is only the buyer's receipt. The per-seller notification lands here
 * next, which is why the signature takes the whole promoted array rather than
 * the single address the receipt needs.
 */
export async function sendOrderEmails(purchases: Purchase[]): Promise<void> {
  await sendReceiptEmail(purchases)
}
