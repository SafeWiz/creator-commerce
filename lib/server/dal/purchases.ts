import 'server-only'

import { and, count, desc, eq, gte, lt, ne, notExists, sql, sum } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

import db from '@/lib/server/db'
import { user } from '@/lib/server/db/schemas/auth'
import { productsTable } from '@/lib/server/db/schemas/product'
import {
  purchasesTable,
  type NewPurchase,
  type Purchase,
} from '@/lib/server/db/schemas/purchase'

/**
 * Writes one checkout's rows, pending payment.
 *
 * Takes an array rather than being called in a loop because the neon-http driver
 * has no interactive transactions — a single multi-row INSERT is the only atomic
 * write available, so a partially-recorded order is impossible by construction.
 *
 * onConflictDoNothing leans on purchases_buyerId_productId_unq, whose predicate
 * is now `status = 'paid'`. That means it still refuses to re-record something
 * the buyer already owns, but it no longer dedupes two rapid submits: two
 * pending rows for the same product are both legal, because each belongs to a
 * different Stripe session and only one of them can ever be promoted. The
 * returned rows are what actually landed, so the caller can tell the difference.
 */
export async function createPurchases(
  rows: NewPurchase[],
): Promise<Purchase[]> {
  if (rows.length === 0) return []

  return db.insert(purchasesTable).values(rows).onConflictDoNothing().returning()
}

/**
 * Promotes one checkout session's rows to paid.
 *
 * Idempotent by the `status = 'pending'` predicate: a second call — the webhook
 * arriving after the return handler already did this, or a Stripe retry — finds
 * nothing to update and returns []. Callers must read an empty result as "already
 * done", not as failure.
 *
 * The NOT EXISTS guard is about the multi-row UPDATE, not about concurrency. If
 * one row in the session would collide with an already-paid row for the same
 * product, Postgres aborts the whole statement and the rest of the order — money
 * that did arrive — stays pending. Excluding the doomed row lets everything else
 * promote; the caller sweeps what is left behind. The guard is not airtight, since
 * two concurrent promotions can both pass it, so callers still have to survive a
 * unique violation.
 *
 * One statement, because neon-http has no interactive transactions.
 */
export async function markCheckoutSessionPaid(params: {
  checkoutSessionId: string
  paymentIntentId: string | null
}): Promise<Purchase[]> {
  const owned = alias(purchasesTable, 'owned')

  return db
    .update(purchasesTable)
    .set({ status: 'paid', stripePaymentIntentId: params.paymentIntentId })
    .where(
      and(
        eq(purchasesTable.stripeCheckoutSessionId, params.checkoutSessionId),
        eq(purchasesTable.status, 'pending'),
        notExists(
          db
            .select({ one: sql`1` })
            .from(owned)
            .where(
              and(
                eq(owned.buyerId, purchasesTable.buyerId),
                eq(owned.productId, purchasesTable.productId),
                eq(owned.status, 'paid'),
              ),
            ),
        ),
      ),
    )
    .returning()
}

/**
 * Drops a checkout session's still-pending rows.
 *
 * Two callers: an expired or failed session, where the rows are dead weight; and
 * the tail of a successful promotion, where anything still pending for that
 * session is a duplicate of something the buyer already owns. Paid rows are never
 * touched, so this cannot erase a completed order however it is called.
 */
export async function deletePendingCheckoutSession(
  checkoutSessionId: string,
): Promise<number> {
  const rows = await db
    .delete(purchasesTable)
    .where(
      and(
        eq(purchasesTable.stripeCheckoutSessionId, checkoutSessionId),
        eq(purchasesTable.status, 'pending'),
      ),
    )
    .returning({ id: purchasesTable.id })

  return rows.length
}

// What the /purchases table renders. The buyer already knows they are the buyer,
// so no buyer columns; the seller's identity is here only to build the
// storefront link and print the handle.
export type BuyerPurchase = {
  id: number
  orderId: string
  productId: number
  productName: string
  productSlug: string
  priceInCents: number
  createdAt: Date
  sellerHandle: string
  sellerName: string
}

/**
 * A buyer's order history, newest first.
 *
 * Two joins, the first in this module: purchase to its seller for the handle,
 * and to the product for the slug the storefront url needs. Both are inner and
 * both are provably safe, because every foreign key on this table is
 * `onDelete: 'restrict'` — neither row can disappear while a purchase points at
 * it.
 *
 * Note what is deliberately NOT joined for: name and price come off the purchase
 * row, not the product. They are snapshots of what was actually bought.
 *
 * Also note what is deliberately not filtered: `products.deletedAt`. Every other
 * read in this codebase hides soft-deleted products; here that would erase paid
 * history the moment a seller retired a product.
 *
 * Pending rows are filtered, and must be: they are orders someone started and
 * abandoned at Stripe, and listing one here would tell a buyer they bought
 * something nobody charged them for. `ne('pending')` rather than `eq('paid')` so
 * refunded rows keep appearing once refunds exist — a refund belongs in history.
 */
