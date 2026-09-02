import 'server-only'

import { and, desc, eq, exists, isNotNull, sql, or } from 'drizzle-orm'

import db from '@/lib/server/db'
import { productsTable } from '@/lib/server/db/schemas/product'
import { purchasesTable } from '@/lib/server/db/schemas/purchase'

/**
 * A third dal module rather than more of purchases.ts, which is already long
 * and is about the purchase record. These two queries are rooted in the product
 * and in the file it carries, and they are the only pair that has to agree with
 * each other about what "may download" means.
 *
 * On the `sql<...>` casts below: the where clauses prove the file columns are
 * present, but drizzle infers their type from the schema, where all three are
 * still nullable. The cast is that proof written down. It disappears with the
 * NOT NULL migration recorded in TODO.md — nothing else should copy it.
 */

/**
 * The storage key behind a product, for a user allowed to have it.
 *
 * Entitlement is "you own this product, or you have paid for it". Paid only:
 * that matches getPurchasedProductIds and the purchases_buyerId_productId_unq
 * predicate exactly, so what the cart calls owned and what this serves cannot
 * drift apart. A refund therefore revokes the file along with the money.
 *
 * The owner branch is what lets a seller fetch their own product file, which is
 * otherwise unreachable now that uploads are private.
 *
 * Deliberately does not filter `deletedAt`. A seller retiring a product must
 * not revoke files buyers already paid for — the same reason getBuyerPurchases
 * leaves soft-deleted products in a buyer's history.
 *
 * One null covers "no such product", "not yours" and "no file" alike. Telling
 * them apart would tell a prober which product ids exist and who owns them.
 */
export async function getDownloadableProductFile(
  productId: number,
  userId: string,
): Promise<{ fileKey: string } | null> {
  const [row] = await db
    .select({ fileKey: sql<string>`${productsTable.fileKey}` })
    .from(productsTable)
    .where(
      and(
        eq(productsTable.id, productId),
        isNotNull(productsTable.fileKey),
        or(
          eq(productsTable.ownerId, userId),
          exists(
            db
              .select({ one: sql`1` })
              .from(purchasesTable)
              .where(
                and(
                  eq(purchasesTable.productId, productsTable.id),
                  eq(purchasesTable.buyerId, userId),
                  eq(purchasesTable.status, 'paid'),
                ),
              ),
          ),
        ),
      ),
    )
    .limit(1)

  return row ?? null
}

// What the /downloads table renders. productName is the purchase's snapshot —
// what was bought — while the file name and size come off the product, because
// they describe what is about to be fetched.
export type BuyerDownload = {
  purchaseId: number
  productId: number
  productName: string
  fileName: string
  fileSizeBytes: number
  purchasedAt: Date
}

/**
 * Everything a buyer can re-download, newest first.
 *
 * Paid only, and the same reasoning as getDownloadableProductFile: the list and
 * the route that serves it must agree, or the page grows rows whose button
 * 404s.
 *
 * Inner join, unfiltered by `deletedAt`, so a retired product stays
 * downloadable. Rows whose product has no file are dropped rather than rendered
 * dead: /downloads is a file list, and /purchases is already the honest record
 * of the transaction.
 */
export async function getBuyerDownloads(
  buyerId: string,
): Promise<BuyerDownload[]> {
  return db
    .select({
      purchaseId: purchasesTable.id,
      productId: purchasesTable.productId,
      productName: purchasesTable.productName,
      fileName: sql<string>`${productsTable.fileName}`,
      fileSizeBytes: sql<number>`${productsTable.fileSizeBytes}`.mapWith(Number),
      purchasedAt: purchasesTable.createdAt,
    })
    .from(purchasesTable)
    .innerJoin(productsTable, eq(productsTable.id, purchasesTable.productId))
    .where(
      and(
        eq(purchasesTable.buyerId, buyerId),
        eq(purchasesTable.status, 'paid'),
        isNotNull(productsTable.fileKey),
        isNotNull(productsTable.fileName),
        isNotNull(productsTable.fileSizeBytes),
      ),
    )
    // Matches purchases_buyerId_createdAt_idx, read backwards.
    .orderBy(desc(purchasesTable.createdAt), desc(purchasesTable.id))
}
