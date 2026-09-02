# Signed URL downloads and a live `/downloads`

Date: 2026-09-02

## Problem

A buyer who pays for a product has no way to get the file. `productsTable`
already carries `fileKey`, `fileName` and `fileSizeBytes`, and the comment on
`fileKey` anticipates this work — the key is stored rather than a `ufsUrl`
precisely so downloads can be signed URLs minted from it.

Two things block that today:

1. The `productFile` upload route sets no ACL, so files land at the app default
   of `public-read`. Anyone holding the bare `ufsUrl` gets the bytes, and signing
   a public URL is decoration.
2. `/downloads` renders `lib/mock-data.ts`.

## Scope

- Product files become private at upload, and are served through short-lived
  signed URLs.
- `/downloads` becomes real, driven by the buyer's paid purchases.
- Sellers can download their own product file from `/products/[id]`.

Out of scope: refunds (nothing can set `status = 'refunded'` yet), receipts,
pending-row cleanup, and a backfill of already-uploaded files.

## Decisions

**Entitlement is `status = 'paid'` only.** This matches
`getPurchasedProductIds` and the `purchases_buyerId_productId_unq` predicate
exactly, so what the cart calls "owned" and what `/downloads` serves cannot
disagree. A refund revokes access.

**Existing files stay `public-read`.** They are throwaway dev data. ACL is a
per-upload setting, so no code change can retroactively cover them — only a
`utapi.updateACL` backfill could, and it is not worth running against data that
is about to be wiped.

**Fileless products are not a real case.** Every product created since the
column exists carries a file. The DAL filters them out rather than the UI
rendering a broken row.

**No `NOT NULL` migration yet.** The product database will be wiped when this
lands; the migration happens then. Until it does, the DAL narrows the type at
its boundary (see below).

## Architecture

Four pieces, each with one job:

| Unit | Responsibility |
| --- | --- |
| `lib/server/uploadthing.ts` | Owns the UploadThing seam: upload config, and minting a signed URL from a key. |
| `lib/server/dal/downloads.ts` | Answers "may this user have this file" and "what can this buyer download". Pure data. |
| `app/(master)/downloads/[productId]/route.ts` | Resolves the session, asks the DAL, redirects to a freshly signed URL. |
| `app/(master)/downloads/page.tsx` | Renders the buyer's list. Links to the route; never sees a signed URL. |

### Data flow

```
click <a href="/downloads/42">
  → GET route handler
  → getUser()                       (session, in the route — not the DAL)
  → getDownloadableProductFile(42, userId)   (entitlement + fileKey, one query)
  → signProductFileUrl(fileKey)     (local HMAC, no network)
  → 302 to https://<app>.ufs.sh/f/<key>?...signature, Cache-Control: no-store
  → browser follows, UploadThing validates the signature, bytes stream
```

The signed URL exists only inside the redirect response. It never enters the
HTML, the RSC payload, or client JavaScript.

### Why redirect rather than embed or fetch

Considered three shapes:

- **Redirect from a route handler (chosen).** The credential's lifetime is
  bounded by how long the browser takes to follow a 302, not by how long a tab
  stays open. Works with JavaScript off. One extra hop.
- **Server action returning the URL, client navigates.** Buys inline pending and
  error state, but needs a client component per row, puts a live credential in
  JS reach, and loses the plain-link fallback — for a UX gain the browser's own
  download indicator already provides.
- **Mint at render, embed hrefs in the page.** Simplest, and the reason it was
  rejected: expiry then has to survive a page left open, so a long-lived
  credential sits in a document that can be cached, copied or screenshotted. It
  also mints N URLs per visit for a user who clicks zero or one.

### Why the route is keyed on `productId`

Entitlement reads "a paid purchase of this product, **or** you own it" — one DAL
function and one route serving both the buyer and the seller. A `purchaseId`
route would need a second route for sellers, who have no purchase row.

## Components

### 1. `lib/server/uploadthing.ts` — private uploads

```ts
productFile: f({
  blob: {
    maxFileSize: '128MB',
    maxFileCount: 1,
    acl: 'private',
    contentDisposition: 'attachment',
  },
})
```

