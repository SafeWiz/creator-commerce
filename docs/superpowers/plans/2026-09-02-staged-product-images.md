# Staged Product Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Product images upload before the product exists and commit on Save, on both the create and edit pages, with every provably-dead image deleted from UploadThing and a script sweeping the rest.

**Architecture:** A new `product_image_uploads` staging table holds uploads that no product references yet, mirroring how `product_uploads` already stages the product file. `products.images text[]` is unchanged, so no read in the DAL moves. The `productImage` endpoint stops knowing about products and only stages; the form owns the image list and commits it whole through `setProductImages`, which validates every url against the product's current array or an owned staged row.

**Tech Stack:** Next.js 16 (App Router, server actions), React 19, drizzle-orm on Neon Postgres, UploadThing v7, zod v4, react-hook-form, Tailwind v4 + base-ui.

Spec: `docs/superpowers/specs/2026-09-02-staged-product-images-design.md`

## Global Constraints

- **Verification you may run yourself:** `npx tsc --noEmit` and `npm run lint`. Nothing else. Everything with side effects goes to Gabi — `npm install`, `npm run schema:migrations:generate`, `npm run schema:migrations:run`, `npm run dev`, `npm run build`. When a step needs one of those, stop and report; do not run it.
- `npm run build` does not work in this sandbox (it fetches Google Fonts over a blocked network). `npx tsc --noEmit` is the type gate.
- **This is not the Next.js in your training data.** Read the relevant guide in `node_modules/next/dist/docs/` before writing route, action or caching code (`AGENTS.md`).
- Every module under `lib/server/` starts with `import 'server-only'`. Every module under `lib/client/` starts with `import 'client-only'`.
- **Server actions never query tables.** They resolve the user, parse input, call a DAL function, then handle `revalidatePath`/`redirect`.
- **DAL modules are pure data.** No `headers()`, no session, no `redirect()`. Ownership is enforced by taking an `ownerId` and scoping the query to it.
- `lib/server/db/schemas/auth.ts` is generated — never hand-edit. `lib/server/db/schemas/product.ts` is hand-written.
- SQL in `drizzle/` is generated: after a schema change, `npm run schema:migrations:generate` then `npm run schema:migrations:run`.
- All documentation, comments and commit messages in English.
- There is no test runner in this repo. Verification is `npx tsc --noEmit`, `npm run lint`, and the manual browser checks written into each task.
- Comment style: explain *why*, at the density of the surrounding file. `lib/server/dal/products.ts` and `lib/server/uploadthing.ts` are the reference.
- `MAX_PRODUCT_IMAGES` is 8 and lives in `lib/schemas/product.ts`.

---

## File Structure

**Created:**
- `scripts/cleanup-orphaned-images.ts` — the orphan sweep. Standalone process; owns its own `UTApi` so its failures are loud.

**Modified:**
- `lib/server/db/schemas/product.ts` — add `productImageUploadsTable`.
- `lib/server/dal/products.ts` — add `recordProductImageUpload`, `setProductImages`, `discardStagedImages`; change `deleteUserProduct`'s return; delete `addProductImages` and `removeProductImage`.
- `lib/server/uploadthing.ts` — `productImage` stages only.
- `lib/schemas/product.ts` — the `images` field's parser.
- `lib/actions/products.ts` — create/update commit images; `discardStagedImagesAction` replaces `removeProductImageAction`; delete clears images.
- `components/product-images.tsx` — becomes a controlled view.
- `components/product-form.tsx` — owns the image list; Discard becomes a button.
- `package.json` — `tsx` dev dependency and the `cleanup:images` script.

**Untouched on purpose:** every read in `lib/server/dal/products.ts` (`getPublishedProducts`, `getPublishedProduct`, `searchPublishedProducts`, `getCartProducts`, `getUserProduct`), `components/product-file.tsx`, `lib/server/dal/downloads.ts`, `app/(master)/products/new/page.tsx`, `app/(master)/products/[id]/page.tsx`.

---

## Task 1: The staging table

**Files:**
- Modify: `lib/server/db/schemas/product.ts` (append after `productUploadsTable`, ~line 133)
- Modify: `lib/server/dal/products.ts` (imports at line 13-18; new function after `recordProductUpload`, ~line 64)
- Generated: `drizzle/0008_*.sql`, `drizzle/meta/*`

**Interfaces:**
- Consumes: nothing.
- Produces: `productImageUploadsTable`, `type ProductImageUpload`, and `recordProductImageUpload(input: { ownerId: string; key: string; url: string }): Promise<void>`.

- [ ] **Step 1: Add the table**

Append to `lib/server/db/schemas/product.ts`:

```ts
/**
 * Images uploaded for a product that does not exist yet, or for one whose form
 * has not been saved.
 *
 * The same indirection `product_uploads` gives the product file, for the same
 * reason: the bytes land while the form is still being filled in, so there is
 * nothing to hang them on until the user saves. The completion callback writes
 * here; saving copies the urls onto the product.
 *
 * Deliberately a second table rather than a `kind` column on `product_uploads`.
 * The real difference between the two is ACL, not shape — images are uploaded
 * `public-read` and the product file is uploaded `private`. Sharing one table
 * would let a client submit an image's key as a product's `fileKey`: the lookup
 * would succeed and the product would end up selling a publicly fetchable file.
 * Two tables make that unrepresentable.
 *
 * Also unlike `product_uploads`, a row here is deleted the moment it is claimed.
 * It is the pending state and nothing else — once the url is in
 * `products.images`, the product is the record. That is what lets the orphan
 * sweep find candidates by age alone.
 */
export const productImageUploadsTable = pgTable(
  'product_image_uploads',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // UploadThing's file key — what deleting the file from storage takes.
    key: varchar({ length: 255 }).notNull(),
    // The ufsUrl, which is what products.images stores. Kept alongside the key
    // so neither the claim nor the sweep has to parse one out of the other.
    url: varchar({ length: 512 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    // A retried completion callback describes a row that already exists, so it
    // writes one row rather than two.
    uniqueIndex('product_image_uploads_key_unq').on(table.key),
    // The claim looks rows up by url, because the url is what the form submits.
    uniqueIndex('product_image_uploads_url_unq').on(table.url),
    // The sweep's only filter is age.
    index('product_image_uploads_createdAt_idx').on(table.createdAt),
  ],
)

export type ProductImageUpload = typeof productImageUploadsTable.$inferSelect
```

- [ ] **Step 2: Add the DAL writer**

In `lib/server/dal/products.ts`, extend the schema import:

```ts
import {
  productImageUploadsTable,
  productUploadsTable,
  productsTable,
  type Product,
  type ProductStatus,
} from '@/lib/server/db/schemas/product'
```

and add, directly after `recordProductUpload`:

```ts
/**
 * Records an image uploaded for a product that has not been saved yet.
 *
 * Written only by the productImage route's completion callback — the browser
 * never names a url the server has not seen land. `onConflictDoNothing` covers a
 * retried callback the same way `recordProductUpload` does.
 */
export async function recordProductImageUpload(input: {
  ownerId: string
  key: string
  url: string
}): Promise<void> {
  await db
    .insert(productImageUploadsTable)
    .values(input)
    .onConflictDoNothing({ target: productImageUploadsTable.key })
}
```

- [ ] **Step 3: Ask Gabi to generate and run the migration**

Ask him to run:

```bash
npm run schema:migrations:generate
npm run schema:migrations:run
```

Expected: a new `drizzle/0008_*.sql` creating `product_image_uploads` with the two unique indexes, one plain index, and the `owner_id` foreign key with `ON DELETE cascade`. Read the generated SQL and confirm it before continuing. If it contains any statement touching `products`, `product_uploads`, or any auth table, stop and report — this task adds a table and nothing else.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/server/db/schemas/product.ts lib/server/dal/products.ts drizzle
git commit -m "feat: add product_image_uploads staging table"
```

---

## Task 2: The commit and discard queries

**Files:**
- Modify: `lib/server/dal/products.ts` (replace `addProductImages` ~lines 136-170 and `removeProductImage` ~lines 203-227; change `deleteUserProduct` ~lines 181-201)

**Interfaces:**
- Consumes: `productImageUploadsTable`, `getUserProduct(id, ownerId)`, `MAX_PRODUCT_IMAGES`.
- Produces:
  - `setProductImages(id: number, ownerId: string, urls: string[]): Promise<{ product: Product; removed: string[] } | null>`
  - `discardStagedImages(ownerId: string, urls: string[]): Promise<string[]>` (returns the deleted rows' keys)
  - `deleteUserProduct(id: number, ownerId: string): Promise<{ images: string[] } | null>` (was `Promise<boolean>`)

- [ ] **Step 1: Replace `addProductImages` with `setProductImages`**

Delete `addProductImages` entirely and put this in its place:

```ts
/**
 * Commits a product's image list.
 *
 * The whole array is written at once, because the form owns it: adds, removals
 * and their order are one decision the user makes and one statement the database
 * takes. `removed` is what the caller needs to delete from storage.
 *
 * The list comes from the browser, which is safe only because of the check
 * below: a url is accepted when the product already holds it, or when it matches
 * an upload row owned by this user. Anything else means the list is not one this
 * user could have built, so nothing is written at all — a partial commit would
 * be worse than a rejected one.
 *
 * The claimed rows are then deleted. They existed to say "uploaded, not yet on a
 * product", and that is no longer true.
 *
 * Not a transaction. The failure it would prevent — the array written but the
 * rows left behind — costs a sweep of rows whose urls are live, and the sweep
 * checks for exactly that before deleting anything.
 */
