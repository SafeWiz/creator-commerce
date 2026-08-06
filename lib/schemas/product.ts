import { z } from 'zod'

import { productStatus } from '@/lib/server/db/schemas/product'

/**
 * How many images one product can hold, in total.
 *
 * The upload endpoint's own `maxFileCount` only caps a single batch, so without
 * this a user could append four at a time forever. Enforced in the endpoint's
 * middleware and, as a race backstop, in the DAL's append query.
 */
export const MAX_PRODUCT_IMAGES = 4

/**
 * Validates the fields a user submits when creating a product.
 *
 * Shared between the client form and the server action, so it validates the
 * user-facing shape (price in dollars) rather than the stored shape (cents).
 */
export const createProductSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .min(3, 'Name must be at least 3 characters')
    .max(255, 'Name must be 255 characters or fewer'),
  description: z.string().trim().max(10_000, 'Description is too long').optional(),
  // Dollars, as entered in the form. The action converts to cents.
  price: z.coerce
    .number('Price must be a number')
    .positive('Price must be greater than 0')
    .max(1_000_000, 'Price is too high')
    .multipleOf(0.01, 'Price supports at most 2 decimal places'),
  status: z.enum(productStatus).default('draft'),
})

export type CreateProductInput = z.infer<typeof createProductSchema>

/**
 * Validates the /explore page's `q`/`sort` search params.
 *
 * Parsed with `safeParse` rather than `parse` — malformed or repeated query
 * params should fall back to defaults, not throw.
 */
export const productSearchParamsSchema = z.object({
  q: z.string().trim().max(255).default(''),
  sort: z.enum(['newest', 'oldest']).default('newest'),
})

export type ProductSearchParams = z.infer<typeof productSearchParamsSchema>
