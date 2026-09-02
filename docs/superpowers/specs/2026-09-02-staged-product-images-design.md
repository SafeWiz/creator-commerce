# Staged product images and orphan cleanup

Date: 2026-09-02

## Problem

Product images and the product file are uploaded through two different shapes,
and only one of them is good.

The product file is staged. `productFile` uploads before any product row exists,
its completion callback records a `product_uploads` row against the uploader, and
`createProduct` claims that row by key. The create form can therefore accept a
file while it is still being filled in.

Images are not. `productImage` takes a `productId` in its input, and its callback
appends straight to `products.images`. Two consequences:

1. A new product cannot have images. `ProductForm` renders the images card only
   when `productId != null`, so images are something you add on a second visit,
   after the product already exists.
2. On the edit page, an image is saved the instant it uploads. **Discard** is a
   `<Link href="/products">`, so it cannot undo an image add — the button
   silently means less than it says.

Separately, nothing reclaims image storage in the cases where the app can see
that a file is dead. Removing an image deletes it from UploadThing today
(`removeProductImageAction`), but deleting a product leaves every one of its
images in storage forever, and there is no sweep for the uploads nobody ever
claimed.

## Scope

- Images are staged before they are attached, like the product file — so a new
  product can carry images from the first save.
- Image changes commit on **Save**, on both the create and edit pages. Discard
  means what it says on both.
- Every case where the app can prove an image is dead deletes it from
  UploadThing: removal, discard, product delete.
- A `scripts/` folder with a sweep for the cases it cannot prove.

Out of scope: reordering images and picking a cover explicitly (the array's order
is still the display order, first is still the cover); `beforeunload` beacons for
a closed tab; sweeping `product_uploads` for abandoned product files; any cap on
how many images one user can stage without ever saving.

## Decisions

**A separate `product_image_uploads` table, not a shared one.** A generic
`file_uploads` table serving both would work, but it needs a discriminator, and
the honest one is not "kind" — it is ACL. `productImage` uploads land
`public-read`; `productFile` uploads land `private`, which is the whole point of
signed downloads. Sharing a table without a column for that lets a client submit
an image's key as `fileKey` at create: the lookup succeeds, the product is
written, and a paid product now sells a publicly fetchable file. Two tables make
the discriminator structural, so the bypass cannot be expressed.

**`products.images text[]` stays.** A real `product_images` table with a nullable
`product_id` would be a cleaner model — proper ordering, a trivial orphan query,
no claim-copy step. It would also turn every product read (`StorefrontProduct`,
`StorefrontProductDetail`, `ExploreProduct`, `CartProduct`) into a join or
aggregate, and require migrating the existing arrays. Not worth it for what this
change buys.

**Staged rows are deleted when claimed.** This diverges from `product_uploads`,
whose comment says rows outlive the claim as a record of what was uploaded. Here
the row *is* the pending state and nothing else: once its url is in
`products.images`, the product is the record. The payoff is that a surviving row
means a pending upload, so the sweep finds candidates by age alone rather than by
checking every row against every product's array.

**The wire value is the url, not the key.** Committed images are urls already, so
a form holding one list of one kind of thing is simpler than one holding urls and
keys and knowing which is which. The `key` column stays on the row so a delete
never has to re-parse a url.

**The client is trusted with a url list, and the DAL is what makes that safe.**
`setProductImages` accepts a url only if the product already holds it or an
owned staged row does. An invented url matches neither and never reaches the
array — the same shape of guarantee `createProduct` gets from looking its upload
up scoped to the owner.

**Removing a staged image deletes immediately; removing a committed one waits for
Save.** Not an inconsistency: a staged image is unclaimed by definition, so
nothing can resurrect it and there is nothing to roll back. A committed image is
live in `products.images`, and deleting its bytes before the shorter array is
written would leave the product rendering a broken image if the save then failed.

**Deleting a product clears its images and deletes them from storage.** The
tombstone's real job is keeping purchases and downloads intact, and no buyer
surface renders product images — `lib/server/dal/purchases.ts` and
`lib/server/dal/downloads.ts` never select the column. So the soft delete becomes
lossy for images and stays whole for everything that matters. The product file is
untouched, as ever: buyers hold a claim on what they paid for.

**The sweep is dry-run by default.** A first run by hand should show its work.
`--delete` is the flag that makes it act.

## Architecture

