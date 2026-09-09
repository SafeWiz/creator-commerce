import 'server-only'

import type { Purchase } from '@/lib/server/db/schemas/purchase'
import { getUserEmails } from '@/lib/server/dal/users'
import { sendReceiptEmail } from './receipt'
import { sendSaleEmail } from './sale'

/**
 * Every email one paid order produces.
 *
 * Composes nothing itself — it decides who hears about a sale and lets the
 * receipt and sale modules build their own mail. Its own module rather than more
 * of the request layer, whose job is scheduling.
 *
 * A cart is assembled from /explore and can hold products from several owners,
 * so one order's rows may span N sellers. Each seller gets one email covering
 * their own items, not one per row: a three-product order from one seller would
 * otherwise be three notifications, and inbox noise matters most for the party
 * the platform wants to keep.
 *
 * allSettled, not all. The buyer's receipt and every seller's notification are
 * independent obligations, and `all` would abandon the rest on the first
 * rejection — one seller with a malformed address costing the buyer their
 * receipt.
 */
export async function sendOrderEmails(purchases: Purchase[]): Promise<void> {
  const [first] = purchases
  if (!first) return

  const bySeller = new Map<string, Purchase[]>()
  for (const purchase of purchases) {
    const existing = bySeller.get(purchase.sellerId)
    if (existing) existing.push(purchase)
    else bySeller.set(purchase.sellerId, [purchase])
  }

  const sellerEmails = await getUserEmails([...bySeller.keys()])

  const sends: Promise<void>[] = [sendReceiptEmail(purchases)]

  for (const [sellerId, rows] of bySeller) {
    const to = sellerEmails.get(sellerId)
    if (!to) {
      // Near-impossible: purchases.sellerId is onDelete: 'restrict'. Logged and
      // skipped rather than thrown, because one unreachable seller must not cost
      // the buyer their receipt.
      console.error(
        `[email] no address for seller ${sellerId} — sale notification for order ${first.orderId} not sent`,
      )
      continue
    }

    sends.push(
      sendSaleEmail({
        to,
        orderId: first.orderId,
        items: rows.map((row) => ({
          productId: row.productId,
          productName: row.productName,
          priceInCents: row.priceInCents,
        })),
      }),
    )
  }

  const results = await Promise.allSettled(sends)

  for (const result of results) {
    if (result.status === 'rejected') {
      console.error(
        `[email] a send failed for order ${first.orderId}`,
        result.reason,
      )
    }
  }
}
