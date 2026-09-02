import { z } from 'zod'

import { productStatus } from '@/lib/server/db/schemas/product'

/**
 * How many images one product can hold, in total.
 *
 * The upload endpoint's `maxFileCount` only caps a single batch, and the
 * endpoint no longer knows which product an upload is for — so the cap lives at
 * the two ends that can still count. The form trims a batch to the remaining
 * slots before it uploads and discards anything that arrives over the limit
 * anyway; setProductImages refuses an over-length list outright, which is the
 * authority.
 */
export const MAX_PRODUCT_IMAGES = 8

/**
 * The ceiling on the digital product itself, in bytes.
 *
 * UploadThing's own `maxFileSize` only accepts a power of two, so the route is
 * configured one notch above at 128MB and this is what actually holds the line.
 * It is checked three times, and each one is load-bearing:
 *
 *   - in the browser, so an oversized pick fails instantly instead of after a
 *     round trip;
 *   - in the route's middleware, against the size the browser declares, so an
 *     honest client's bytes never leave the machine;
 *   - in the completion callback, against the size UploadThing measured — the
 *     only one of the three a lying client cannot talk its way past. Nothing
 *     records the upload until that check passes.
 */
export const MAX_PRODUCT_FILE_BYTES = 100 * 1024 * 1024
export const MAX_PRODUCT_FILE_LABEL = '100MB'

/**
 * Stripe's charge limits for RON, in lei — the units the form collects.
 *
 * Both are Stripe's numbers, not ours. The floor exists so Stripe's fee can't
 * exceed the charge; the ceiling is the 8-digit minor-unit cap that applies to
 * every two-decimal currency. Enforcing them here rather than at checkout means a
 * seller finds out while setting the price, instead of a buyer hitting an opaque
 * Stripe error at the payment.
 *
 * The minimum is per *charge*, not per line item — Stripe would take two 1.50 RON
 * items as one 3.00 RON payment. Applying it per product anyway is the cheaper
 * rule: every cart holds at least one item, so a per-product floor makes every
 * possible cart total valid without any cart-level check.
 *
 * Both are keyed to the settlement currency rather than the presentment one, so
 * they move if the Stripe account stops settling in RON.
 *
 * https://docs.stripe.com/currencies#minimum-and-maximum-charge-amounts
 */
export const MIN_PRODUCT_PRICE = 2
export const MAX_PRODUCT_PRICE = 999_999.99

/**
 * The image list, as the form submits it: a JSON array of ufsUrls, in display
 * order, first is the cover.
 *
 * JSON rather than repeated FormData entries, because the order is the data —
 * `getAll` preserves it, but a single field the form serialises once is harder
 * to half-send.
 *
 * Validating the urls here is a shape check and nothing more. Whether a url is
 * one this user may use is a question only the database can answer, and
 * setProductImages asks it.
 */
export const productImagesField = z
  .string('Images could not be read')
  .transform((value, ctx) => {
    try {
      return JSON.parse(value) as unknown
    } catch {
      ctx.addIssue({ code: 'custom', message: 'Images could not be read' })
      return z.NEVER
    }
  })
  .pipe(
    z
      .array(z.url('Images could not be read'))
      .max(MAX_PRODUCT_IMAGES, `At most ${MAX_PRODUCT_IMAGES} images`),
  )

/**
 * Validates the fields a user submits when creating a product.
 *
 * Shared between the client form and the server action, so it validates the
 * user-facing shape (price in lei) rather than the stored shape (bani).
 */
export const createProductSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .min(3, 'Name must be at least 3 characters')
    .max(255, 'Name must be 255 characters or fewer'),
  description: z.string().trim().max(10_000, 'Description is too long').optional(),
  // Lei, as entered in the form. The action converts to bani. RON has two
  // decimal places, so the multipleOf below still holds.
  price: z.coerce
    .number('Price must be a number')
    .min(MIN_PRODUCT_PRICE, `Price must be at least ${MIN_PRODUCT_PRICE} RON`)
    .max(MAX_PRODUCT_PRICE, `Price must be at most ${MAX_PRODUCT_PRICE} RON`)
    .multipleOf(0.01, 'Price supports at most 2 decimal places'),
  status: z.enum(productStatus).default('draft'),
})

export type CreateProductInput = z.infer<typeof createProductSchema>

/**
 * What a save actually submits: the user's fields, plus the image list.
 *
 * Separate from createProductSchema because that one is shared with the client
 * form, which validates it through zodResolver. The images are not a field the
 * user types into — the form holds them as state and serialises them at submit
 * — so putting them in the resolver's schema would make every prefill and every
 * form value type carry a field no input is bound to.
 *
 * Both actions parse this: creating and updating differ in what they do with
 * the result, not in what the form sends.
 */
export const saveProductSchema = createProductSchema.extend({
  images: productImagesField,
})

/**
 * The extra field a *new* product carries: the key of an already-uploaded file.
 *
 * Only creation validates it. The file is picked once, when the product is made,
 * and editing one never revisits it — so the update path keeps using
 * saveProductSchema rather than being handed a key it would have to ignore.
 *
 * The key is opaque here on purpose. Whether it names a real upload, and whether
 * it is the submitter's, are questions only the database can answer, and the DAL
 * asks them as part of the insert.
 */
export const createProductWithFileSchema = saveProductSchema.extend({
  fileKey: z.string().trim().min(1, 'A product file is required'),
})