| Unit | Responsibility |
| --- | --- |
| `product_image_uploads` | Pending image uploads. A row means "uploaded, not yet on a product". |
| `lib/server/uploadthing.ts` | The UploadThing seam. `productImage` now only stages. |
| `lib/server/dal/products.ts` | Records staged rows; commits a url list to a product; discards staged rows. Pure data. |
| `lib/actions/products.ts` | Resolves the user, calls the DAL, deletes the detached files from storage, revalidates. |
| `components/product-form.tsx` | Owns the image list as form state and knows which entries are staged. |
| `components/product-images.tsx` | A controlled view of that list. No `productId`, no server calls. |
| `scripts/cleanup-orphaned-images.ts` | Sweeps rows the app could not prove dead. |

### Schema

```ts
// lib/server/db/schemas/product.ts
export const productImageUploadsTable = pgTable(
  'product_image_uploads',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    key: varchar({ length: 255 }).notNull(),
    url: varchar({ length: 512 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('product_image_uploads_key_unq').on(table.key),
    uniqueIndex('product_image_uploads_url_unq').on(table.url),
    index('product_image_uploads_createdAt_idx').on(table.createdAt),
  ],
)
```

`key` is unique so a retried completion callback writes one row rather than two,
matching `product_uploads`. `url` is unique because the claim looks rows up by
url, and `created_at` is indexed for the sweep.

`products.images` and `products.file_key` are unchanged, as are `product_uploads`
and every read in the DAL.

### Lifecycle

| Event | Staged row | UploadThing file | `products.images` |
| --- | --- | --- | --- |
| Upload (either page) | written | kept | untouched |
| X on a staged image | deleted now | deleted now | untouched |
| X on a committed image | n/a | deleted on Save, after the array is written | shorter on Save |
| Save / Publish | claimed rows deleted | files for removed urls deleted | written whole |
| Discard | staged rows deleted | staged files deleted | untouched |
| Delete product | n/a | all its images deleted | cleared to `'{}'` |
| Tab closed, browser back | survives | survives | untouched |

The last row is the case the app cannot see, and the only one the script exists
for.

### Upload endpoint

`productImage` loses its `.input({ productId })`. There is no product to attach
to, so the middleware's ownership lookup and its per-product cap check both go —
neither has anything to check against. What stays is the auth check and
`maxFileCount`.

The callback records the row and returns `{ url: file.ufsUrl }`. Both
`revalidatePath` calls go: nothing user-visible has changed yet.

The cap moves to the two ends that can still enforce it — the client, on select,
and `setProductImages`, on commit.

### DAL

`addProductImages` and `removeProductImage` are deleted. In their place:

```ts
// Written only by the productImage completion callback.
recordProductImageUpload(input: { ownerId: string; key: string; url: string }): Promise<void>

// The commit. Validates every url, writes the array whole, deletes the rows it
// claimed, and reports what left so the caller can delete the bytes.
setProductImages(
  id: number,
  ownerId: string,
  urls: string[],
): Promise<{ product: Product; removed: string[] } | null>

// Owner-scoped. Returns the keys of the rows it deleted.
discardStagedImages(ownerId: string, urls: string[]): Promise<string[]>

// Now returns the images it cleared, so the caller can delete them.
deleteUserProduct(id: number, ownerId: string): Promise<{ images: string[] } | null>
```

`setProductImages` runs three steps against the owner-scoped product:

1. Reject outright if `urls.length > MAX_PRODUCT_IMAGES`, or if the list holds
   the same url twice — the form cannot produce a duplicate, so a list with one
   is not a list this user built.
2. Partition the input: urls the product already holds, and urls that match an
   owned staged row. Anything in neither bucket means the list is not one this
   user could have built, so nothing is written and the call returns null.
3. Write `images` to the given list, delete the claimed rows, and return the urls
   that were on the product and are not on the new list.

Ordering falls out of the array, which is the display order — so removing a
middle image keeps the rest in place, and the first url is still the cover.

### Actions

`createProductAction` and `updateProductAction` both gain an `images` field: a
JSON-encoded url array in the `FormData`, parsed by a `z.string().transform(...)`
in `lib/schemas/product.ts` and bounded by `MAX_PRODUCT_IMAGES`. The field is
required rather than defaulted: the form always sends it — `"[]"` when there are
none — so an absent field is a broken client, and on the update path an empty
list means "remove every image", which must not look the same as a missing one.
It rides on `saveProductSchema`, not `createProductSchema` — that one is the
client form's resolver schema, and the images are not a field any input is bound
to.

