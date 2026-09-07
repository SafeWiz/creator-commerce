# Draft Preview on Own Storefront Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a seller — and only that seller — see their draft products on their own storefront grid and at each draft's real product URL, clearly marked as drafts.

**Architecture:** The two storefront DAL reads take a required `{ includeDrafts: boolean }` option instead of hard-coding `status = 'published'`. Each page resolves the session with `getUser()`, compares the viewer to the storefront's owner, and passes the result. The UI marks drafts with a badge and swaps the cart control for an edit link.

**Tech Stack:** Next.js 16 (App Router, React Server Components), React 19, Drizzle ORM on Postgres, Better Auth, Tailwind v4, Base UI components under `components/ui/`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-07-storefront-draft-preview-design.md`. Read it before starting.
- **Read the Next.js docs before writing page code.** This repo pins Next 16, whose APIs differ from older releases: `node_modules/next/dist/docs/`. `params` is a Promise; `PageProps<"/route">` and `LayoutProps<"/route">` are globals.
- **The repo has no test framework.** There is no `npm test`. Verification is `npx tsc --noEmit`, `npm run lint`, and the manual browser passes written into each task.
- **You may run `npx tsc --noEmit` and `npm run lint`, and nothing else.** Both are read-only and are the type/lint gate for every task. `npm run build` does not work in this sandbox (it fetches Google Fonts, which is blocked) — never run it. `npm install`, `npm run dev` and every drizzle script belong to Gabi: stop, ask, and wait for his output.
- **Browser checks belong to Gabi.** Where a task lists a manual pass, report the steps in your task report rather than attempting them.
- **DAL modules never read request state.** No `headers()`, no cookies, no `redirect()` inside `lib/server/dal/*`. Ownership is a parameter the caller passes in. Session resolution lives in `lib/server/session.ts`.
- Every module under `lib/server/` starts with `import 'server-only'` — the files touched here already do; don't remove it.
- Documentation and code comments in English only.
- No database schema change in this plan. Do not touch `lib/server/db/schemas/` or `drizzle/`.
- Copy strings are exact as written in each step — they were chosen in the spec.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `lib/server/dal/products.ts` | Modify (~lines 325–401) | Rename the two storefront reads, add the `includeDrafts` option, select `status`. |
| `app/(public)/[handle]/page.tsx` | Modify | Resolve the viewer, decide `includeDrafts`, render draft badges and the owner subtitle. |
| `app/(public)/[handle]/[id]/[slug]/page.tsx` | Modify | Same viewer decision for the detail read; draft badge, edit button, `robots: { index: false }`. |
| `components/product-card.tsx` | Modify | Optional `draft` prop: cover badge plus an edit link in place of the cart control. |

Task 1 keeps the build green by updating both call sites with `includeDrafts: false` — behavior identical to today. Tasks 2–4 then turn the feature on one surface at a time.

---

### Task 1: DAL — `includeDrafts` option on the storefront reads

**Files:**
- Modify: `lib/server/dal/products.ts:325-401`
- Modify: `app/(public)/[handle]/page.tsx:5,34` (call site only)
- Modify: `app/(public)/[handle]/[id]/[slug]/page.tsx:14,33` (call site only)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `type StorefrontProduct = { id: number; slug: string; name: string; description: string | null; priceInCents: number; images: string[]; status: ProductStatus }`
  - `type StorefrontProductDetail = { id: number; name: string; description: string | null; priceInCents: number; images: string[]; status: ProductStatus }`
  - `getStorefrontProducts(ownerId: string, options: { includeDrafts: boolean }): Promise<StorefrontProduct[]>`
  - `getStorefrontProduct(id: number, ownerId: string, options: { includeDrafts: boolean }): Promise<StorefrontProductDetail | null>`
  - `ProductStatus` is already exported from `@/lib/server/db/schemas/product` and already imported at the top of the DAL module.

- [ ] **Step 1: Replace `StorefrontProduct` and `getPublishedProducts`**

In `lib/server/dal/products.ts`, replace the block from the `// Only what the storefront grid's ProductCard renders` comment through the end of `getPublishedProducts` with:

```ts
// Only what the storefront grid's ProductCard renders (see ProductCardProduct
// in components/product-card.tsx, which this type must stay assignable to).
// fileKey, fileName and fileSizeBytes describe the product's file, which is
// private, and which has no business reaching an unauthenticated storefront
// page just because the row happens to be selected in full.
export type StorefrontProduct = {
  id: number
  slug: string
  name: string
  description: string | null
  priceInCents: number
  images: string[]
  // Selected so the owner's own view can mark drafts. A visitor only ever sees
  // 'published' here, because that is the only status their read returns.
  status: ProductStatus
}

/**
 * Storefront grid read: a seller's catalogue, scoped to that seller.
 *
 * `includeDrafts` is required rather than optional, so a call site that forgets
 * it fails to compile instead of quietly leaking. It belongs to the caller
 * because the caller is the one that resolves the session — this module never
 * reads request state. Only the storefront page passes true, and only when the
 * viewer is the owner.
 *
 * The tombstone filter sits outside that conditional: a soft-deleted product is
 * not a draft, and nothing makes it previewable.
 */