export async function setProductImages(
  id: number,
  ownerId: string,
  urls: string[],
): Promise<{ product: Product; removed: string[] } | null> {
  // The endpoint can no longer count images for a product it is not told about,
  // so this is where the cap is enforced. Duplicates are rejected rather than
  // collapsed: the form cannot produce them, so a list containing one is not a
  // list this user built.
  if (urls.length > MAX_PRODUCT_IMAGES) return null
  if (new Set(urls).size !== urls.length) return null

  const product = await getUserProduct(id, ownerId)
  if (!product) return null

  const committed = new Set(product.images)
  const claimable = urls.filter((url) => !committed.has(url))

  const staged = claimable.length
    ? await db
        .select({ id: productImageUploadsTable.id })
        .from(productImageUploadsTable)
        .where(
          and(
            eq(productImageUploadsTable.ownerId, ownerId),
            inArray(productImageUploadsTable.url, claimable),
          ),
        )
    : []

  // Every url was either already on the product or is an upload of this user's.
  // A count mismatch means one was neither.
  if (staged.length !== claimable.length) return null

  const [updated] = await db
    .update(productsTable)
    .set({ images: urls })
    .where(
      and(
        eq(productsTable.id, id),
        eq(productsTable.ownerId, ownerId),
        isNull(productsTable.deletedAt),
      ),
    )
    .returning()

  if (!updated) return null

  if (staged.length > 0) {
    await db.delete(productImageUploadsTable).where(
      inArray(
        productImageUploadsTable.id,
        staged.map((row) => row.id),
      ),
    )
  }

  const next = new Set(urls)
  return { product: updated, removed: product.images.filter((url) => !next.has(url)) }
}
```

- [ ] **Step 2: Replace `removeProductImage` with `discardStagedImages`**

Delete `removeProductImage` entirely and put this in its place:

```ts
/**
 * Drops uploads that were never committed to a product.
 *
 * Owner-scoped, and it only ever matches staging rows — a url that reached a
 * product has no row left, so this can never detach a live image. That is what
 * makes the returned keys safe to delete from storage.
 *
 * Returns the keys of the rows it actually deleted, so a url that was already
 * claimed, or was never this user's, simply contributes nothing.
 */
export async function discardStagedImages(
  ownerId: string,
  urls: string[],
): Promise<string[]> {
  if (urls.length === 0) return []

  const rows = await db
    .delete(productImageUploadsTable)
    .where(
      and(
        eq(productImageUploadsTable.ownerId, ownerId),
        inArray(productImageUploadsTable.url, urls),
      ),
    )
    .returning({ key: productImageUploadsTable.key })

  return rows.map((row) => row.key)
}
```

- [ ] **Step 3: Make `deleteUserProduct` return the images it cleared**

Replace the whole function:

```ts
/**
 * Owner-scoped soft delete: sets the tombstone instead of removing the row, so
 * purchases and downloads keep resolving. Returns null when nothing matched
 * (wrong owner, non-existent id, or already deleted).
 *
 * The images are cleared in the same statement and handed back, so the caller
 * can delete the files. The tombstone exists for the buyer's sake — no buyer
 * surface renders product images, so keeping them would only be storage nobody
 * can ever reach. The product's file is deliberately left alone: buyers hold a
 * claim on what they paid for.
 *
 * Two statements, in this order, because the tombstone is what makes the read
 * safe. RETURNING yields post-update values, and this first statement does not
 * touch `images` — so it reports the list as it stood, atomically. Every writer
 * of that column requires `deleted_at is null`, so once this returns, nothing
 * can add an image to this product again. Reading first and clearing second
 * would leave a window where a concurrent save's url is wiped by a stale list
 * and its staging row is already claimed, leaving a file nothing references and
 * no sweep can find.
 *
 * A failure between the two leaves a deleted product still holding its urls.
 * That costs storage and breaks nothing — the images stay referenced, so the
 * sweep leaves them alone too.
 */