For create, the commit is a second statement rather than part of the insert. The
product exists either way, and an image that fails to attach is a smaller problem
than a product that fails to exist — so a rejected list still creates the product
and redirects to `/products/{id}`, where the gap is visible, instead of to the
list, where it would not be.

For update, the commit runs **before** the field write, so a list this user could
not have built stops the save before anything is written. `deleteUploadedFiles`
then runs whether or not the field update matched a row: by that point the urls
are detached from the product and have no staging row, so it is the last chance
to reach them.

`removeProductImageAction` is replaced by `discardStagedImagesAction(urls)`,
which discards owner-scoped staged rows and deletes their files.

`deleteProductAction` deletes the returned images from storage after the tombstone
is set.

### Client

`ProductImages` becomes controlled:

```tsx
<ProductImages
  images={string[]}                    // urls, committed and staged together, in order
  error={string | null}                // the form's message and the dropzone's, one slot
  onError={(message) => void}
  onUploaded={(urls) => void}
  onRemove={(url) => void}
/>
```

It renders on both pages now — no `productId`, no `router.refresh()`, no server
call of its own. Which urls are staged stays private to the form: the component
reports only that files arrived, that one was dismissed, or that something went
wrong. `UploadDropzone` keeps `mode: 'auto'`, and trims a batch to the remaining
slots in `onBeforeUploadBegin` so nothing uploads that could not fit.

`ProductForm` owns the list, seeded from the `images` prop, and submits it as the
`images` field. It keeps the staged set in a ref and branches there: a staged url
is dropped from state and sent to `discardStagedImagesAction`; a committed one is
dropped from state and nothing else. The list is mirrored in a second ref so two
uploads completing in one tick cannot both claim the same remaining slots.

**Discard** becomes a `<button>` rather than a `<Link>`: it discards the staged
urls, then routes to `/products`. When nothing is staged it is what it was.

`ProductFileField` and `ProductFileSummary` are untouched.

## The script

`scripts/cleanup-orphaned-images.ts`, added with `tsx` as a dev dependency:

```json
"cleanup:images": "tsx --conditions=react-server --env-file=.env scripts/cleanup-orphaned-images.ts"
```

`--conditions=react-server` is load-bearing. The `server-only` package resolves
to a module that throws under any other condition, so without it every import of
`lib/server/*` crashes. `tsx` rather than plain node because node's native TS
support is type stripping only — it ignores `tsconfig.json` by design, at every
version, so `@/*` never resolves.

Orphans are rows past the window that no live product references:

```sql
select id, key, url, owner_id, created_at
from product_image_uploads
where created_at < now() - interval '24 hours'
  and not exists (
    select 1 from products
    where images @> array[product_image_uploads.url]
  )
```

Twenty-four hours is comfortably longer than any real editing session, so a form
left open over lunch is never swept out from under the user. `--older-than`
overrides it.

The `not exists` is a race guard rather than the primary filter — claiming
deletes the row, so a claimed upload has nothing left to match. It covers the one
window where age alone is wrong: a form open longer than the retention period,
saving between the sweep's read and its delete. Cheap, and it keeps the script
correct against any future path that copies a url without deleting the row.

Deletion is UploadThing first, then the rows: a failed `utapi.deleteFiles` leaves
a row that the next run retries, whereas the reverse order loses the key.

```
$ npm run cleanup:images
  DRY RUN — nothing deleted
  12 orphaned staged images older than 24h
    abc123…  https://…/f/abc123  owner u_1  3d ago
    …
  run with --delete to remove

$ npm run cleanup:images -- --delete
  deleted 12 files, 12 rows
```

## Migration

`npm run schema:migrations:generate` then `npm run schema:migrations:run` for the
new table. Nothing existing changes shape, so there is no data migration and no
backfill: images already on products stay where they are, and the first save
after this lands rewrites the array through the new path.

## Testing

There is no test runner in the repo, so this is manual, on these paths:

- Create a product with images. They are on it from the first save.
- Create a product with images, press Discard. The staged rows and their files
  are gone; no product was written.
- Edit a product, add an image, press Discard. The image is not on the product,
  and its file is gone.
- Edit a product, remove a committed image, press Save. The array is shorter and
  the file is gone. Remove one and press Discard instead: the product is
  unchanged.
- Save more than `MAX_PRODUCT_IMAGES`. The DAL refuses.
- Submit an image url belonging to another user. `setProductImages` returns null
  and writes nothing.
- Delete a product. Its images are gone from storage, its file still downloads.
- Upload an image, never save, wind the row's `created_at` back a day, run the
  script. It reports the row, then deletes it under `--delete`.
