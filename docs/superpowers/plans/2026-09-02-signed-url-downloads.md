# Signed URL Downloads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make product files private in storage and serve them to entitled users through short-lived signed URLs, then replace the mock `/downloads` page with the buyer's real purchases.

**Architecture:** Product files upload with `acl: 'private'`, so the bare `ufsUrl` stops working. A GET route handler at `/downloads/[productId]` resolves the session, asks a new DAL module whether this user may have the file, mints a 5-minute signed URL locally, and 302s to it. The signed URL therefore exists only inside a redirect response — never in HTML, the RSC payload, or client JavaScript.

**Tech Stack:** Next.js 16.2.10 (App Router, route handlers, typed routes), React 19.2, Drizzle ORM 0.45 on neon-http Postgres, UploadThing 7.7, Base UI components, Tailwind 4.

Spec: `docs/superpowers/specs/2026-09-02-signed-url-downloads-design.md`

## Global Constraints

- **Read the Next docs before writing Next code.** `AGENTS.md`: this version has breaking changes. Relevant files live in `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`.
- **Documentation, comments and commit messages in English only** (`CLAUDE.md`).
- **`lib/server/**` modules start with `import 'server-only'`.** `lib/client/**` start with `import 'client-only'`. Everything directly under `lib/` is environment-agnostic.
- **DAL modules (`lib/server/dal/*`) are a pure data layer.** They never read `headers()`/cookies, never resolve the session, never `redirect()`. Ownership is enforced by taking an id parameter and scoping the query to it.
- **Session helpers live in `lib/server/session.ts`.** Callers resolve the user there and pass ids down.
- **No database schema changes in this plan.** No `drizzle-kit generate`, no `drizzle-kit migrate`. The `NOT NULL` migration is deliberately deferred until the user wipes the product database.
- **The user runs all npm scripts himself** — `npm run lint`, `npm run build`, and every manual browser check. Never run them; ask, and wait for the result before continuing.
- **Comment style:** this codebase explains *why*, not *what*, in full sentences. Match the density of the file you are editing. Do not add narration to self-evident lines.
- **Prerequisite, blocking Task 1:** ACL and expiry overrides must be enabled for the app in the UploadThing dashboard (https://docs.uploadthing.com/regions-and-acl#access-controls). Without the ACL override, uploads throw at presign.

## File Structure

| File | Status | Responsibility |
| --- | --- | --- |
| `lib/server/uploadthing.ts` | Modify | The one seam that knows UploadThing exists: upload route config, and minting a signed URL from a key. |
| `lib/server/dal/downloads.ts` | Create | Pure data. Answers "may this user have this product's file" and "what can this buyer download". |
| `app/(master)/downloads/[productId]/route.ts` | Create | Session + entitlement + redirect. No rendering, no queries of its own. |
| `lib/file-type.ts` | Create | Extension → display label. Environment-agnostic string work, no icons, no React. |
| `app/(master)/downloads/page.tsx` | Modify | Renders the buyer's list. Links to the route; never sees a signed URL. |
| `lib/mock-data.ts` | Modify | Loses the `downloads` block. |
| `components/product-file.tsx` | Modify | `ProductFileSummary` gains a download link for the seller. |
| `components/product-form.tsx` | Modify | Passes `productId` through to `ProductFileSummary`. |
| `TODO.md` | Modify | Records the deferred `NOT NULL` migration and the still-public legacy files; drops the "`/downloads` is mock" bullet. |

**Deliberate narrowing from the spec:** the spec sketches `getDownloadableProductFile` returning `{ fileKey, fileName }`. `fileName` has no consumer — UploadThing stores the original filename and `contentDisposition: 'attachment'` makes the browser use it, so the route never needs it. This plan returns `{ fileKey }` only. YAGNI.

**There is no test harness in this repository** — no test script, no vitest/jest/playwright dependency. Adding one is out of scope for this plan. Every task therefore ends with a lint/build gate plus a specific manual verification, both run by the user. Where a task has no user-observable behaviour yet, say so rather than inventing a check.

---

### Task 1: Private uploads and the signing helper

**Files:**
- Modify: `lib/server/uploadthing.ts:76` (the `productFile` route config)
- Modify: `lib/server/uploadthing.ts:130-173` (add the signing helper beside the delete helpers)
- Modify: `TODO.md`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `signProductFileUrl(key: string): Promise<string>` — returns an absolute `https://<appId>.ufs.sh/f/<key>?...` URL valid for 5 minutes. Signs whatever key it is given; the caller is responsible for having checked entitlement.

- [ ] **Step 1: Confirm the dashboard prerequisite with the user**

Ask: "Are ACL overrides and expiry overrides enabled for the app in the UploadThing dashboard? Without the ACL override, `acl: 'private'` throws at presign and no upload will start."

Do not proceed until confirmed. This is the one step that cannot be verified from code.

- [ ] **Step 2: Make `productFile` uploads private attachments**

In `lib/server/uploadthing.ts`, replace the route config on line 76:

```ts
  productFile: f({ blob: { maxFileSize: '128MB', maxFileCount: 1 } })
```

with:

```ts
  productFile: f({
    blob: {
      maxFileSize: '128MB',
      maxFileCount: 1,
      // Paid content, so it must not be fetchable by url alone. Downloads go
      // through /downloads/[productId], which checks entitlement and mints a
      // short-lived signed url per click.
      //
      // Needs ACL overrides enabled for the app; without them this throws at
      // presign. That is the right failure — quietly falling back to
      // public-read is the one outcome we cannot have.
      acl: 'private',
      // Defaults to 'inline', which renders a pdf or a txt in a tab rather than
      // downloading it. A cross-origin `<a download>` is ignored by browsers,
      // so this header is the only thing that makes the click a download.
      contentDisposition: 'attachment',
    },
  })
```

Leave the existing JSDoc block above it and the whole `.middleware()` / `.onUploadComplete()` chain untouched. `productImage` stays `public-read`: `next/image` fetches those unauthenticated.

- [ ] **Step 3: Add the signing helper**

In the same file, append after `deleteUploadedFileKeys` (currently ending at line 173):

```ts
/**
 * A short-lived url for a private product file.
 *
 * `generateSignedURL`, not `getSignedURL`: it signs locally with the app secret
 * instead of calling UploadThing, and the fetching variant is deprecated in v8
 * and removed in v9.
 *
 * Five minutes rather than seconds. The url never reaches the page — the
 * download route redirects to it and nothing else ever holds it — so its
 * lifetime is only exposed to whoever already had it, and a 100MB transfer that
 * drops and is retried by the browser should succeed rather than 403.
 *
 * This signs whatever key it is handed. Checking that the caller is allowed to
 * have it happens in the DAL, before this is reached.
 */
export async function signProductFileUrl(key: string) {
  const { ufsUrl } = await utapi.generateSignedURL(key, { expiresIn: '5m' })
  return ufsUrl
}
```

- [ ] **Step 4: Record the legacy-file gap in TODO.md**

Under the `## Product images` section's second bullet ("Some uploaded files still leak into UploadThing storage."), add a new bullet immediately after it:

```markdown
- **Product files uploaded before signed downloads are still `public-read`.**
  `acl` is a per-upload setting, so making `productFile` private only binds
  uploads from that point on. Every key already in storage stays fetchable by
  url alone. These are dev files and the product database is due a wipe, so
  nothing was backfilled; if any of them ever matter, the fix is a one-off
  `utapi.updateACL(keys, 'private')` over every non-null `products.file_key`.
```

- [ ] **Step 5: Ask the user to lint and build**

Ask the user to run:

```bash
npm run lint && npm run build
```

Expected: both pass. A TypeScript error on `acl` or `contentDisposition` means the property went on the wrong object — they belong inside the `blob: { ... }` config, not as a second argument to `f()`.

- [ ] **Step 6: Ask the user to verify the ACL took effect**

Ask the user to:
1. Run `npm run dev`, sign in, and create a product with a file at `/products/new`. Set its status to **published** — Task 4 needs to buy it.
2. Find the new key in the UploadThing dashboard and open `https://<appId>.ufs.sh/f/<key>` in a private window.

Expected: **403**, not the file. If the file downloads, the dashboard override is not enabled and Task 1 has not actually landed — stop and go back to Step 1.

Keep this product; Tasks 3–5 verify against it.

- [ ] **Step 7: Commit**

```bash
git add lib/server/uploadthing.ts TODO.md
git commit -m "feat: upload product files as private attachments

Product files are paid content, so a public ufsUrl is the wrong shape for
them. Downloads now need a signed url, which signProductFileUrl mints
locally with a five-minute lifetime.

Files uploaded before this stay public-read, noted in TODO.md."
```

---

### Task 2: Downloads DAL

**Files:**
- Create: `lib/server/dal/downloads.ts`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces:
  - `getDownloadableProductFile(productId: number, userId: string): Promise<{ fileKey: string } | null>`
  - `getBuyerDownloads(buyerId: string): Promise<BuyerDownload[]>`
  - `type BuyerDownload = { purchaseId: number; productId: number; productName: string; fileName: string; fileSizeBytes: number; purchasedAt: Date }`

- [ ] **Step 1: Create the module**

Create `lib/server/dal/downloads.ts`:

```ts
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
```

- [ ] **Step 2: Record the deferred migration in TODO.md**

In the `## Tech debt` section, add a bullet after the existing `productStatus` one:

```markdown
- **`products.file_key`, `file_name` and `file_size_bytes` should be `NOT NULL`.**
  Every product created since the columns exist carries all three; only rows
  predating them are null. `lib/server/dal/downloads.ts` therefore filters them
  out in its `where` and casts the columns with `sql<string>` / `sql<number>`,
  because drizzle infers nullability from the schema and cannot see the
  predicate. Making the columns `NOT NULL` deletes those casts and the three
  `isNotNull` filters. Deferred until the product database is wiped, since the
  migration fails loudly if any null row survives — which is the correct
  behaviour, just not something to hit mid-feature.
```

- [ ] **Step 3: Ask the user to lint and build**

Ask the user to run:

```bash
npm run lint && npm run build
```

Expected: both pass. Nothing imports this module yet, so there is no behaviour to check in the browser — say that rather than inventing one. If the build reports `exists` or `or` as unused or missing, they come from `drizzle-orm`; `purchases.ts` already imports the sibling `notExists` the same way.

- [ ] **Step 4: Commit**

```bash
git add lib/server/dal/downloads.ts TODO.md
git commit -m "feat: add downloads dal

Two queries that have to agree on what 'may download' means: the
entitlement check the download route runs, and the list /downloads
renders. Both are paid-only and neither filters soft-deleted products,
because a retired product must not revoke a paid file."
```

---

### Task 3: The download route handler

**Files:**
- Create: `app/(master)/downloads/[productId]/route.ts`

**Interfaces:**
- Consumes: `signProductFileUrl` from Task 1, `getDownloadableProductFile` from Task 2, plus the existing `getUser` (`lib/server/session.ts`) and `authPathWithNext` (`lib/schemas/auth.ts`, signature `authPathWithNext(path: '/login' | '/signup', next: string): string`).
- Produces: the URL `/downloads/{productId}`, which later tasks link to with a plain `<a href>`.

- [ ] **Step 1: Read the route handler docs**

Read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`, specifically the "Route Context Helper" section around line 105 and the redirect example around line 297. Two things this codebase's Next version changed: `context.params` is a Promise, and `GET` handlers default to dynamic. The repo already uses the sibling `PageProps<"/products/[id]">` helper in `app/(master)/products/[id]/page.tsx`, so the generated route types are available.

- [ ] **Step 2: Create the handler**

Create `app/(master)/downloads/[productId]/route.ts`:

```ts
import { redirect } from 'next/navigation'
import { NextResponse, type NextRequest } from 'next/server'

import { authPathWithNext } from '@/lib/schemas/auth'
import { getDownloadableProductFile } from '@/lib/server/dal/downloads'
import { getUser } from '@/lib/server/session'
import { signProductFileUrl } from '@/lib/server/uploadthing'

/**
 * A buyer's — or the seller's — download.
 *
 * A route handler that redirects, rather than a page or an action that hands
 * the url to the browser, because that is what bounds the credential's life.
 * The signed url exists only inside this 302: never in the html, never in the
 * rsc payload, never in client javascript. Five minutes is generous for
 * something the browser follows immediately, and nothing else ever holds it.
 *
 * Keyed on productId rather than a purchase id so one route serves both sides.
 * Entitlement is "bought it, or own it", and a seller has no purchase row.
 *
 * Nothing here trusts the page that rendered the link: the entitlement check
 * runs on every click.
 */
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<'/downloads/[productId]'>,
) {
  const { productId: raw } = await ctx.params
  const productId = Number(raw)
  if (!Number.isInteger(productId) || productId <= 0) {
    return new Response(null, { status: 404 })
  }

  // getUser(), not requireUser(): the default post-auth path is not where
  // someone who clicked a download belongs.
  const user = await getUser()
  if (!user) {
    redirect(authPathWithNext('/login', '/downloads'))
  }

  // One null for "no such product", "not yours" and "no file" alike, answered
  // with one status for the same reason — see the dal.
  const file = await getDownloadableProductFile(productId, user.id)
  if (!file) {
    return new Response(null, { status: 404 })
  }

  // new Response rather than notFound() above: notFound() is specified in terms
  // of rendering a not-found segment, which is the wrong shape for a handler
  // whose success case is a redirect.
  //
  // no-store is belt and braces. A 302 is not cacheable by default, but nothing
  // about a response carrying a credential should ever be stored.
  return NextResponse.redirect(await signProductFileUrl(file.fileKey), {
    status: 302,
    headers: { 'Cache-Control': 'no-store' },
  })
}
```

If `RouteContext` does not resolve, substitute the explicit equivalent — same runtime shape:

```ts
  ctx: { params: Promise<{ productId: string }> },
