# Draft products on the seller's own storefront

Date: 2026-09-07

## Problem

A seller has no way to see an unpublished product the way a buyer will. The two
storefront reads filter on `status = 'published'`:

- `getPublishedProducts(ownerId)` backs the grid at `/@handle`, so a draft is
  simply absent from it.
- `getPublishedProduct(id, ownerId)` backs `/@handle/{id}/{slug}`, so a draft's
  URL is a 404 for everyone, its owner included.

The only view of a draft is the row in the `/products` table — a name, a price
and a status badge. Everything the storefront actually decides — how the cover
crops, whether the description survives the two-line clamp, what the gallery
looks like — is invisible until the product is already public. Vetting means
publishing and hoping.

## Scope

- The owner of a storefront, and only the owner, sees their drafts in the
  `/@handle` grid, marked as drafts.
- A draft is reachable at its real product URL for its owner, rendering the same
  page a buyer would get, marked as a draft.
- Everyone else — signed out, or signed in as somebody else — sees exactly what
  they see today: no draft in the grid, 404 at the draft's URL.
- No draft reaches `/explore` or a cart. Those reads are unchanged.

Out of scope: a shareable preview link for a draft (an unguessable token that
would let a seller show an unpublished product to someone else); previewing
soft-deleted products; any change to how publishing works.

## Decisions

**A required `includeDrafts` flag on the storefront reads, not an inferred one.**
The alternative was passing `viewerId` into the DAL and letting it compare
against `ownerId` itself. That puts the visibility policy inside the data layer,
where a call site can no longer read what it is going to get back. The flag keeps
the policy at the page — which already resolves the session — and the DAL doing
what the rest of the module does: taking an `ownerId` and being told the scope.
Because the option object is required rather than optional, a call site that
forgets it fails to compile; the leak has to be written on purpose.

**One query per read, not a second owner-only function.** A separate
`getOwnStorefrontProducts` would make the flag impossible to flip by accident, at
the cost of two near-identical queries per read and a branch at every call site.
The conditional is one term in an existing `and()` — `and()` drops `undefined`
entries, so "no filter" needs no special case — and the tombstone filter stays
outside the conditional in both reads, where nothing can turn it off.

**A `draft` prop on `ProductCard`, not a wider product type.** `ProductCardProduct`
is deliberately narrow so screens without live data can use it (the wishlist
placeholder, `lib/mock-data.ts`). Adding `status` to it would force a value on
those. An optional boolean prop mirrors `inCart`, which is already optional for
the same reason.

**Drafts mixed into the grid, not a section above it.** The point is to see the
shelf as it will be. A drafts-first section answers "which are drafts" — the
badge already does that — while hiding the thing the seller came to check.

**No cart control on a draft, and no disabled one.** `getCartProducts` filters to
published, so a draft id in the cart cookie is silently dropped: a disabled
button would be honest, but an enabled-looking one would be a lie the cart then
corrects. A draft's action is `Edit`. The rest of the page is untouched, so the
preview stays faithful where it matters.

## Design

### DAL — `lib/server/dal/products.ts`

Both storefront reads are renamed, since neither is published-only any more:

```ts
getStorefrontProducts(ownerId: string, options: { includeDrafts: boolean })
getStorefrontProduct(id: number, ownerId: string, options: { includeDrafts: boolean })
```

The status term becomes conditional:

```ts
includeDrafts ? undefined : eq(productsTable.status, 'published')
```

`isNull(productsTable.deletedAt)` stays unconditional in both — a soft-deleted
product is not a draft and is never previewable.

Both selections gain `status`, and it is added to `StorefrontProduct` and
`StorefrontProductDetail`. That is what the UI marks drafts from.

`getStorefrontProducts` also gains an explicit `.orderBy(asc(createdAt), asc(id))`.
The owner's read and a visitor's read now have different WHERE clauses —
`includeDrafts` changes what the status term excludes — so without an explicit
order the two queries are free to come back in different orders, and the
owner's preview would stop matching the shelf a buyer sees. `id` breaks ties
`createdAt` leaves unordered. `getStorefrontProduct` returns a single row by
id, so it needs no such change.

`searchPublishedProducts` and `getCartProducts` are untouched: they carry their
own `status = 'published'` term, so explore and the cart cannot surface a draft
regardless of who is asking.

### Storefront grid — `app/(public)/[handle]/page.tsx`

```ts
const viewer = await getUser()
const isOwner = viewer?.id === user.id
const products = await getStorefrontProducts(user.id, { includeDrafts: isOwner })
```

`getUser()` is `cache()`-wrapped, so repeated calls within one render pass are
free. Neither route resolved a session before this change, though, so this does
add one session read per request to both — the cache only avoids a *second* one
within the same pass.

Drafts are not sorted or grouped separately: the read is explicitly ordered by
`createdAt, id` (see the DAL section below), the same order a visitor's read
returns, so a draft simply appears wherever the grid would place it once
published rather than in a section of its own. When the viewer is the owner
and at least one draft is present, the subtitle under the heading gains a
`n drafts, only visible to you` clause. The empty state splits: an owner with
nothing at all is pointed at `/products/new` rather than told to check back soon.

### Card — `components/product-card.tsx`

`ProductCard` gains an optional `draft?: boolean`. When set:

- a `Draft` badge is overlaid on the cover, top-left;
- an `Edit` link to `/products/{id}` replaces the add-to-cart control.

The card root is not an anchor — the product link is a stretched overlay and
interactive children sit above it with `z-10` (see the comment on the component).
The `Edit` link follows that same rule.

### Product page — `app/(public)/[handle]/[id]/[slug]/page.tsx`

`findProduct` resolves the seller from the handle as it does today, then decides
the flag from the viewer:

```ts
const viewer = await getUser()
const product = await getStorefrontProduct(id, seller.id, {
  includeDrafts: viewer?.id === seller.id,
})
```

`notFound()` still fires for everyone else, so a draft's URL is unreachable
without the owner's session — guessing the id does not help.

A draft renders the same page with three differences: a `Draft` badge beside the
title, an `Only visible to you` line under it, and the add-to-cart/wishlist row
replaced by an `Edit product` button to `/products/{id}`.

`generateMetadata` sets `robots: { index: false }` for a draft. The page is
already unreachable by a crawler, which has no session; this is the belt to that
pair of braces.

### Rendering

Both pages already opt out of static rendering — `readCartMembership` reads
cookies. `getUser()` reads headers, which does not change that. There is no
cached storefront output to invalidate when a product's status changes.

## Verification

The repo has no test framework. `npm run build` does not work in this sandbox
(it hits a blocked Google Fonts fetch), so it is out. Verification is
`npx tsc --noEmit`, `npm run lint`, and a manual pass:

1. Signed in as the seller, `/@handle` shows drafts with badges and the subtitle
   count; a draft card's `Edit` link opens the product editor.
2. A draft's product URL renders for its owner, badged, with the edit button.
3. Signed out, and signed in as a different user: the draft is absent from the
   grid and its URL 404s.
4. `/explore` and the cart show no drafts for anyone.