`acl: 'private'` is the security change; everything else is plumbing around it.
`contentDisposition: 'attachment'` stops a PDF or a txt rendering in a tab
instead of downloading — a cross-origin `<a download>` attribute is ignored, so
this header is the only thing that works.

`productImage` stays `public-read`: `next/image` fetches those unauthenticated.

Both settings are baked in at presign, so they bind new uploads only.

**Prerequisite:** ACL and expiry overrides must be enabled for the app in the
UploadThing dashboard. Without the ACL override the route throws at presign,
which is a loud and immediate failure rather than a silent public upload.

### 2. `lib/server/uploadthing.ts` — signing

```ts
const DOWNLOAD_URL_TTL = '5m'

export async function signProductFileUrl(key: string) {
  const { ufsUrl } = await utapi.generateSignedURL(key, {
    expiresIn: DOWNLOAD_URL_TTL,
  })
  return ufsUrl
}
```

`generateSignedURL`, not `getSignedURL`: it signs locally with no API round-trip,
and the latter is deprecated in v8 and removed in v9.

Five minutes rather than one: the credential never enters the page, so its
lifetime is only exposed to someone who already had it. Files go to 100MB
(`MAX_PRODUCT_FILE_BYTES`), and a transfer that drops at 80% and is retried by
the browser should succeed rather than 403. If the dashboard rejects the
override the app default applies — still bounded, still private, so it degrades
safely.

### 3. `lib/server/dal/downloads.ts`

A third module rather than growing `purchases.ts`, which is already ~280 lines
and would be the wrong home for a query rooted in `products`.

```
getDownloadableProductFile(productId, userId) → { fileKey } | null
```

(Narrowed from `{ fileKey, fileName }` during planning: `fileName` has no
consumer. UploadThing stores the original filename and `contentDisposition:
'attachment'` makes the browser use it, so the route never needs one.)

Selects from `products` where `id = productId`, `file_key is not null`, and
either `owner_id = userId` or a paid purchase exists for that buyer and product.

Deliberately does **not** filter `deletedAt`. A seller retiring a product must
not revoke files buyers already paid for — the same reasoning that keeps
`getBuyerPurchases` from filtering it.

Returns one `null` for "no such product", "not yours" and "no file" alike.
Distinguishing them would tell a prober which product ids exist and who owns
them.

```
getBuyerDownloads(buyerId) → BuyerDownload[]
```

`purchases` inner-joined to `products`, `status = 'paid'`, `fileKey is not
null`, ordered `createdAt desc, id desc` — matching
`purchases_buyerId_createdAt_idx` read backwards, the same pattern
`getBuyerPurchases` uses.

The product **name comes off the purchase snapshot**; the file name and size come
off the product row. What was bought versus what is being fetched.

**The nullability seam.** The `where` clause proves `fileKey`, `fileName` and
`fileSizeBytes` are present, but Drizzle's inferred type cannot know that, so the
select casts them with `sql<string>` / `sql<number>` and a comment pointing at
the predicate that guarantees it. This cast is precisely what the `NOT NULL`
migration deletes; it is recorded in TODO.md so it does not survive as an
unexplained hack.

### 4. `app/(master)/downloads/[productId]/route.ts`

```ts
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<'/downloads/[productId]'>,
) {
  const { productId: raw } = await ctx.params
  const productId = Number(raw)
  if (!Number.isInteger(productId) || productId <= 0) {
    redirect('/downloads')
  }

  const user = await getUser()
  if (!user) redirect(authPathWithNext('/login', '/downloads'))

  const file = await getDownloadableProductFile(productId, user.id)
  if (!file) redirect('/downloads')

  return NextResponse.redirect(await signProductFileUrl(file.fileKey), {
    status: 302,
    headers: { 'Cache-Control': 'no-store' },
  })
}
```

- `RouteContext<'/downloads/[productId]'>` is the Next 16 typed-params helper,
  globally available and generated by `next dev`, `next build` or `next typegen`.
  If it does not resolve in this project's configuration, the fallback is the
  explicit `{ params: Promise<{ productId: string }> }` — same runtime shape.