```

- [ ] **Step 3: Ask the user to lint and build**

Ask the user to run:

```bash
npm run lint && npm run build
```

Expected: both pass. Note that `RouteContext` types are generated by `next dev` / `next build`, so a first-run type error may clear on a second build; if it does not, use the explicit fallback from Step 2.

- [ ] **Step 4: Ask the user to verify the four responses**

With `npm run dev` running and signed in as the seller who created the Task 1 product:

| Request | Expected |
| --- | --- |
| `curl -si localhost:3000/downloads/abc` | `404` |
| `curl -si localhost:3000/downloads/0` | `404` |
| `curl -si localhost:3000/downloads/999999` | `404` |
| `curl -si localhost:3000/downloads/<real id>` (no cookie) | `307` or `302` to `/login?next=%2Fdownloads` |

Then, in the browser as the seller, visit `/downloads/<real id>` directly.

Expected: the file downloads. In devtools' network tab the first response is a 302 with `cache-control: no-store`, and its `location` is a `ufs.sh` URL carrying signature query parameters.

Finally, copy that `location` URL, wait five minutes, and open it.

Expected: **403**. This is the check that proves the expiry override is live — if it still downloads after five minutes, the dashboard is ignoring `expiresIn` and the app default applies instead. That is not a blocker (the URL is still bounded and still private) but tell the user which one they got.

- [ ] **Step 5: Commit**

```bash
git add "app/(master)/downloads/[productId]/route.ts"
git commit -m "feat: serve product files through a signed redirect