export async function getStorefrontProducts(
  ownerId: string,
  { includeDrafts }: { includeDrafts: boolean },
): Promise<StorefrontProduct[]> {
  return db
    .select({
      id: productsTable.id,
      slug: productsTable.slug,
      name: productsTable.name,
      description: productsTable.description,
      priceInCents: productsTable.priceInCents,
      images: productsTable.images,
      status: productsTable.status,
    })
    .from(productsTable)
    .where(
      and(
        eq(productsTable.ownerId, ownerId),
        // `and()` drops undefined entries, so no filter needs no special case.
        includeDrafts ? undefined : eq(productsTable.status, 'published'),
        isNull(productsTable.deletedAt),
      ),
    )
}
```

- [ ] **Step 2: Replace `StorefrontProductDetail` and `getPublishedProduct`**

In the same file, replace the block from the `// Only what the single product page renders` comment through the end of `getPublishedProduct` with:

```ts
// Only what the single product page renders. No slug: that page links back to
// the storefront by handle alone and never needs its own. Same reasoning as
// StorefrontProduct above for leaving the file columns out — a public product
// page is exactly the page a stolen fileKey would be most useful on.
export type StorefrontProductDetail = {
  id: number
  name: string
  description: string | null
  priceInCents: number
  images: string[]
  status: ProductStatus
}

// Product page read. Takes the ownerId resolved from the URL's handle so a
// product can only be reached under the seller that actually owns it, and
// `includeDrafts` for the same reason getStorefrontProducts does — the page
// passes true only when the viewer is that seller, so a draft's URL stays a 404
// for everyone else and guessing the id does not help.
export async function getStorefrontProduct(
  id: number,
  ownerId: string,
  { includeDrafts }: { includeDrafts: boolean },
): Promise<StorefrontProductDetail | null> {
  const [product] = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      description: productsTable.description,
      priceInCents: productsTable.priceInCents,
      images: productsTable.images,
      status: productsTable.status,
    })
    .from(productsTable)
    .where(
      and(
        eq(productsTable.id, id),
        eq(productsTable.ownerId, ownerId),
        includeDrafts ? undefined : eq(productsTable.status, 'published'),
        isNull(productsTable.deletedAt),
      ),
    )
    .limit(1)

  return product ?? null
}
```

- [ ] **Step 3: Update the grid call site so the build stays green**

In `app/(public)/[handle]/page.tsx`, change the import on line 5 and the call on line 34:

```tsx
import { getStorefrontProducts } from "@/lib/server/dal/products"
```

```tsx
  const products = await getStorefrontProducts(user.id, { includeDrafts: false })
```

- [ ] **Step 4: Update the detail call site so the build stays green**

In `app/(public)/[handle]/[id]/[slug]/page.tsx`, change the import on line 14 and the call inside `findProduct`:

```tsx
import { getStorefrontProduct } from "@/lib/server/dal/products"
```

```tsx
  const product = await getStorefrontProduct(id, user.id, {
    includeDrafts: false,
  })
```

- [ ] **Step 5: Confirm no stale references remain**

Run:

```bash
grep -rn "getPublishedProduct" app components lib
```

Expected: no output. `searchPublishedProducts` is a different name and does not match this pattern — it stays exactly as it is.

- [ ] **Step 6: Typecheck and lint**

Run:

```bash
npx tsc --noEmit && npm run lint
```

Expected: both clean, no output beyond lint's summary.

Behavior is unchanged at this point: both call sites pass `false`, so drafts stay invisible everywhere.

- [ ] **Step 7: Commit**

