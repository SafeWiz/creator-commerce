import 'server-only'

import { eq } from 'drizzle-orm'

import db from '@/lib/server/db'
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

export async function getProductsByUser(ownerId: string): Promise<Product[]> {
  return db.select().from(productsTable).where(eq(productsTable.ownerId, ownerId))
}