- **Revised during implementation:** the failure paths `redirect('/downloads')`
  rather than returning `new Response(null, { status: 404 })`. This route is only
  ever reached by a top-level `<a>` navigation, so a bodyless 404 renders a blank
  document at a url with no page behind it and the Back button is the only way
  out. One redirect target for every failure — bad input included — preserves the
  indistinguishability the uniform 404 was there for. `notFound()` remains wrong
  either way: it is specified in terms of rendering a `not-found` segment.
- `getUser()` plus `redirect(authPathWithNext(...))` rather than `requireUser()`,
  so an expired session returns to `/downloads` after logging in instead of the
  default post-auth path.
- `Cache-Control: no-store` is belt-and-braces. A 302 is not cacheable by default,
  but nothing about this response should ever be stored.
- The handler sits inside `(master)` beside the page. Route groups add no URL
  segment and layouts do not apply to route handlers, so this is colocation only.

### 5. `app/(master)/downloads/page.tsx`

Server component, `requireUser()` then `getBuyerDownloads(user.id)`. The table
keeps its current columns:

| Column | Source |
| --- | --- |
| Product | purchase snapshot `productName` |
| Type | uppercased extension of `fileName` |
| Size | `formatFileSize(fileSizeBytes)` |
| Purchased | purchase `createdAt`, via the `DATE_FORMAT` pattern from `/purchases` |
| — | `<a href="/downloads/{productId}">` |

The extension-to-label derivation goes in a new `lib/file-type.ts`: string work,
environment-agnostic, no icons. The label-to-icon map stays in the page where
`TYPE_ICONS` already lives, extended with a `File` fallback so an unrecognised
type renders rather than crashing on an undefined component.

The button renders a plain `<a>`, **not** `next/link`. A `Link` would attempt a
client navigation and RSC-fetch a route handler.

Empty state mirrors `/purchases`: "No downloads yet." with a link to `/explore`.

`downloads` and `DownloadType` are removed from `lib/mock-data.ts`.

### 6. `components/product-file.tsx` — seller access

`ProductFileSummary` gains the same `<a href="/downloads/{productId}">` on its
file row, which means it now needs the product id as a prop. No new server code:
the `owner_id = userId` branch of `getDownloadableProductFile` already covers it,
including for soft-deleted products.

## Error handling

| Case | Response |
| --- | --- |
| Non-numeric or non-positive `productId` | Redirect to `/downloads`, no query run |
| Signed out | 302 to `/login?next=%2Fdownloads` |
| Product missing, not owned, not purchased, or fileless | Redirect to `/downloads` |
| Signature expired, replayed after TTL | 403 from UploadThing |
| `generateSignedURL` throws | Unhandled — a 500 is correct; there is no partial success to degrade to |

The `/downloads` page itself cannot show a broken row: rows exist only where the
DAL found a file, and the route re-checks entitlement on every click rather than
trusting that the page rendered the link.

## Verification

The repository has no test harness, so this is a manual checklist:

1. UploadThing dashboard: ACL and expiry overrides enabled.
2. Create a product with a file. Requesting the bare `ufsUrl` for that key → 403.
3. As the seller, download from `/products/[id]` → file arrives, as an
   attachment.
4. As a signed-in non-buyer, `GET /downloads/[id]` → redirect to `/downloads`, no file.
5. Buy it. The row appears on `/downloads` with the right type and size, and the
   button downloads.
6. Signed out, `GET /downloads/[id]` → `/login?next=%2Fdownloads`.
7. Copy the redirect target from devtools, wait past 5 minutes, retry → 403.
8. Soft-delete the product. The buyer's download still works.

## Follow-ups recorded in TODO.md

- Make `fileKey`, `fileName` and `fileSizeBytes` `NOT NULL` after the product
  database is wiped, and delete the `sql<string>` casts in
  `lib/server/dal/downloads.ts`.
- Product files uploaded before this change remain `public-read`; a
  `utapi.updateACL` backfill is the fix if any of them ever matter.

The existing "`/downloads` is still mock" bullet is removed.