GET /downloads/[productId] checks entitlement, mints a five-minute
signed url and 302s to it, so the credential never reaches the page.
Keyed on the product rather than a purchase so the same route serves
the seller, who has no purchase row."
```

---

### Task 4: Live `/downloads` page

**Files:**
- Create: `lib/file-type.ts`
- Modify: `app/(master)/downloads/page.tsx` (full rewrite)
- Modify: `lib/mock-data.ts:1-10` (header comment) and `:33-46` (the `DownloadType` type and `downloads` export)
- Modify: `TODO.md` (remove the "`/downloads` is still mock" bullet)

**Interfaces:**
- Consumes: `getBuyerDownloads` and `BuyerDownload` from Task 2, the route URL from Task 3, and the existing `formatFileSize` (`lib/utils.ts`), `TableCard`, `Badge`, `Button`, table primitives.
- Produces: `fileTypeLabel(fileName: string): string` in `lib/file-type.ts` — used only by this page today.

- [ ] **Step 1: Create the file-type helper**

Create `lib/file-type.ts`:

```ts
/**
 * A short display label for a file, from its extension.
 *
 * Cosmetic only — nothing branches on the result, so a missing or unrecognised
 * extension is a fallback rather than an error. Capped at four characters so a
 * pathological name cannot stretch a table column.
 */