```bash
git add lib/server/dal/products.ts "app/(public)/[handle]/page.tsx" "app/(public)/[handle]/[id]/[slug]/page.tsx"
git commit -m "refactor: storefront reads take an explicit includeDrafts flag"
```

---

### Task 2: ProductCard — optional `draft` prop

**Files:**
- Modify: `components/product-card.tsx:58-115`

**Interfaces:**
- Consumes: nothing from Task 1 — the prop is a plain boolean, not the DAL type.
- Produces: `ProductCard` accepts `draft?: boolean`. `ProductCardProduct` is unchanged.

Why a prop and not a wider `ProductCardProduct`: that type is deliberately narrow so screens without live data can use it, and `app/(master)/explore/page.tsx:105` renders the same card from `ExploreProduct`, which has no `status`. An optional prop mirrors `inCart`, which is optional for the same reason. Leaving it unset must keep today's rendering exactly.

- [ ] **Step 1: Import the badge**

Add to the imports at the top of `components/product-card.tsx`:

```tsx
import { Badge } from "@/components/ui/badge"
```

`Link`, `AddToCartButton`, `Image`, `ProductImagePlaceholder`, `formatPrice` and `cn` are already imported; leave them.

- [ ] **Step 2: Add the prop to the signature**

Replace the `ProductCard` parameter list and its type (currently `components/product-card.tsx:58-72`) with:

```tsx
export function ProductCard({
  product,
  handle,
  preload,
  inCart,
  draft,
}: {
  product: ProductCardProduct
  // Seller handle without the leading "@"; the link adds it back.
  handle: string
  // Set by the grid on its first card only — see `Image`'s `preload`.
  preload?: boolean
  // Undefined means the caller has no cart context (a placeholder screen), and
  // the card renders without a cart button at all.
  inCart?: boolean
  // Only the owner's view of their own storefront sets this. A draft has no
  // cart path — getCartProducts filters to published, so the id would be
  // silently dropped — so the card offers the edit page instead.
  draft?: boolean
}) {
```

- [ ] **Step 3: Badge the cover**

Replace the `<ProductCover .../>` element in the returned JSX with a wrapper that can position the badge over it:

```tsx
      <div className="relative">
        <ProductCover
          images={product.images}
          alt={product.name}
          preload={preload}
        />
        {draft && (
          <Badge
            variant="secondary"
            className="absolute top-2.5 left-2.5 shadow-sm"
          >
            <span className="size-1.5 rounded-full bg-muted-foreground" />
            Draft
          </Badge>
        )}
      </div>
```

The dot-plus-label shape matches the status badge on `app/(master)/products/page.tsx:112-117`, so the two screens agree on what a draft looks like.

- [ ] **Step 4: Swap the cart control for an edit link on drafts**

Replace the action row — the `<div className="mt-1 flex items-center justify-between gap-2">` block and its contents — with:

```tsx
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="font-mono text-base font-medium">
            {formatPrice(product.priceInCents)}
          </span>
          {draft ? (
            // Sibling of the stretched anchor, lifted above it the same way the
            // cart button is, so the two links never nest.
            <Link
              href={`/products/${product.id}`}
              className="relative z-10 text-[13px] font-medium underline underline-offset-4 hover:text-muted-foreground"
            >
              Edit
            </Link>
          ) : (
            inCart !== undefined && (
              <AddToCartButton
                productId={product.id}
                productName={product.name}
                inCart={inCart}
                size="icon-sm"
                className="relative z-10"
              />
            )
          )}
        </div>
```

- [ ] **Step 5: Typecheck and lint**

Run:

```bash
npx tsc --noEmit && npm run lint
```

Expected: both clean. No caller passes `draft` yet, so `/@handle`, `/explore` and `/cart` still render exactly as before — note that in your report as a browser check for Gabi.

- [ ] **Step 6: Commit**

```bash
git add components/product-card.tsx
git commit -m "feat: draft marker and edit link on product card"
```

---

### Task 3: Storefront grid shows the owner's drafts

**Files:**
- Modify: `app/(public)/[handle]/page.tsx`

**Interfaces:**
- Consumes: `getStorefrontProducts(ownerId, { includeDrafts })` and `StorefrontProduct.status` from Task 1; `ProductCard`'s `draft` prop from Task 2.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Import the session helper**

Add to the imports:

```tsx
import { getUser } from "@/lib/server/session"
```

