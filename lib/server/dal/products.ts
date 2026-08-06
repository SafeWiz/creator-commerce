import 'server-only'

import { and, asc, desc, eq, ilike, isNull, ne, or, sql } from 'drizzle-orm'

import { MAX_PRODUCT_IMAGES } from '@/lib/schemas/product'
import db from '@/lib/server/db'
import { user } from '@/lib/server/db/schemas/auth'
import {
  productsTable,
  type Product,
  type ProductStatus,
} from '@/lib/server/db/schemas/product'
import { slugify } from '@/lib/utils'

export type CreateProductInput = {
  ownerId: string
  name: string
  description: string | null
  priceInCents: number
  status: ProductStatus
}

export type UpdateProductInput = {
  id: number
  ownerId: string
  name: string
  description: string | null
  priceInCents: number
  status: ProductStatus
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  const [product] = await db
    .insert(productsTable)
    .values({
      ...input,
      slug: slugify(input.name),
    })
    .returning()

  return product
}

// Owner-scoped update: the id/ownerId pair means another user's product can
// never be updated, even with a guessed id. Returns null when nothing matched.
export async function updateUserProduct({
  id,
  ownerId,
  ...fields
}: UpdateProductInput): Promise<Product | null> {
  const [product] = await db
    .update(productsTable)
    .set({
      ...fields,
      slug: slugify(fields.name),
    })
    .where(
      and(
        eq(productsTable.id, id),
        eq(productsTable.ownerId, ownerId),
        isNull(productsTable.deletedAt),
      ),
    )
    .returning()

  return product ?? null
}

// Appends in a single statement instead of read-modify-write: UploadThing fires
// its completion callback once per file, so parallel uploads would otherwise
// clobber each other. Owner-scoped; returns null when nothing matched.
export async function addProductImages(
  id: number,
  ownerId: string,
  urls: string[],
): Promise<Product | null> {
  if (urls.length === 0) return getUserProduct(id, ownerId)

  const [product] = await db
    .update(productsTable)
    .set({
      // Each url is bound as its own parameter, so no array-literal encoding
      // and nothing user-supplied reaches the query text.
      images: sql`${productsTable.images} || ARRAY[${sql.join(
        urls.map((url) => sql`${url}`),
        sql`, `,
      )}]::text[]`,
    })
    .where(
      and(
        eq(productsTable.id, id),
        eq(productsTable.ownerId, ownerId),
        isNull(productsTable.deletedAt),
        // The endpoint's middleware checks the cap too, but that check isn't
        // atomic: two batches submitted at once can both pass it. This makes
        // the database the real ceiling.
        sql`cardinality(${productsTable.images}) + ${urls.length} <= ${MAX_PRODUCT_IMAGES}`,
      ),
    )
    .returning()

  return product ?? null
}

// Owner-scoped removal of a single image url. array_remove is atomic (mirrors
// the || append in addProductImages — no read-modify-write race). Returns the
// removed url, or null when nothing matched (wrong owner/product, url not
// present, or the row is soft-deleted).
export async function removeProductImage(
  id: number,
  ownerId: string,
  url: string,
): Promise<string | null> {
  const [product] = await db
    .update(productsTable)
    .set({
      images: sql`array_remove(${productsTable.images}, ${url})`,
    })
    .where(
      and(
        eq(productsTable.id, id),
        eq(productsTable.ownerId, ownerId),
        isNull(productsTable.deletedAt),
        sql`${url} = ANY(${productsTable.images})`,
      ),
    )
    .returning({ images: productsTable.images })

  return product ? url : null
}

export async function getUserProducts(ownerId: string): Promise<Product[]> {
  return db
    .select()
    .from(productsTable)
    .where(
      and(eq(productsTable.ownerId, ownerId), isNull(productsTable.deletedAt)),
    )
}

// Owner-scoped soft delete: sets the tombstone instead of removing the row, so
// the product is hidden from reads but recoverable. Returns false when nothing
// matched (wrong owner, non-existent id, or already deleted).
export async function deleteUserProduct(
  id: number,
  ownerId: string,
): Promise<boolean> {
  const [deleted] = await db
    .update(productsTable)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(productsTable.id, id),
        eq(productsTable.ownerId, ownerId),
        isNull(productsTable.deletedAt),
      ),
    )
    .returning({ id: productsTable.id })

  return deleted != null
}

// Storefront read: everything a seller has published, oldest first. Scoped by
// owner and status so drafts and soft-deleted rows never reach a public page.
export async function getPublishedProducts(ownerId: string): Promise<Product[]> {
  return db
    .select()
    .from(productsTable)
    .where(
      and(
        eq(productsTable.ownerId, ownerId),
        eq(productsTable.status, 'published'),
        isNull(productsTable.deletedAt),
      ),
    )
}

// Public product page read. Takes the ownerId resolved from the URL's handle so
// a product can only be reached under the seller that actually owns it.
export async function getPublishedProduct(
  id: number,
  ownerId: string,
): Promise<Product | null> {
  const [product] = await db
    .select()
    .from(productsTable)
    .where(
      and(
        eq(productsTable.id, id),
        eq(productsTable.ownerId, ownerId),
        eq(productsTable.status, 'published'),
        isNull(productsTable.deletedAt),
      ),
    )
    .limit(1)

  return product ?? null
}

export type ProductSort = 'newest' | 'oldest'

export type SearchedProduct = {
  id: number
  slug: string
  name: string
  description: string | null
  priceInCents: number
  currency: string
  images: string[]
  sellerHandle: string
}

const MIN_SEARCH_QUERY_LENGTH = 3

// Escapes ILIKE's special characters so a literal '%' or '_' typed by a user
// can't turn into a wildcard, and '\' can't start an unintended escape.
function escapeLikePattern(input: string): string {
  return input.replace(/[\\%_]/g, (char) => `\\${char}`)
}

// Cross-seller browse/search: published, non-deleted products from every
// seller except excludeOwnerId, optionally filtered by a name/description
// substring. Newest/oldest 50, no pagination.
export async function searchPublishedProducts(
  query: string,
  sort: ProductSort,
  excludeOwnerId: string,
): Promise<SearchedProduct[]> {
  const trimmed = query.trim()

  const conditions = [
    eq(productsTable.status, 'published'),
    isNull(productsTable.deletedAt),
    ne(productsTable.ownerId, excludeOwnerId),
  ]

  if (trimmed.length >= MIN_SEARCH_QUERY_LENGTH) {
    const pattern = `%${escapeLikePattern(trimmed)}%`
    conditions.push(
      or(
        ilike(productsTable.name, pattern),
        ilike(productsTable.description, pattern),
      )!,
    )
  }

  return db
    .select({
      id: productsTable.id,
      slug: productsTable.slug,
      name: productsTable.name,
      description: productsTable.description,
      priceInCents: productsTable.priceInCents,
      currency: productsTable.currency,
      images: productsTable.images,
      sellerHandle: user.handle,
    })
    .from(productsTable)
    .innerJoin(user, eq(user.id, productsTable.ownerId))
    .where(and(...conditions))
    .orderBy(
      sort === 'oldest' ? asc(productsTable.createdAt) : desc(productsTable.createdAt),
    )
    .limit(50)
}

// Owner-scoped so a user can only ever load their own product.
export async function getUserProduct(
  id: number,
  ownerId: string,
): Promise<Product | null> {
  const [product] = await db
    .select()
    .from(productsTable)
    .where(
      and(
        eq(productsTable.id, id),
        eq(productsTable.ownerId, ownerId),
        isNull(productsTable.deletedAt),
      ),
    )
    .limit(1)

  return product ?? null
}