export function fileTypeLabel(fileName: string): string {
  const extension = fileName.split('.').pop()
  // No dot at all means `pop()` returned the whole name, which is not an
  // extension.
  if (!extension || extension === fileName) return 'FILE'
  return extension.slice(0, 4).toUpperCase()
}
```

No `server-only` or `client-only` marker: this is directly under `lib/`, which is environment-agnostic by convention.

- [ ] **Step 2: Rewrite the page**

Replace the entire contents of `app/(master)/downloads/page.tsx`:

```tsx
import type { Metadata } from "next"
import Link from "next/link"
import {
  AudioLines,
  Download,
  File,
  FileText,
  Image as ImageIcon,
  Package,
  Video,
  type LucideIcon,
} from "lucide-react"

import { fileTypeLabel } from "@/lib/file-type"
import { getBuyerDownloads } from "@/lib/server/dal/downloads"
import { requireUser } from "@/lib/server/session"
import { formatFileSize } from "@/lib/utils"
import { TableCard } from "@/components/table-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const metadata: Metadata = {
  title: "Downloads",
}

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

// Keyed by the labels fileTypeLabel produces. A creator sells whatever they
// like, so this cannot be exhaustive — anything unlisted falls back to a
// generic icon rather than rendering undefined.
const TYPE_ICONS: Record<string, LucideIcon> = {
  ZIP: Package,
  RAR: Package,
  "7Z": Package,
  TAR: Package,
  GZ: Package,
  PDF: FileText,
  DOC: FileText,
  DOCX: FileText,
  TXT: FileText,
  EPUB: FileText,
  MP3: AudioLines,
  WAV: AudioLines,
  FLAC: AudioLines,
  AIFF: AudioLines,
  MP4: Video,
  MOV: Video,
  WEBM: Video,
  PNG: ImageIcon,
  JPG: ImageIcon,
  JPEG: ImageIcon,
  SVG: ImageIcon,
  PSD: ImageIcon,
}