export async function getBuyerPurchases(
  buyerId: string,
): Promise<BuyerPurchase[]> {
  return db
    .select({
      id: purchasesTable.id,
      orderId: purchasesTable.orderId,
      productId: purchasesTable.productId,
      productName: purchasesTable.productName,
      productSlug: productsTable.slug,
      priceInCents: purchasesTable.priceInCents,
      createdAt: purchasesTable.createdAt,
      sellerHandle: user.handle,
      sellerName: user.name,
    })
    .from(purchasesTable)
    .innerJoin(user, eq(user.id, purchasesTable.sellerId))
    .innerJoin(productsTable, eq(productsTable.id, purchasesTable.productId))
    .where(
      and(
        eq(purchasesTable.buyerId, buyerId),
        ne(purchasesTable.status, 'pending'),
      ),
    )
    // Matches purchases_buyerId_createdAt_idx, read backwards.
    .orderBy(desc(purchasesTable.createdAt), desc(purchasesTable.id))
}

// What the /sales table renders. buyerEmail is a deliberate widening: PublicUser
// excludes email everywhere else, but a seller knowing who bought from them is
// the entire point of this page, and it is the address a receipt would go to.
export type SellerSale = {
  id: number
  orderId: string
  productName: string
  priceInCents: number
  createdAt: Date
  buyerName: string
  buyerEmail: string
}

// The seller's mirror of getBuyerPurchases, pending rows filtered for the same
// reason: a checkout someone abandoned is not a sale, and showing it as one
// overstates what the seller is owed. No product join — /sales prints the
// snapshotted name and never links out to the storefront.
export async function getSellerSales(sellerId: string): Promise<SellerSale[]> {
  return db
    .select({
      id: purchasesTable.id,
      orderId: purchasesTable.orderId,
      productName: purchasesTable.productName,
      priceInCents: purchasesTable.priceInCents,
      createdAt: purchasesTable.createdAt,
      buyerName: user.name,
      buyerEmail: user.email,
    })
    .from(purchasesTable)
    .innerJoin(user, eq(user.id, purchasesTable.buyerId))
    .where(
      and(
        eq(purchasesTable.sellerId, sellerId),
        ne(purchasesTable.status, 'pending'),
      ),
    )
    .orderBy(desc(purchasesTable.createdAt), desc(purchasesTable.id))
}

export type SellerTotals = {
  units: number
  revenueInCents: number
}

/**
 * Revenue and units for the /sales KPI cards.
 *
 * One row, not a group per currency: the app charges in a single currency
 * (lib/currency.ts), so these cents add up.
 *
 * Only 'paid' counts. A pending row is money that hasn't arrived and a refunded
 * one is money that left again — neither belongs in revenue.
 */
export async function getSellerTotals(
  sellerId: string,
): Promise<SellerTotals> {
  const [row] = await db
    .select({
      units: count(),
      // Postgres returns SUM as a string to preserve bigint precision; these are
      // cents in an integer column, so Number is safe and saves every caller a
      // parse.
      revenueInCents: sum(purchasesTable.priceInCents).mapWith(Number),
    })
    .from(purchasesTable)
    .where(
      and(
        eq(purchasesTable.sellerId, sellerId),
        eq(purchasesTable.status, 'paid'),
      ),
    )

  // An ungrouped aggregate always returns a row, but SUM over zero rows is NULL —
  // so the fallback is for the seller with no sales, not for a missing row.
  return {
    units: row?.units ?? 0,
    revenueInCents: row?.revenueInCents ?? 0,
  }
}

export type PeriodTotals = {
  current: { units: number; revenueInCents: number }
  previous: { units: number; revenueInCents: number }
}

/**
 * Both halves of a period-over-period comparison, in one scan.
 *
 * `since` is the start of the current window and the end of the previous one;
 * `previousSince` is the start of the previous. The caller supplies both rather
 * than a day count, because a DAL function that reads the clock returns a
 * different answer for the same arguments — and because the page hands the same
 * `since` to getSellerTopProducts, so the two reads on one render cannot disagree
 * about where the window starts.
 *
 * One query rather than two, and that is not only about round trips: a delta
 * whose halves came from separate reads is comparing two different instants.
 * FILTER splits the same scan in two, so both numbers are as of the same moment.
 *
 * The outer WHERE already floors everything at `previousSince`, so the previous
 * window's filter needs an upper bound only. Serves
 * purchases_sellerId_createdAt_idx.
 *
 * Paid only, matching getSellerTotals: pending money has not arrived and
 * refunded money left again.
 */