export async function deleteUserProduct(
  id: number,
  ownerId: string,
): Promise<{ images: string[] } | null> {
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
    .returning({ images: productsTable.images })

  if (!deleted) return null

  // Owner and tombstone are already proven by the statement above; the id is
  // all this needs.
  await db
    .update(productsTable)
    .set({ images: [] })
    .where(eq(productsTable.id, id))

  return { images: deleted.images }
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: exactly three errors, all of them callers this plan rewrites next —
- `lib/server/uploadthing.ts`: `addProductImages` has no exported member
- `lib/actions/products.ts`: `removeProductImage` has no exported member
- `lib/actions/products.ts`: `deleteUserProduct` result used as a boolean *(only if the call site tests it; today it does not, so this one may not appear)*

If any error names a file outside those two, stop and report.

- [ ] **Step 5: Commit**

```bash
git add lib/server/dal/products.ts
git commit -m "feat: commit product images as one owner-scoped list"
```

The repo does not typecheck at this commit; Task 3 and Task 4 close it. That is deliberate — splitting the DAL from its callers keeps each diff reviewable.

---

## Task 3: Actions and the images field

**Files:**
- Modify: `lib/schemas/product.ts` (after `createProductSchema`, ~line 78)
- Modify: `lib/actions/products.ts` (whole file's imports, `createProductAction`, `updateProductAction`, replace `removeProductImageAction`, `deleteProductAction`)

**Interfaces:**
- Consumes: `setProductImages`, `discardStagedImages`, `deleteUserProduct` from Task 2; `deleteUploadedFiles(urls)` and `deleteUploadedFileKeys(keys)` from `lib/server/uploadthing.ts`.
- Produces:
  - `productImagesField` — a zod schema parsing a JSON url array, capped at `MAX_PRODUCT_IMAGES`
  - `discardStagedImagesAction(urls: string[]): Promise<void>`
  - `createProductAction` / `updateProductAction` accept an `images` FormData field

- [ ] **Step 1: Add the field parser**

In `lib/schemas/product.ts`, after `createProductSchema`:

```ts
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
  .string()
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
```

`productImagesField` must be declared **before** `createProductSchema`, which is otherwise unchanged — the images do not belong on it. That schema is shared with the client: `ProductForm` hands it to `zodResolver` and the edit page builds its prefill from `z.input` of it, and `images` is not a field any input is bound to. Add a server-side schema instead, after `CreateProductInput`:

```ts
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
```

and change `createProductWithFileSchema` to extend `saveProductSchema`.

- [ ] **Step 2: Rewrite the actions**

`lib/actions/products.ts` — imports first:

```ts
import {
  createProduct,
  deleteUserProduct,
  discardStagedImages,
  setProductImages,
  updateUserProduct,
} from '@/lib/server/dal/products'
import { revalidateStorefront } from '@/lib/server/revalidate'
import {
  deleteUploadedFileKeys,
  deleteUploadedFiles,
} from '@/lib/server/uploadthing'
```

In `createProductAction`, parse the new field and commit the images after the insert:

```ts
  const parsed = createProductWithFileSchema.safeParse({
    ...Object.fromEntries(formData.entries()),
    // Required, not defaulted. The form always sends the field — "[]" when
    // there are none — so an absent one is a broken client, and saying so beats
    // reading it as "no images".
    images: formData.get('images'),
  })

  if (!parsed.success) {
    const { fieldErrors, formErrors } = z.flattenError(parsed.error)
    return { fieldErrors, formError: formErrors[0] }
  }

  const { name, description, price, status, fileKey, images } = parsed.data

  const product = await createProduct({
    ownerId: user.id,
    name,
    description: description || null,
    priceInCents: Math.round(price * 100),
    status,
    fileKey,
  })

  // The key named no upload of this user's. In practice that is a form left open
  // across a sign-out, or one submitted with a key the browser invented — either
  // way the fix is the same, so it is reported on the field that carries it.
  if (!product) {
    return {
      fieldErrors: {
        fileKey: ['That upload could not be found. Please choose the file again.'],
      },
    }
  }

  // A second statement rather than part of the insert. The product exists
  // either way, and images that fail to attach are a smaller problem than a
  // product that fails to exist — the user can add them again; a lost product
  // cannot be recovered from a submitted form.
  const committed =
    images.length > 0 ? await setProductImages(product.id, user.id, images) : null

  revalidatePath('/products')
  revalidateStorefront()

  // The list was not one this user could have built, so none of it attached.
  // The product page is the only place that gap is visible and fixable; the
  // list would look perfectly fine.
  if (images.length > 0 && !committed) {
    redirect(`/products/${product.id}`)
  }

  redirect(`/products`)
```

In `updateProductAction`, parse with `saveProductSchema` and commit the images **before** the field update:

```ts
  const parsed = saveProductSchema.safeParse({
    name: formData.get('name'),
    // Absent field reads as null; the schema's optional string wants undefined.
    description: formData.get('description') ?? undefined,
    price: formData.get('price'),
    status: formData.get('status'),
    images: formData.get('images'),
  })
```

```ts
  const { name, description, price, status, images } = parsed.data

  // Images first, so a list this user could not have built stops the whole save
  // before anything is written. Reversed, a rejected list would leave the other
  // fields updated and the user told the save failed.
  const committed = await setProductImages(productId, user.id, images)
  if (!committed) {
    return { formError: 'Those images could not be saved' }
  }

  const product = await updateUserProduct({ /* …unchanged… */ })

  if (!product) {
    // The images above did commit, so this is not a no-op failure: the product
    // was deleted between the two statements. Revalidate before reporting, or
    // the caches keep serving the images the row no longer has.
    revalidatePath('/products')
    revalidatePath(`/products/${productId}`)
    revalidateStorefront()
    return { formError: 'Product not found' }
  }

  // Detached above, deleted here: the row no longer points at these urls, so a
  // failed storage delete costs storage rather than a broken page.
  await deleteUploadedFiles(committed.removed)
```

- [ ] **Step 3: Replace `removeProductImageAction`**

Delete it and put this in its place:

```ts
/**
 * Throws away uploads the user backed out of — the X on an image that was never
 * saved, and everything staged when Discard is pressed.
 *
 * Only staging rows can match, so this cannot detach an image from a product;
 * committed images leave through setProductImages when the form is saved.
 *
 * Returns nothing. The image is already gone from the form's state, and a
 * failure here leaves an orphan the sweep collects rather than anything the user
 * could act on.
 */
export async function discardStagedImagesAction(urls: string[]): Promise<void> {
  const user = await requireUser()

  const keys = await discardStagedImages(user.id, urls)
  await deleteUploadedFileKeys(keys)
}
```

- [ ] **Step 4: Delete the product's images with the product**

```ts
export async function deleteProductAction(id: string): Promise<void> {
  const user = await requireUser()

  const productId = Number(id)
  if (Number.isInteger(productId)) {
    const deleted = await deleteUserProduct(productId, user.id)
    // Detached first, deleted second: the row no longer points at these urls, so
    // a failed storage delete costs storage rather than a broken page.
    if (deleted) await deleteUploadedFiles(deleted.images)
    revalidatePath('/products')
    revalidateStorefront()
  }

  redirect('/products')
}
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: two remaining errors, both closed by Task 4 —
- `lib/server/uploadthing.ts`: `addProductImages` has no exported member
- `components/product-images.tsx`: `removeProductImageAction` has no exported member

- [ ] **Step 6: Commit**

```bash
git add lib/schemas/product.ts lib/actions/products.ts
git commit -m "feat: commit and discard product images from the actions"
```

---

## Task 4: Staging endpoint and the form

**Files:**
- Modify: `lib/server/uploadthing.ts:24-61` (the `productImage` route)
- Modify: `components/product-images.tsx` (whole file)
- Modify: `components/product-form.tsx` (props, state, submit, Discard, render)

**Interfaces:**
- Consumes: `recordProductImageUpload` (Task 1), `discardStagedImagesAction` (Task 3).
- Produces: `ProductImages({ images, onUploaded, onRemove })`; `ProductForm` submits an `images` FormData field.

- [ ] **Step 1: Make the endpoint stage only**

Replace the whole `productImage` entry in `lib/server/uploadthing.ts`:

```ts
  /**
   * A product image, uploaded before it is attached to anything.
   *
   * It takes no productId and does not touch `products`. Images are form state
   * until the user saves — that is what makes Discard mean something and what
   * lets a product being created carry images at all — so all this does is
   * record that the bytes landed, and whose they are.
   *
   * Nothing is revalidated here for the same reason: no page shows anything
   * different until the form is saved.
   *
   * maxFileCount caps one batch. The product-wide MAX_PRODUCT_IMAGES is enforced
   * by the form on select and by setProductImages on commit, which are the two
   * places that can still count.
   */
  productImage: f({ image: { maxFileSize: '4MB', maxFileCount: 4 } })
    .middleware(async () => {
      // getUser(), not requireUser(): a redirect is the wrong response shape
      // for an upload endpoint.
      const user = await getUser()
      if (!user) throw new UploadThingError('Unauthorized')

      return { ownerId: user.id }
    })
    // Fires once per file, from UploadThing's servers.
    .onUploadComplete(async ({ metadata, file }) => {
      // ufsUrl, not url/appUrl — those are deprecated and go away in v9.
      await recordProductImageUpload({
        ownerId: metadata.ownerId,
        key: file.key,
        url: file.ufsUrl,
      })

      return { url: file.ufsUrl }
    }),
```

Fix the imports at the top of the file — `addProductImages` and `getUserProduct` are no longer used by this route, `MAX_PRODUCT_IMAGES` no longer either, and `revalidatePath`/`revalidateStorefront` are only still needed if another route uses them (they are not):

```ts
import { createUploadthing, type FileRouter } from 'uploadthing/next'
import { UTApi, UploadThingError } from 'uploadthing/server'

import {
  MAX_PRODUCT_FILE_BYTES,
  MAX_PRODUCT_FILE_LABEL,
} from '@/lib/schemas/product'
import { recordProductImageUpload, recordProductUpload } from '@/lib/server/dal/products'
import { getUser } from '@/lib/server/session'
```

(the `z` import goes too — nothing takes `.input()` any more; `next/cache` and `@/lib/server/revalidate` go with it.)

- [ ] **Step 2: Make `ProductImages` a controlled view**

Replace `components/product-images.tsx` entirely:

```tsx
"use client"

import { useState } from "react"
import { X } from "lucide-react"

import { Image } from "@/components/image"
import { UploadDropzone } from "@/lib/client/uploadthing"
import { MAX_PRODUCT_IMAGES } from "@/lib/schemas/product"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

/**
 * The image list, as a controlled field.
 *
 * It makes no server call of its own and knows nothing about products. Whether a
 * removed image needs cleaning up is the form's question — it is the one that
 * knows which urls it uploaded this session — so this only reports the two
 * things that happen here: files arrived, or one was dismissed.
 */
export function ProductImages({
  images,
  onUploaded,
  onRemove,
}: {
  // Urls in display order. The first is the cover.
  images: string[]
  onUploaded: (urls: string[]) => void
  onRemove: (url: string) => void
}) {
  const [error, setError] = useState<string | null>(null)

  const atLimit = images.length >= MAX_PRODUCT_IMAGES

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Images</CardTitle>
        <span className="text-sm text-muted-foreground">
          {images.length} of {MAX_PRODUCT_IMAGES}
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2.5">
            {images.map((url) => (
              <div
                key={url}
                className="group/image relative size-24 overflow-hidden rounded-lg border border-border bg-muted"
              >
                <Image
                  src={url}
                  alt=""
                  fill
                  sizes="96px"
                  className="object-cover"
                />
                {/* Revealed on hover, but always reachable by keyboard. */}
                <Button
                  type="button"
                  size="icon-xs"
                  variant="destructive"
                  aria-label="Remove image"
                  onClick={() => onRemove(url)}
                  className="absolute top-1 right-1 bg-background/80 opacity-0 backdrop-blur-sm transition-opacity group-hover/image:opacity-100 focus-visible:opacity-100"
                >
                  <X />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Hidden at the cap so the user can't start a batch that would be
            rejected on save. setProductImages is still the authority. */}
        {atLimit ? (
          <p className="text-sm text-muted-foreground">
            Limit of {MAX_PRODUCT_IMAGES} images reached.
          </p>
        ) : (
          <UploadDropzone
            endpoint="productImage"
            // Upload on drop/select instead of making the user click again.
            config={{ mode: "auto" }}
            // The urls are recorded as pending uploads by the endpoint's server
            // callback, which has already run by the time this fires — so the
            // form can submit them the moment it has them.
            onClientUploadComplete={(res) => {
              setError(null)
              onUploaded(res.map((file) => file.serverData.url))
            }}
            onUploadError={(e) => setError(e.message)}
            // ut-* variants come from `uploadthing/tw/v4`; these repaint the
            // defaults with our tokens. ut-button mirrors the Button `default`
            // variant so the inner control matches the design system.
            className="mt-0 rounded-lg border-border bg-background p-6 ut-uploading:border-ring/50 ut-label:text-sm ut-label:font-medium ut-label:text-foreground ut-label:hover:text-primary ut-upload-icon:text-muted-foreground ut-allowed-content:text-sm ut-allowed-content:text-muted-foreground ut-button:h-8 ut-button:w-auto ut-button:rounded-lg ut-button:bg-primary ut-button:px-2.5 ut-button:text-sm ut-button:font-medium ut-button:text-primary-foreground ut-button:transition-all ut-button:after:bg-primary/60 ut-button:hover:bg-primary/80 ut-button:focus-within:ring-3 ut-button:focus-within:ring-ring/50"
          />
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Give the form the image list**

In `components/product-form.tsx`, extend the imports:

```tsx
import { useActionState, useEffect, useRef, useState, startTransition } from "react"
import { useRouter } from "next/navigation"
```

```tsx
import { discardStagedImagesAction, type ProductFormState } from "@/lib/actions/products"
import { MAX_PRODUCT_IMAGES, createProductSchema } from "@/lib/schemas/product"
```

Add the state, just below `const upload = useProductFileUpload()`:

```tsx
  const router = useRouter()
  // The image list is form state now, on both pages: what is on screen is what
  // Save will write.
  const [imageList, setImageList] = useState<string[]>(images)
  // Which of them this session uploaded and no save has claimed yet. A ref, not
  // state, because nothing renders differently for a staged image — it only
  // decides whether removing one has anything to clean up. Dropping a staged url
  // deletes its bytes immediately: nothing references it, and no save can bring
  // it back. A committed one waits for Save, so a failed save leaves the product
  // rendering the images it still has.
  const staged = useRef(new Set<string>())

  function handleUploaded(urls: string[]) {
    setImageList((current) => {
      const next = [...current, ...urls].slice(0, MAX_PRODUCT_IMAGES)
      for (const url of next) if (urls.includes(url)) staged.current.add(url)
      return next
    })
  }

  function handleRemoveImage(url: string) {
    setImageList((current) => current.filter((image) => image !== url))
    if (!staged.current.delete(url)) return
    startTransition(async () => {
      await discardStagedImagesAction([url])
    })
  }

  function handleDiscard() {
    const pending = [...staged.current]
    staged.current.clear()
    if (pending.length > 0) {
      startTransition(async () => {
        await discardStagedImagesAction(pending)
      })
    }
    router.push("/products")
  }
```

- [ ] **Step 4: Submit the list, and make Discard a button**

In `submitWith`, add the field alongside the others:

```tsx
      formData.set("status", status)
      formData.set("images", JSON.stringify(imageList))
```

Replace the Discard link:

```tsx
          <Button type="button" variant="ghost" onClick={handleDiscard}>
            Discard
          </Button>
```

and drop `buttonVariants` from the `@/components/ui/button` import if nothing else uses it.

- [ ] **Step 5: Render the images card on both pages**

Replace the gated block at the end of the form:

```tsx
      {/* Images are staged uploads until the form is saved, so this needs no
          product to attach to — a product being created carries them from its
          first save. */}
      <ProductImages
        images={imageList}
        onUploaded={handleUploaded}
        onRemove={handleRemoveImage}
      />
```

- [ ] **Step 6: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors. This is the commit where the repo typechecks again.

- [ ] **Step 7: Ask Gabi to run the app and walk the paths**

Run: `npm run dev`, then in the browser:

1. `/products/new` — the Images card is present. Drop two images; both appear.
2. Fill name and price, press **Publish**. The product list shows the product with its cover image.
3. Open it. Remove one image, press **Save draft**. It is gone. Confirm in UploadThing's dashboard that the file is gone too.
4. Add an image, then press **Discard**. Back on `/products`, the product still shows only its old image, and the new file is gone from UploadThing.
5. On `/products/new`, upload an image, then press **Discard**. No product was created and the file is gone from UploadThing.
6. Upload an image on `/products/new`, then click its X. The file is gone from UploadThing immediately.

- [ ] **Step 8: Commit**

```bash
git add lib/server/uploadthing.ts components/product-images.tsx components/product-form.tsx
git commit -m "feat: stage product images and commit them on save"
```

---

## Task 5: The orphan sweep

**Files:**
- Create: `scripts/cleanup-orphaned-images.ts`
- Modify: `package.json` (`devDependencies`, `scripts`)

**Interfaces:**
- Consumes: `db`, `productImageUploadsTable`, `productsTable`.
- Produces: `npm run cleanup:images`.

- [ ] **Step 1: Ask Gabi to add the runner**

Ask him to run:

```bash
npm install -D tsx
```

Then add to `package.json` `scripts`, next to the other `schema:*` entries:

```json
"cleanup:images": "tsx --conditions=react-server --env-file=.env scripts/cleanup-orphaned-images.ts"
```

`tsx` rather than plain node: node's native TypeScript support is type stripping and nothing else — it ignores `tsconfig.json` by design, at every version, so `@/*` never resolves. `--conditions=react-server` because the `server-only` package resolves to a module that throws under any other condition; nothing this script imports carries that marker today, and the flag is what keeps that true if one ever does.

- [ ] **Step 2: Write the script**

Create `scripts/cleanup-orphaned-images.ts`:

```ts
/**
 * Deletes product images that were uploaded and never used.
 *
 * The app cleans up every case it can see — an image dropped from a form, a
 * discarded edit, a deleted product. What it cannot see is a form abandoned: a
 * tab closed, a browser Back, a session that ended. Those leave a
 * product_image_uploads row and a file, and this is what collects them.
 *
 * A claimed upload has no row left, so age alone finds the candidates. The
 * `not exists` below is a race guard rather than the filter: a form open longer
 * than the retention window could save between this read and the delete.
 *
 * Dry run unless --delete. Deleting is not reversible and the rows name real
 * files, so the default is to say what would happen.
 *
 * Usage:
 *   npm run cleanup:images
 *   npm run cleanup:images -- --delete
 *   npm run cleanup:images -- --older-than=7d --delete
 */
import { and, lt, sql } from 'drizzle-orm'
import { UTApi } from 'uploadthing/server'

import db from '@/lib/server/db'
import {
  productImageUploadsTable,
  productsTable,
} from '@/lib/server/db/schemas/product'

// Long enough that no real editing session is swept out from under a user, short
// enough that abandoned uploads do not accumulate for a week.
const DEFAULT_RETENTION_HOURS = 24

// The app's own UTApi swallows delete failures, because there the user's action
// has already succeeded and a leftover file is only cost. Here a failure is the
// result, so this one is built locally and left to throw.
const utapi = new UTApi()

// UploadThing takes a batch; a sweep after a long gap can find far more than one
// request should carry.
const DELETE_BATCH = 100

function parseRetentionHours(argv: string[]) {
  const flag = argv.find((arg) => arg.startsWith('--older-than='))
  if (!flag) return DEFAULT_RETENTION_HOURS

  const value = flag.slice('--older-than='.length)
  const match = /^(\d+)([hd])$/.exec(value)
  if (!match) {
    throw new Error(`--older-than must look like 24h or 7d, got "${value}"`)
  }

  const [, amount, unit] = match
  return Number(amount) * (unit === 'd' ? 24 : 1)
}

function formatAge(createdAt: Date) {
  const hours = Math.floor((Date.now() - createdAt.getTime()) / 3_600_000)
  return hours >= 48 ? `${Math.floor(hours / 24)}d ago` : `${hours}h ago`
}

async function main() {
  const argv = process.argv.slice(2)
  const shouldDelete = argv.includes('--delete')
  const hours = parseRetentionHours(argv)
  const cutoff = new Date(Date.now() - hours * 3_600_000)

  const orphans = await db
    .select({
      id: productImageUploadsTable.id,
      key: productImageUploadsTable.key,
      url: productImageUploadsTable.url,
      ownerId: productImageUploadsTable.ownerId,
      createdAt: productImageUploadsTable.createdAt,
    })
    .from(productImageUploadsTable)
    .where(
      and(
        lt(productImageUploadsTable.createdAt, cutoff),
        // Correlated on the outer row's url. A claimed upload has no row here at
        // all, so this only ever catches the race described above.
        sql`not exists (
          select 1 from ${productsTable}
          where ${productsTable.images} @> array[${productImageUploadsTable.url}]::text[]
        )`,
      ),
    )

  if (orphans.length === 0) {
    console.log(`No orphaned staged images older than ${hours}h.`)
    return
  }

  console.log(
    shouldDelete
      ? `${orphans.length} orphaned staged images older than ${hours}h:`
      : `DRY RUN — nothing deleted\n${orphans.length} orphaned staged images older than ${hours}h:`,
  )
  for (const row of orphans) {
    console.log(
      `  ${row.key}  ${row.url}  owner ${row.ownerId}  ${formatAge(row.createdAt)}`,
    )
  }

  if (!shouldDelete) {
    console.log('\nrun with --delete to remove')
    return
  }

  // Files first, rows second. A failed storage delete leaves a row the next run
  // retries; the other order loses the key and the file becomes unreachable.
  for (let i = 0; i < orphans.length; i += DELETE_BATCH) {
    const batch = orphans.slice(i, i + DELETE_BATCH)
    await utapi.deleteFiles(batch.map((row) => row.key))
    await db.delete(productImageUploadsTable).where(
      sql`${productImageUploadsTable.id} in ${batch.map((row) => row.id)}`,
    )
  }

  console.log(`\ndeleted ${orphans.length} files, ${orphans.length} rows`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
```

Note the row delete uses `inArray` semantics; if drizzle rejects the `sql` form above, use the typed helper instead and add `inArray` to the `drizzle-orm` import:

```ts
    await db
      .delete(productImageUploadsTable)
      .where(inArray(productImageUploadsTable.id, batch.map((row) => row.id)))
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. If `scripts/` is outside the `include` in `tsconfig.json`, add it — the file must be typechecked with everything else.

- [ ] **Step 4: Ask Gabi to run the dry run**

Run: `npm run cleanup:images`
Expected, with nothing stale in the table: `No orphaned staged images older than 24h.`

Then create one deliberately: upload an image on `/products/new` and close the tab without saving. Run:

```bash
npm run cleanup:images -- --older-than=0h
```

Expected: `DRY RUN — nothing deleted`, one row listed, `run with --delete to remove`. Confirm the file is still in UploadThing.

- [ ] **Step 5: Ask Gabi to run the delete**

Run: `npm run cleanup:images -- --older-than=0h --delete`
Expected: the row listed, then `deleted 1 files, 1 rows`. Confirm the file is gone from UploadThing and the row is gone from `product_image_uploads`.

Then confirm the guard: open a product with images, run `npm run cleanup:images -- --older-than=0h`. Expected: `No orphaned staged images older than 0h.` — committed images have no rows, so nothing is ever a candidate.

- [ ] **Step 6: Commit**

```bash
git add scripts/cleanup-orphaned-images.ts package.json package-lock.json
git commit -m "feat: sweep orphaned product image uploads"
```

---

## Task 6: Documentation

**Files:**
- Modify: `CLAUDE.md` (after the "Database schema" section)

**Interfaces:**
- Consumes: everything above.
- Produces: nothing code depends on.

- [ ] **Step 1: Document the two staging tables**

Append to `CLAUDE.md`:

```markdown
# Uploads

Both kinds of upload are staged before they belong to anything, so a product
being created can carry them.

`product_uploads` holds the digital product file. Rows outlive the claim —
`createProduct` copies the name and size onto the product and leaves the row as
the record of what was uploaded.

`product_image_uploads` holds images. Rows are deleted when claimed, so a
surviving row means a pending upload and nothing else. `scripts/` sweeps the ones
no form ever saved: `npm run cleanup:images` reports, `-- --delete` acts.

They are separate tables because images upload `public-read` and product files
upload `private`. One table would let an image's key be claimed as a product's
`fileKey`, and the product would sell a publicly fetchable file.

Images commit on Save, on both the create and edit pages: the form owns the list
and `setProductImages` writes it whole, having checked every url against the
product's current images or a staging row of the same owner.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document staged uploads"
```

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
| --- | --- |
| `product_image_uploads` schema | 1 |
| `recordProductImageUpload` | 1 |
| `setProductImages`, `discardStagedImages`, `deleteUserProduct` returning images | 2 |
| `images` field parser | 3 |
| Actions: create, update, discard, delete | 3 |
| Endpoint stages only, no `productId`, no revalidate | 4 |
| Controlled `ProductImages`, form owns the list, Discard is a button | 4 |
| Images card on the create page | 4 |
| `tsx` dev dep, `cleanup:images`, `--conditions=react-server` | 5 |
| Sweep query with the `not exists` race guard, 24h default, dry run | 5 |
| Manual test paths from the spec | 4 (paths 1-6), 5 (sweep) |

The spec's "Submit an image url belonging to another user" check has no browser
path — it is covered by `setProductImages` returning null, which Task 3's
`updateProductAction` surfaces as `Those images could not be saved`.

**Type consistency:** `setProductImages` is `(id, ownerId, urls) => { product, removed } | null` in Tasks 2, 3 and the spec. `discardStagedImages` returns keys; `discardStagedImagesAction` takes urls and returns void — used with urls in Task 4. `deleteUserProduct` returns `{ images } | null` in Tasks 2 and 3. `ProductImages` takes `{ images, onUploaded, onRemove }` in Task 4's component and its call site. The form's state is `imageList`/`setImageList` rather than `productImages`/`setProductImages`, so nothing in a client component reads like the server-only DAL function.

**Placeholders:** none. Every step that changes code shows the code.
