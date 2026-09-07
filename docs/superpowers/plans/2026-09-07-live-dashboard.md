# Live Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dashboard's mock KPIs and top-products list with live database reads, drop the onboarding checklist card, and delete `lib/mock-data.ts`.

**Architecture:** Four new pure-read DAL functions (three aggregates over `purchases`, one over `products`), a reusable presentational `TopProductsCard`, and a rewritten server page that fires every read in one `Promise.all`. No schema change, no migration — every query is a read over existing columns and existing indexes.

**Tech Stack:** Next.js 16 (App Router, React Server Components), Drizzle ORM 0.45 over Neon Postgres (`neon-http` driver), Tailwind v4, Base UI card/badge primitives.

## Global Constraints

- **The user runs every command.** Do not run `npm run lint`, `npm run build`, `npx tsc`, or any drizzle script. Each verification step below says what to hand to Gabi and what output to expect back.
- **No test suite exists in this repository.** There is no test runner, no test directory, and no test script in `package.json`. Verification is typecheck + lint + build + the manual browser matrix in Task 5. Do not invent a test framework; do not add one.
- Every module under `lib/server/` starts with `import 'server-only'` — both DAL files already do; do not remove it.
- **DAL modules are a pure data layer.** They do not read request state, resolve the session, call `headers()`, or `redirect()`. Ownership is enforced by taking an id parameter and scoping the query to it. Time boundaries are parameters too — the DAL must not read the clock.
- Server actions never query tables; pages call the DAL directly. This feature adds no actions.
- All documentation and code comments in English.
- Currency renders through `formatPrice` from `@/lib/currency` — never hand-formatted.
- Only `status = 'paid'` purchases count toward revenue, units and rankings.

---

## File Structure

| Path | Change | Responsibility |
| --- | --- | --- |
| `lib/server/dal/purchases.ts` | Modify | Add `getSellerPeriodTotals` and `getSellerTopProducts` alongside the existing seller reads |
| `lib/server/dal/products.ts` | Modify | Add `getSellerProductCounts` |
| `components/top-products-card.tsx` | Create | Presentational card: title, ranked rows, share bars, empty message, optional footer |
| `app/(master)/dashboard/page.tsx` | Modify | Async server page: resolve user, fan out the reads, build the KPI array, render two `TopProductsCard`s |
| `lib/mock-data.ts` | Delete | Its last importer is gone |
| `TODO.md` | Modify | Replace the "Dashboard KPIs are still mock" entry |

---

## Refinement to the spec

The spec sketched `getSellerPeriodTotals(sellerId, { days?: 30 })`, with the DAL deriving its own window from the current time. This plan passes both boundaries in instead:

```ts
getSellerPeriodTotals(sellerId, { since, previousSince })
```

Two reasons. It keeps the clock out of the data layer, matching the rule that a DAL function's result is a function of its arguments alone. And it lets the page compute one `since` and hand the *same* `Date` to both `getSellerPeriodTotals` and `getSellerTopProducts`, so the two 30-day reads on a render provably agree on their boundary rather than agreeing to within a millisecond. Everything else in the spec stands as written.

---

## Task 1: Seller period totals

**Files:**
- Modify: `lib/server/dal/purchases.ts` (append after `getSellerTotals`, which ends at line 251)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `getSellerPeriodTotals(sellerId: string, window: { since: Date; previousSince: Date }): Promise<PeriodTotals>` and the exported type `PeriodTotals = { current: { units: number; revenueInCents: number }; previous: { units: number; revenueInCents: number } }`. Task 4 imports both.

- [ ] **Step 1: Widen the drizzle import**

`lib/server/dal/purchases.ts` line 3 currently reads:

```ts
import { and, count, desc, eq, ne, notExists, sql, sum } from 'drizzle-orm'
```

Replace it with:

```ts
import { and, count, desc, eq, gte, lt, ne, notExists, sql, sum } from 'drizzle-orm'
```

- [ ] **Step 2: Append the type and function**

Add at the end of the file:

```ts
export type PeriodTotals = {
  current: { units: number; revenueInCents: number }
  previous: { units: number; revenueInCents: number }
}

/**
 * Both halves of a period-over-period comparison, in one scan.
 *
 * `since` is the start of the current window and the end of the previous one;
 * `previousSince` is the start of the previous. The caller supplies both rather
 * than a day count, because a DAL function that reads the clock returns a
 * different answer for the same arguments — and because the page hands the same
 * `since` to getSellerTopProducts, so the two reads on one render cannot disagree
 * about where the window starts.
 *
 * One query rather than two, and that is not only about round trips: a delta
 * whose halves came from separate reads is comparing two different instants.
 * FILTER splits the same scan in two, so both numbers are as of the same moment.
 *
 * The outer WHERE already floors everything at `previousSince`, so the previous
 * window's filter needs an upper bound only. Serves
 * purchases_sellerId_createdAt_idx.
 *
 * Paid only, matching getSellerTotals: pending money has not arrived and
 * refunded money left again.
 */
export async function getSellerPeriodTotals(
  sellerId: string,
  window: { since: Date; previousSince: Date },
): Promise<PeriodTotals> {
  const inCurrent = gte(purchasesTable.createdAt, window.since)
  const inPrevious = lt(purchasesTable.createdAt, window.since)

  const [row] = await db
    .select({
      // The conditions are embedded as drizzle expressions rather than
      // interpolated Dates, so the timestamp column's own encoder maps them.
      currentUnits: sql<number>`count(*) filter (where ${inCurrent})`.mapWith(
        Number,
      ),
      // coalesce because SUM over zero matching rows is NULL, which is the
      // seller with no sales this window rather than a missing row.
      currentRevenueInCents:
        sql<number>`coalesce(sum(${purchasesTable.priceInCents}) filter (where ${inCurrent}), 0)`.mapWith(
          Number,
        ),
      previousUnits: sql<number>`count(*) filter (where ${inPrevious})`.mapWith(
        Number,
      ),
      previousRevenueInCents:
        sql<number>`coalesce(sum(${purchasesTable.priceInCents}) filter (where ${inPrevious}), 0)`.mapWith(
          Number,
        ),
    })
    .from(purchasesTable)
    .where(
      and(
        eq(purchasesTable.sellerId, sellerId),
        eq(purchasesTable.status, 'paid'),
        gte(purchasesTable.createdAt, window.previousSince),
      ),
    )

  // An ungrouped aggregate always returns a row; the fallbacks are belt and
  // braces for the destructure.
  return {
    current: {
      units: row?.currentUnits ?? 0,
      revenueInCents: row?.currentRevenueInCents ?? 0,
    },
    previous: {
      units: row?.previousUnits ?? 0,
      revenueInCents: row?.previousRevenueInCents ?? 0,
    },
  }
}
```

- [ ] **Step 3: Ask Gabi to typecheck**

Ask: "Please run `npx tsc --noEmit`."

Expected: no errors. A failure naming `gte` or `lt` as unused means Step 1 landed but Step 2 did not.

- [ ] **Step 4: Commit**

```bash
git add lib/server/dal/purchases.ts
git commit -m "feat(dal): seller period totals for dashboard KPIs"
```

---

## Task 2: Seller top products and product counts