`getUser()` returns the current user or null and never redirects — the storefront is a public page, so a signed-out visitor must keep rendering. Do not use `requireUser()` here. It is `cache()`-wrapped, so this costs no extra session round-trip in a render that already resolves the user elsewhere.

- [ ] **Step 2: Resolve the viewer and pass the flag**

Replace the body of `StorefrontPage` between the `notFound()` guard and the `return` with:

```tsx
  // getUser rather than requireUser: this page is public, and a signed-out
  // visitor must still get the published grid.
  const viewer = await getUser()
  const isOwner = viewer?.id === user.id

  const products = await getStorefrontProducts(user.id, {
    includeDrafts: isOwner,
  })
  const inCart = await readCartMembership()

  const draftCount = products.filter(
    (product) => product.status === "draft",
  ).length
```

- [ ] **Step 3: Add the owner subtitle**

Replace the heading block (`<div className="mb-6">…</div>`) with:

```tsx
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-medium tracking-[-0.02em]">
          Digital products by {user.name}
        </h1>
        <p className="mt-1.5 max-w-[60ch] text-[15px] text-muted-foreground">
          Instant download after checkout.
          {draftCount > 0 &&
            ` · ${draftCount} ${draftCount === 1 ? "draft" : "drafts"}, only visible to you.`}
        </p>
      </div>
```

`draftCount` can only be non-zero when `isOwner` is true, because a visitor's read returns published rows only — no second condition needed.

- [ ] **Step 4: Split the empty state and pass `draft` to the card**

Replace the products block (the `{products.length === 0 ? … : …}` expression) with:

```tsx
      {products.length === 0 ? (
        isOwner ? (
          <p className="text-[15px] text-muted-foreground">
            No products yet.{" "}
            <Link href="/products/new" className="text-foreground underline">
              Create your first one
            </Link>
            .
          </p>
        ) : (
          <p className="text-[15px] text-muted-foreground">
            Nothing published yet — check back soon.
          </p>
        )
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              handle={user.handle}
              inCart={inCart(product.id)}
              draft={product.status === "draft"}
              // The grid starts at the top of the page, so the first cover is
              // the LCP candidate.
              preload={index === 0}
            />
          ))}
        </div>
      )}
```

- [ ] **Step 5: Add the `Link` import**

The empty state now links to the editor. Add to the imports:

```tsx
import Link from "next/link"
```

- [ ] **Step 6: Typecheck, lint, and write down the browser pass**

Run:

```bash
npx tsc --noEmit && npm run lint
```

Expected: both clean. Then record these steps in your report for Gabi to run — do not attempt them yourself:

1. Signed in as a seller with at least one draft, open `/@<his-handle>`: drafts appear in the grid with a `Draft` badge and an `Edit` link; the subtitle reads `Instant download after checkout. · N drafts, only visible to you.`
2. The `Edit` link opens `/products/<id>`.
3. Sign out (or use another account) and reload `/@<his-handle>`: no drafts, no subtitle clause, cart buttons as before.

- [ ] **Step 7: Commit**

```bash
git add "app/(public)/[handle]/page.tsx"
git commit -m "feat: show own drafts on storefront grid"
```

---

### Task 4: Product page previews the owner's draft

**Files:**
- Modify: `app/(public)/[handle]/[id]/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getStorefrontProduct(id, ownerId, { includeDrafts })` and `StorefrontProductDetail.status` from Task 1.
- Produces: nothing.

- [ ] **Step 1: Import what the draft branch needs**

Add to the imports:

```tsx
import { getUser } from "@/lib/server/session"
import { Badge } from "@/components/ui/badge"
```

`Link`, `Button`, `AddToCartButton`, `ProductGallery`, `Separator` and the lucide icons are already imported.

- [ ] **Step 2: Decide the flag inside `findProduct`**

Replace the `findProduct` definition with:

```tsx
// Resolves the seller from the handle, then the product from that seller, so a
// product is only reachable under the storefront that actually owns it.
// cache()d because generateMetadata and the page both need it in one pass.
//
// A draft resolves only for its own seller. Everyone else gets null and the
// page 404s, so a guessed id buys nothing without that seller's session.
const findProduct = cache(async (handleSegment: string, idSegment: string) => {
  const id = Number(idSegment)
  if (!Number.isInteger(id)) return null

  const user = await getUserByHandle(parseHandleSegment(handleSegment))
  if (!user) return null

  // getUser, not requireUser: the page is public and a signed-out visitor must
  // still get the published product rather than a redirect to /login.
  const viewer = await getUser()
  const product = await getStorefrontProduct(id, user.id, {
    includeDrafts: viewer?.id === user.id,
  })
  return product ? { user, product } : null
})
```