export async function getSellerPeriodTotals(
  sellerId: string,
  window: { since: Date; previousSince: Date },
): Promise<PeriodTotals> {
  const inCurrent = gte(purchasesTable.createdAt, window.since)
  const inPrevious = lt(purchasesTable.createdAt, window.since)

  const [row] = await db
    .select({
      // The conditions are embedded as drizzle expressions rather than
      // interpolated Dates, so the timestamp column's own encoder maps them.
      currentUnits: sql<number>`count(*) filter (where ${inCurrent})`.mapWith(
        Number,
      ),
      // coalesce because SUM over zero matching rows is NULL, which is the
      // seller with no sales this window rather than a missing row.
      currentRevenueInCents:
        sql<number>`coalesce(sum(${purchasesTable.priceInCents}) filter (where ${inCurrent}), 0)`.mapWith(
          Number,
        ),
      previousUnits: sql<number>`count(*) filter (where ${inPrevious})`.mapWith(
        Number,
      ),
      previousRevenueInCents:
        sql<number>`coalesce(sum(${purchasesTable.priceInCents}) filter (where ${inPrevious}), 0)`.mapWith(
          Number,
        ),
    })
    .from(purchasesTable)
    .where(
      and(
        eq(purchasesTable.sellerId, sellerId),
        eq(purchasesTable.status, 'paid'),
        gte(purchasesTable.createdAt, window.previousSince),
      ),
    )

  // An ungrouped aggregate always returns a row; the fallbacks are belt and
  // braces for the destructure.
  return {
    current: {
      units: row?.currentUnits ?? 0,
      revenueInCents: row?.currentRevenueInCents ?? 0,
    },
    previous: {
      units: row?.previousUnits ?? 0,
      revenueInCents: row?.previousRevenueInCents ?? 0,
    },
  }
}

export type TopProduct = {
  productId: number
  name: string
  revenueInCents: number
}

/**
 * The seller's best-earning products, highest first. `since` omitted means all
 * time.
 *
 * Two things here contradict the rest of this module on purpose.
 *
 * The name comes from the joined product, not from purchases.productName.
 * Everywhere else the snapshot is the correct read — a seller editing a product
 * must not rewrite what a buyer's history says they bought. This is the seller's
 * own catalogue, where the opposite holds: they think in terms of the product
 * they own, and grouping by snapshot would split one renamed product into two
 * rows that are really the same thing.
 *
 * The join does not filter deletedAt. A retired product still earned that
 * revenue, and hiding it would silently understate the ranking — the same
 * reasoning getBuyerPurchases gives.
 *
 * The join is inner and provably safe: purchases.productId is
 * onDelete: 'restrict', so the product cannot vanish under a purchase.
 *
 * No total is returned. Callers already hold one — the windowed card uses
 * getSellerPeriodTotals().current.revenueInCents, the all-time card uses
 * getSellerTotals().revenueInCents — and a total summed from the returned rows
 * would make the top product 100% of itself.
 */
export async function getSellerTopProducts(
  sellerId: string,
  options: { since?: Date; limit: number },
): Promise<TopProduct[]> {
  // One expression, used as both the projection and the sort key, so the two
  // cannot drift apart.
  const revenueInCents = sum(purchasesTable.priceInCents).mapWith(Number)

  return db
    .select({
      productId: productsTable.id,
      name: productsTable.name,
      revenueInCents,
    })
    .from(purchasesTable)
    .innerJoin(productsTable, eq(productsTable.id, purchasesTable.productId))
    .where(
      // and() drops undefined, so an absent `since` simply widens this to all
      // time rather than needing a second query shape.
      and(
        eq(purchasesTable.sellerId, sellerId),
        eq(purchasesTable.status, 'paid'),
        options.since
          ? gte(purchasesTable.createdAt, options.since)
          : undefined,
      ),
    )
    .groupBy(productsTable.id, productsTable.name)
    .orderBy(desc(revenueInCents))
    .limit(options.limit)
}

/**
 * Which products this user already owns.
 *
 * Paid only, matching purchases_buyerId_productId_unq exactly — so what the cart
 * marks as owned and what the database will actually refuse to insert can never
 * disagree. Refunded rows are excluded because the product can be bought again;
 * pending rows because nobody has paid for them yet, and treating an abandoned
 * checkout as ownership would leave the buyer unable to retry it.
 *
 * That last part is a compromise, not a design — see the note in TODO.md about
 * going back to one purchase per (buyer, product) once stale pending rows can be
 * cleaned up.
 */
export async function getPurchasedProductIds(
  buyerId: string,
): Promise<number[]> {
  const rows = await db
    .select({ productId: purchasesTable.productId })
    .from(purchasesTable)
    .where(
      and(
        eq(purchasesTable.buyerId, buyerId),
        eq(purchasesTable.status, 'paid'),
      ),
    )

  return rows.map((row) => row.productId)
}