export default async function DownloadsPage() {
  const user = await requireUser()
  const downloads = await getBuyerDownloads(user.id)

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-4 p-6">
      <div>
        <h1 className="font-heading text-2xl font-medium tracking-[-0.02em]">Downloads</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything you&apos;ve bought, ready to re-download anytime.
        </p>
      </div>

      <TableCard>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Size</TableHead>
            <TableHead>Purchased</TableHead>
            <TableHead className="w-32" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {downloads.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="py-8 text-center text-muted-foreground"
              >
                No downloads yet.{" "}
                <Link href="/explore" className="text-foreground underline">
                  Find something to buy
                </Link>
                .
              </TableCell>
            </TableRow>
          ) : (
            downloads.map((item) => {
              const type = fileTypeLabel(item.fileName)
              const Icon = TYPE_ICONS[type] ?? File
              return (
                <TableRow key={item.purchaseId}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <Icon className="size-4" />
                      </span>
                      {/* The purchase's snapshotted name, not the product's
                          current one: this is what they bought. */}
                      <span className="max-w-[420px] truncate">
                        {item.productName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{type}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {formatFileSize(item.fileSizeBytes)}
                  </TableCell>
                  <TableCell className="text-[13px] text-muted-foreground">
                    {DATE_FORMAT.format(item.purchasedAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      {/* A plain <a>, not next/link: the href is a route
                          handler, and Link would try to client-navigate to it
                          and rsc-fetch a response that is not a page. */}
                      <Button
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={<a href={`/downloads/${item.productId}`} />}
                      >
                        <Download /> Download
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </TableCard>
    </div>
  )
}
```

- [ ] **Step 3: Remove the mock**

In `lib/mock-data.ts`, delete the `DownloadType` type and the `downloads` export (currently lines 33–46, from the `// Mirrors the digital asset kinds...` comment through the closing `]`).

Then update the header comment, replacing lines 1–10 with:

```ts
// Static placeholder data for the screens whose backend doesn't exist yet.
// Products, storefronts, purchases, sales and downloads now read from the
// database; what's left here backs the dashboard.
//
// The dashboard's KPIs could be derived from `purchases` except for Conversion,
// which has no data source anywhere.
//
// Each block goes away with the session that lands its feature.
```

- [ ] **Step 4: Drop the resolved TODO bullet**

In `TODO.md`, under `## Purchases`, delete the whole first bullet:

```markdown
- **`/downloads` is still mock, and can't be fixed by the purchases table.** Its
  `type` and `size` columns describe a digital asset file, and `productsTable`
  has no asset column at all — only `images`. It needs product file uploads
  first; after that it's a join from `purchases` like `/purchases` is.
```

- [ ] **Step 5: Ask the user to lint and build**

Ask the user to run:

```bash
npm run lint && npm run build
```

Expected: both pass. A "declared but never read" error in `lib/mock-data.ts` means `DownloadType` was left behind when `downloads` went.

- [ ] **Step 6: Ask the user to verify the page end to end**

With `npm run dev` running:
1. Sign in as a **new buyer** with no purchases and open `/downloads`. Expected: the empty state, with "Find something to buy" linking to `/explore`.
2. Buy the Task 1 product through checkout.
3. Return to `/downloads`. Expected: one row, with the product name, a type badge matching the file's extension, a plausible size, the purchase date, and a working Download button.
4. While still on that page, view source or check the RSC payload in devtools for `ufs.sh`. Expected: **no match** — the only URL in the document is `/downloads/<id>`.

- [ ] **Step 7: Commit**

```bash
git add lib/file-type.ts "app/(master)/downloads/page.tsx" lib/mock-data.ts TODO.md
git commit -m "feat: make /downloads real

Reads the buyer's paid purchases joined to the product's file. Each row
links to the download route rather than embedding a signed url, so
nothing in the document is a credential."
```

---

### Task 5: Seller download on the product page

**Files:**
- Modify: `components/product-file.tsx:180-215` (`ProductFileSummary`)
- Modify: `components/product-file.tsx:4` (icon import)
- Modify: `components/product-form.tsx:230-234` (the call site)

**Interfaces:**
- Consumes: the route URL from Task 3.
- Produces: `ProductFileSummary` now requires `productId: number` alongside its existing `name` and `sizeBytes` props.

- [ ] **Step 1: Add the download link to `ProductFileSummary`**

In `components/product-file.tsx`, extend the lucide import on line 4 with `Download`:

```tsx
import { Check, Download, FileUp, Loader2, Paperclip } from "lucide-react"
```

Then replace the `ProductFileSummary` function (lines 180–215) with:

```tsx
/**
 * The file on an existing product, shown but not editable.
 *
 * A product's file is chosen once, when the product is created. There is no
 * replacing it and no removing it — buyers hold a claim on what they paid for,
 * so the only way to withdraw a file is to delete the product it belongs to.
 *
 * The download is here because private uploads took the seller's only other
 * way to see what they are selling: there is no public url any more.
 */
export function ProductFileSummary({
  productId,
  name,
  sizeBytes,
}: {
  productId: number
  name: string
  sizeBytes: number
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Product file</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5 rounded-lg border border-border p-3">
          <Paperclip className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {name}
          </span>
          <span className="text-sm text-muted-foreground">
            {formatFileSize(sizeBytes)}
          </span>
          {/* The same route buyers use. Its entitlement check is "bought it, or
              own it", so the seller needs nothing of their own — and a plain
              <a> rather than next/link, because the href is a route handler. */}
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<a href={`/downloads/${productId}`} />}
          >
            <Download className="size-3.5" /> Download
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          The file is set when the product is created and can&apos;t be replaced.
        </p>
      </CardContent>
    </Card>
  )
}
```

`Button` and `formatFileSize` are already imported in this file.

- [ ] **Step 2: Pass `productId` at the call site**

In `components/product-form.tsx`, replace lines 230–234:

```tsx
      {isNew ? (
        <ProductFileField upload={upload} />
      ) : (
        file && <ProductFileSummary name={file.name} sizeBytes={file.sizeBytes} />
      )}
```

with:

```tsx
      {isNew ? (
        <ProductFileField upload={upload} />
      ) : (
        file &&
        productId != null && (
          <ProductFileSummary
            productId={productId}
            name={file.name}
            sizeBytes={file.sizeBytes}
          />
        )
      )}
```

The `productId != null` guard matches the one already on `ProductImages` below it. In practice the edit page always passes both, but the prop is optional on this component and the summary now needs it to build a url.

Leave the explanatory comment above this block untouched.

- [ ] **Step 3: Ask the user to lint and build**

Ask the user to run:

```bash
npm run lint && npm run build
```

Expected: both pass.

- [ ] **Step 4: Ask the user to verify seller access**

With `npm run dev` running, signed in as the seller who owns the Task 1 product:
1. Open `/products/<id>`. Expected: the Product file card now has a Download button beside the size.
2. Click it. Expected: the file downloads.
3. Delete the product (soft delete), then visit `/downloads/<id>` directly. Expected: the file still downloads — `getDownloadableProductFile` does not filter `deletedAt`.
4. Sign in as a **third** account — neither the seller nor the Task 4 buyer — and visit `/downloads/<id>`. Expected: 404.

- [ ] **Step 5: Commit**

```bash
git add components/product-file.tsx components/product-form.tsx
git commit -m "feat: let a seller download their own product file

Private uploads removed the seller's only way to see what they sell, and
the download route's entitlement check already covers the owner."
```

---

## Done

At this point:

- Product files upload private, as attachments, and their bare URLs 403.
- `/downloads/[productId]` is the only way to reach one, and it re-checks entitlement on every click.
- `/downloads` lists a buyer's paid purchases with real names, types, sizes and dates.
- A seller can download their own file, including for a soft-deleted product.
- `TODO.md` records the two things deliberately left: the `NOT NULL` migration awaiting the database wipe, and the pre-existing files still at `public-read`.