- [ ] **Step 3: Keep a draft out of the index**

Replace the `return` inside `generateMetadata` with:

```tsx
  return {
    title: found.product.name,
    description: found.product.description ?? undefined,
    // A draft is already unreachable without its owner's session, so no crawler
    // can see this page. This is the belt to that pair of braces.
    robots: found.product.status === "draft" ? { index: false } : undefined,
  }
```

- [ ] **Step 4: Derive the draft flag in the page**

In `ProductPage`, replace the three lines after the `notFound()` guard with:

```tsx
  const { user, product } = found
  const isDraft = product.status === "draft"
  const price = formatPrice(product.priceInCents)
  const inCart = (await readCartMembership())(product.id)
```

`readCartMembership()` still runs for a draft. It reads a cookie the request already carries and costs nothing; branching around it would only add a second code path.

- [ ] **Step 5: Badge the title**

Replace the title block:

```tsx
          <div>
            <div className="flex items-start gap-2.5">
              <h1 className="font-heading text-[28px] leading-tight font-medium tracking-[-0.02em]">
                {product.name}
              </h1>
              {isDraft && (
                <Badge variant="secondary" className="mt-1.5 shrink-0">
                  <span className="size-1.5 rounded-full bg-muted-foreground" />
                  Draft
                </Badge>
              )}
            </div>
            {isDraft && (
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                Only visible to you.
              </p>
            )}
            <p className="mt-2.5 font-mono text-2xl font-medium">{price}</p>
          </div>
```

- [ ] **Step 6: Swap the action row on a draft**

Replace the `<div className="flex gap-2.5">` block — the one holding `AddToCartButton` and the `Heart` button — plus the `{inCart && …}` "View cart" block that follows it, with:

```tsx
          {isDraft ? (
            <Button
              size="lg"
              nativeButton={false}
              render={<Link href={`/products/${product.id}`} />}
            >
              Edit product
            </Button>
          ) : (
            <>
              <div className="flex gap-2.5">
                <AddToCartButton
                  productId={product.id}
                  productName={product.name}
                  inCart={inCart}
                  size="lg"
                  className="flex-1"
                  label={inCart ? "In cart" : `Add to cart — ${price}`}
                />
                <Button size="lg" variant="outline">
                  <Heart />
                </Button>
              </div>
              {inCart && (
                <Button
                  variant="link"
                  size="sm"
                  className="self-start px-0"
                  nativeButton={false}
                  render={<Link href="/cart" />}
                >
                  View cart
                </Button>
              )}
            </>
          )}
```

Everything below — the Stripe reassurance line, the separator, the "What's inside" list — is left in place for a draft, because the point of the preview is to see the buyer's page.

- [ ] **Step 7: Typecheck, lint, and write down the browser pass**

Run:

```bash
npx tsc --noEmit && npm run lint
```

Expected: both clean. Then record these steps in your report for Gabi to run — do not attempt them yourself:

1. Signed in as the seller, click a draft's `Edit`-badged card through to `/@<handle>/<id>/<slug>` — reachable, `Draft` badge beside the title, `Only visible to you.`, and an `Edit product` button where add-to-cart normally sits.
2. View source or devtools on that draft page: `<meta name="robots" content="noindex">` is present. A published product page has no such tag.
3. Signed out, and signed in as a different account: the same draft URL returns the 404 page.
4. A published product page is unchanged — add-to-cart, heart, "View cart" after adding.
5. `/explore` and `/cart` show no drafts.

Gabi runs these; they are not yours to attempt.

- [ ] **Step 8: Commit**

```bash
git add "app/(public)/[handle]/[id]/[slug]/page.tsx"
git commit -m "feat: preview own draft at its product url"
```

---

## Done when

- A seller sees their drafts on `/@handle`, badged, with an edit link, and a subtitle counting them.
- A seller can open a draft's real product URL and see the buyer's page, badged, with an edit button.
- Nobody else sees a draft in the grid, at its URL, on `/explore`, or in a cart.
- `npx tsc --noEmit` and `npm run lint` are clean, and Gabi's browser pass and `npm run build` confirm it.