**Files:**
- Modify: `lib/server/dal/purchases.ts` (append after Task 1's function)
- Modify: `lib/server/dal/products.ts` (line 3 import; append `getSellerProductCounts` at the end)

**Interfaces:**
- Consumes: the import widening from Task 1 Step 1 (`gte` is already available in `purchases.ts`).
- Produces:
  - `getSellerTopProducts(sellerId: string, options: { since?: Date; limit: number }): Promise<TopProduct[]>` with `TopProduct = { productId: number; name: string; revenueInCents: number }` — Task 3 imports the type, Task 4 the function.
  - `getSellerProductCounts(ownerId: string): Promise<SellerProductCounts>` with `SellerProductCounts = { published: number; drafts: number }` — Task 4 imports the function.

- [ ] **Step 1: Append `getSellerTopProducts` to `lib/server/dal/purchases.ts`**

```ts
export type TopProduct = {
  productId: number
  name: string
  revenueInCents: number
}

/**
 * The seller's best-earning products, highest first. `since` omitted means all
 * time.
 *
 * Two things here contradict the rest of this module on purpose.
 *
 * The name comes from the joined product, not from purchases.productName.
 * Everywhere else the snapshot is the correct read — a seller editing a product
 * must not rewrite what a buyer's history says they bought. This is the seller's
 * own catalogue, where the opposite holds: they think in terms of the product
 * they own, and grouping by snapshot would split one renamed product into two
 * rows that are really the same thing.
 *
 * The join does not filter deletedAt. A retired product still earned that
 * revenue, and hiding it would silently understate the ranking — the same
 * reasoning getBuyerPurchases gives.
 *
 * The join is inner and provably safe: purchases.productId is
 * onDelete: 'restrict', so the product cannot vanish under a purchase.
 *
 * No total is returned. Callers already hold one — the windowed card uses
 * getSellerPeriodTotals().current.revenueInCents, the all-time card uses
 * getSellerTotals().revenueInCents — and a total summed from the returned rows
 * would make the top product 100% of itself.
 */
export async function getSellerTopProducts(
  sellerId: string,
  options: { since?: Date; limit: number },
): Promise<TopProduct[]> {
  // One expression, used as both the projection and the sort key, so the two
  // cannot drift apart.
  const revenueInCents = sum(purchasesTable.priceInCents).mapWith(Number)

  return db
    .select({
      productId: productsTable.id,
      name: productsTable.name,
      revenueInCents,
    })
    .from(purchasesTable)
    .innerJoin(productsTable, eq(productsTable.id, purchasesTable.productId))
    .where(
      // and() drops undefined, so an absent `since` simply widens this to all
      // time rather than needing a second query shape.
      and(
        eq(purchasesTable.sellerId, sellerId),
        eq(purchasesTable.status, 'paid'),
        options.since
          ? gte(purchasesTable.createdAt, options.since)
          : undefined,
      ),
    )
    .groupBy(productsTable.id, productsTable.name)
    .orderBy(desc(revenueInCents))
    .limit(options.limit)
}
```

`productsTable` is already imported at the top of this file (line 8) for `getBuyerPurchases`; no import change is needed.

- [ ] **Step 2: Widen the drizzle import in `lib/server/dal/products.ts`**

Line 3 currently reads:

```ts
import { and, asc, desc, eq, ilike, inArray, isNull, ne, or } from 'drizzle-orm'
```

Replace it with:

```ts
import { and, asc, desc, eq, ilike, inArray, isNull, ne, or, sql } from 'drizzle-orm'
```

- [ ] **Step 3: Append `getSellerProductCounts` to `lib/server/dal/products.ts`**

```ts
export type SellerProductCounts = {
  published: number
  drafts: number
}

/**
 * How many products the owner has live, and how many are still drafts.
 *
 * The two counts do not overlap — `status` is one or the other — so the
 * dashboard can print the published figure as the headline and the drafts as a
 * separate line without either double-counting the other.
 *
 * Soft-deleted rows are excluded, the same as every other read of this table.
 * One scan of products_ownerId_idx rather than two count queries.
 */
export async function getSellerProductCounts(
  ownerId: string,
): Promise<SellerProductCounts> {
  const [row] = await db
    .select({
      published:
        sql<number>`count(*) filter (where ${eq(productsTable.status, 'published')})`.mapWith(
          Number,
        ),
      drafts:
        sql<number>`count(*) filter (where ${eq(productsTable.status, 'draft')})`.mapWith(
          Number,
        ),
    })
    .from(productsTable)
    .where(
      and(eq(productsTable.ownerId, ownerId), isNull(productsTable.deletedAt)),
    )

  return { published: row?.published ?? 0, drafts: row?.drafts ?? 0 }
}
```

- [ ] **Step 4: Ask Gabi to typecheck**

Ask: "Please run `npx tsc --noEmit`."

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/server/dal/purchases.ts lib/server/dal/products.ts
git commit -m "feat(dal): seller top products and product counts"
```

---

## Task 3: `TopProductsCard` component

**Files:**
- Create: `components/top-products-card.tsx`

**Interfaces:**
- Consumes: `TopProduct` from `@/lib/server/dal/purchases` (Task 2), as a `import type` — erased at compile time, so no server module reaches a bundle through it.
- Produces: `TopProductsCard(props: TopProductsCardProps)`, a server component. Task 4 renders it twice.

- [ ] **Step 1: Create the file**

```tsx
import type * as React from "react"

import type { TopProduct } from "@/lib/server/dal/purchases"
import { formatPrice } from "@/lib/currency"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type TopProductsCardProps = {
  title: string
  description: string
  products: TopProduct[]
  /**
   * Every product's revenue over the same window, not just the listed ones.
   * Passed in rather than summed from `products` because these are the top N of
   * a longer list: summing the rows would stretch them to fill the card and make
   * the leader 100% of a total it does not represent. Bars that stop short of
   * the edge are the honest picture of a long tail.
   */
  totalRevenueInCents: number
  emptyMessage: string
  footer?: React.ReactNode
}

export function TopProductsCard({
  title,
  description,
  products,
  totalRevenueInCents,
  emptyMessage,
  footer,
}: TopProductsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3.5">
        {products.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">{emptyMessage}</p>
        ) : (
          products.map((product) => (
            <div key={product.productId} className="flex flex-col gap-1.5">
              <div className="flex justify-between gap-3 text-[13px]">
                <span className="truncate font-medium">{product.name}</span>
                <span className="shrink-0 font-mono text-muted-foreground">
                  {formatPrice(product.revenueInCents)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    // A non-empty list means the total is positive, so the guard
                    // is only for the impossible case; it is here so the style
                    // can never read "NaN%".
                    width:
                      totalRevenueInCents > 0
                        ? `${(product.revenueInCents / totalRevenueInCents) * 100}%`
                        : "0%",
                  }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  )
}
```

- [ ] **Step 2: Ask Gabi to typecheck and lint**

Ask: "Please run `npx tsc --noEmit` and `npm run lint`."

Expected: both clean. The component has no consumer yet, which is fine — nothing errors on an unused export.

- [ ] **Step 3: Commit**

```bash
git add components/top-products-card.tsx
git commit -m "feat: extract top products card"
```

---

## Task 4: Rewire the dashboard page and delete the mock

**Files:**
- Modify: `app/(master)/dashboard/page.tsx` (full rewrite)
- Delete: `lib/mock-data.ts`
- Modify: `TODO.md:186-210`

**Interfaces:**
- Consumes: `getSellerPeriodTotals`, `PeriodTotals`, `getSellerTopProducts`, `getSellerTotals` (pre-existing) from `@/lib/server/dal/purchases`; `getSellerProductCounts` from `@/lib/server/dal/products`; `TopProductsCard` from `@/components/top-products-card`; `requireUser` from `@/lib/server/session`; `formatPrice` from `@/lib/currency`.
- Produces: nothing downstream. This is the last task that changes behaviour.

- [ ] **Step 1: Replace `app/(master)/dashboard/page.tsx` in full**

```tsx
import type { Metadata } from "next"
import Link from "next/link"

import { getSellerProductCounts } from "@/lib/server/dal/products"
import {
  getSellerPeriodTotals,
  getSellerTopProducts,
  getSellerTotals,
} from "@/lib/server/dal/purchases"
import { requireUser } from "@/lib/server/session"
import { formatPrice } from "@/lib/currency"
import { TopProductsCard } from "@/components/top-products-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Dashboard",
}

const DAY_MS = 24 * 60 * 60 * 1000
const PERIOD_DAYS = 30
const TOP_PRODUCTS_LIMIT = 5

type KpiBadge = {
  label: string
  variant: "default" | "destructive" | "secondary"
}

/**
 * A delta is a comparison, and a comparison needs both sides.
 *
 * With no prior window there is no percentage to compute: dividing by zero is
 * undefined, and both "+100%" and "+∞%" would be inventions sitting next to real
 * numbers. "New" is the true statement — this is the first window with sales.
 * When neither window has any, there is nothing to say at all.
 */
function deltaBadge(current: number, previous: number): KpiBadge | null {
  if (previous === 0) {
    return current > 0 ? { label: "New", variant: "secondary" } : null
  }

  const change = ((current - previous) / previous) * 100
  const up = change >= 0

  return {
    // toFixed already prints the minus sign; only the plus needs adding.
    label: `${up ? "+" : ""}${change.toFixed(1)}%`,
    variant: up ? "default" : "destructive",
  }
}

export default async function DashboardPage() {
  const user = await requireUser()

  // One clock reading for the whole render, so the windowed totals and the
  // windowed ranking cannot disagree about where "last 30 days" starts.
  const now = Date.now()
  const since = new Date(now - PERIOD_DAYS * DAY_MS)
  const previousSince = new Date(now - 2 * PERIOD_DAYS * DAY_MS)

  const [period, allTime, topRecent, topAllTime, productCounts] =
    await Promise.all([
      getSellerPeriodTotals(user.id, { since, previousSince }),
      getSellerTotals(user.id),
      getSellerTopProducts(user.id, { since, limit: TOP_PRODUCTS_LIMIT }),
      getSellerTopProducts(user.id, { limit: TOP_PRODUCTS_LIMIT }),
      getSellerProductCounts(user.id),
    ])

  const kpis = [
    {
      label: "Revenue",
      value: formatPrice(period.current.revenueInCents),
      sub: "last 30 days",
      badge: deltaBadge(
        period.current.revenueInCents,
        period.previous.revenueInCents,
      ),
    },
    {
      label: "Units sold",
      value: String(period.current.units),
      sub: "last 30 days",
      badge: deltaBadge(period.current.units, period.previous.units),
    },
    {
      label: "Products",
      value: String(productCounts.published),
      sub: `${productCounts.drafts} ${productCounts.drafts === 1 ? "draft" : "drafts"}`,
      // Not a measurement over time, so there is no prior period to compare to.
      badge: null,
    },
    {
      // An em dash, not a number, and deliberately so. Nothing in this app
      // measures storefront pageviews, so there is no denominator to divide
      // sales by. The card stays because the gap is worth showing; when it fills
      // it will be from third-party analytics (Plausible, PostHog, Vercel
      // Analytics), not from a pageview table here. Counting views correctly
      // means handling bots, cached responses and a write per render — and a
      // number whose whole value is being trustworthy is not worth shipping a
      // worse version of.
      label: "Conversion",
      value: "—",
      sub: "storefront",
      badge: null,
    },
  ]

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-5 p-6">
      <div>
        <h1 className="font-heading text-2xl font-medium tracking-[-0.02em]">
          {/* The full name verbatim. Splitting on whitespace to find a first
              name guesses wrong on a large share of real names, and a greeting
              is not worth being wrong about. */}
          Welcome back, {user.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s how your storefront is doing.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} size="sm">
            <CardHeader>
              <CardDescription>{kpi.label}</CardDescription>
              {kpi.badge && (
                <CardAction>
                  <Badge variant={kpi.badge.variant}>{kpi.badge.label}</Badge>
                </CardAction>
              )}
            </CardHeader>
            <CardContent>
              <div className="font-mono text-3xl leading-none font-medium tracking-[-0.02em]">
                {kpi.value}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{kpi.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Both cards always render, empty or not: the layout stays put between
          sellers, and a card with nothing in it still tells a new seller what
          will appear there. */}
      <div className="grid grid-cols-2 items-start gap-4">
        <TopProductsCard
          title="Top products"
          description="By revenue, last 30 days"
          products={topRecent}
          totalRevenueInCents={period.current.revenueInCents}
          emptyMessage="No sales in the last 30 days."
          footer={
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href="/sales" />}
            >
              View all sales
            </Button>
          }
        />
        <TopProductsCard
          title="Top products"
          description="By revenue, all time"
          products={topAllTime}
          totalRevenueInCents={allTime.revenueInCents}
          emptyMessage="No sales yet."
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Delete the mock module**

```bash
git rm lib/mock-data.ts
```

The dashboard was its only importer. Confirm nothing else reaches for it:

```bash
grep -rn "mock-data" app components lib scripts
```

Expected: no output.

- [ ] **Step 3: Replace the TODO.md entry**

Delete `TODO.md` lines 186-210 — the whole `- **Dashboard KPIs are still mock.**` bullet, through the paragraph ending "or change the label to match." — and put this in its place:

```markdown
- **Conversion has no data source.** The dashboard's fourth KPI renders an em
  dash. Revenue, Units sold and Products are windowed reads now
  (`getSellerPeriodTotals`, `getSellerProductCounts`), but conversion needs a
  denominator — storefront pageviews — and nothing anywhere counts them.

  The card stays rather than being deleted, because a missing card says nothing
  to the user or to the next developer while a fabricated percentage is worse
  than both. When it fills it fills from third-party analytics (Plausible,
  PostHog, Vercel Analytics), not from a home-grown pageview table: counting
  views correctly means handling bots, cached responses and a write per render,
  those products have solved all three, and a number whose whole value is being
  trustworthy is not worth shipping a worse version of.

  The onboarding checklist that sat beside it is gone for the related reason.
  Two of its five items were unknowable — "Connect Stripe", where Connect does
  not exist, and "Share your storefront link", which nothing tracks — and an
  unchecked box is a claim about the user that we could not make.
```

- [ ] **Step 4: Ask Gabi to typecheck, lint and build**

Ask: "Please run `npx tsc --noEmit`, then `npm run lint`, then `npm run build`."

Expected: all three clean. A build error naming `@/lib/mock-data` means a stale importer survived Step 2 — resolve it before continuing.

- [ ] **Step 5: Commit**

```bash
git add app/\(master\)/dashboard/page.tsx TODO.md lib/mock-data.ts
git commit -m "feat: live dashboard KPIs and top products"
```

---

## Task 5: Manual verification

**Files:** none — this task changes nothing. It exists because there is no test runner and these six cases are the only thing standing between the queries and production.

**Interfaces:**
- Consumes: everything from Tasks 1-4.
- Produces: nothing.

Ask Gabi to run `npm run dev`, sign in, and visit `/dashboard`. Walk the matrix below. Where a case needs data that does not exist, it is set up by editing `purchases.created_at` / `products.status` directly in the database — every column involved is a plain read.

- [ ] **Step 1: Seller with no sales and no products**

Expected: greeting shows the signed-in user's own name, not "Gabi" (unless that is their name). Revenue `0,00 RON` with **no** badge. Units sold `0`, no badge. Products `0` / `0 drafts`. Conversion `—` / `storefront`, no badge. Left card: "No sales in the last 30 days." Right card: "No sales yet." Both cards present and equal width.

- [ ] **Step 2: Sales only in the previous 30 days**

Set up: move every paid purchase's `created_at` to ~45 days ago.

Expected: Revenue and Units both show `0` with a red `-100.0%` badge. Left card empty with its message; right card lists products.

- [ ] **Step 3: Sales only in the current 30 days**

Set up: move every paid purchase's `created_at` to ~5 days ago.

Expected: Revenue and Units each carry a grey `New` badge — **not** a percentage, and not a missing badge.

- [ ] **Step 4: Sales in both windows**

Set up: some purchases ~5 days old, some ~45 days old, with different totals.

Expected: the percentage matches `((current - previous) / previous) * 100` to one decimal, computed by hand. Green badge when up, red when down.

- [ ] **Step 5: Ranking correctness**

Expected: at most five rows per card, ordered by revenue descending. Bar widths are each product's share of that card's total, so with more than five products the bars visibly do **not** fill the card. The left card's percentages are against the 30-day revenue in the KPI above; the right card's against all-time.

- [ ] **Step 6: Renamed and soft-deleted products**

Set up: rename a product that has sales under its old name; soft-delete another product that has sales (set `deleted_at`).

Expected: the renamed product is **one** row showing the current name, with both sales summed into it. The soft-deleted product still appears in the ranking.

- [ ] **Step 7: Products card**

Set up: confirm the owner's counts directly — `select status, count(*) from products where owner_id = $1 and deleted_at is null group by status`.

Expected: the headline equals the published count, the sub-line the draft count. A single draft reads "1 draft", not "1 drafts".

- [ ] **Step 8: Report back**

Report which cases passed and which failed, quoting the actual rendered values for any failure. Do not describe the feature as working until every box above is ticked.

---

## Self-review notes

- **Spec coverage.** `getSellerPeriodTotals` → Task 1. `getSellerTopProducts` → Task 2 Step 1. `getSellerProductCounts` → Task 2 Step 3. `TopProductsCard` → Task 3. Page, greeting, KPI table, badge rule, Conversion comment, two-card layout, empty states → Task 4 Step 1. Checklist card and `Check` import removed by the full page rewrite. `lib/mock-data.ts` → Task 4 Step 2. TODO.md → Task 4 Step 3. Verification matrix → Task 5, with the spec's five cases plus the soft-delete check it appends and a Products-card check the spec implies.
- **Deviation.** `getSellerPeriodTotals` takes `{ since, previousSince }` rather than `{ days }`, for the reasons under "Refinement to the spec".
- **Type consistency.** `TopProduct` is `{ productId, name, revenueInCents }` in Task 2, Task 3's props and Task 4's usage. `PeriodTotals` is `{ current, previous }` each `{ units, revenueInCents }` in Tasks 1 and 4. `SellerProductCounts` is `{ published, drafts }` in Tasks 2 and 4. `KpiBadge.variant` is `"default" | "destructive" | "secondary"`, all three of which exist in `badgeVariants`.
