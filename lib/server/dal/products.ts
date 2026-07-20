import 'server-only'

import { eq } from 'drizzle-orm'

import db from '@/lib/server/db'
import {
  productsTable,
  type Product,
  type ProductStatus,
} from '@/lib/server/db/schemas/product'
import { requireUser } from '@/lib/server/dal/user'
import { slugify } from '@/lib/utils'

export type CreateProductInput = {
  name: string
  description: string | null
  priceInCents: number
  status: ProductStatus
}

// The current user is resolved here rather than passed in, so the ownership
// check travels with the query instead of relying on every call site.
export async function createProduct(input: CreateProductInput): Promise<Product> {
  const user = await requireUser()

  const [product] = await db
    .insert(productsTable)
    .values({
      ...input,
      ownerId: user.id,
      slug: slugify(input.name),
    })
    .returning()

  return product
}

export async function getProductsByUser(): Promise<Product[]> {
  const user = await requireUser()

  return db.select().from(productsTable).where(eq(productsTable.ownerId, user.id))
}
