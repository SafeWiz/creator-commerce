# Live Dashboard

The dashboard is the last screen reading from `lib/mock-data.ts`. This replaces
its KPIs and top-products list with real queries, drops the onboarding checklist,
and deletes the mock module.

## Goals

- Every number on the page comes from the database or is visibly absent.
- No fabricated measurement. Conversion has no data source, so it renders an em
  dash rather than a plausible-looking percentage.
- `lib/mock-data.ts` is deleted.

## Non-goals

- Pageview or analytics collection. Conversion comes back through a third-party
  product (Plausible, PostHog, Vercel Analytics), not a home-grown counter —
  counting views correctly means handling bots, cached responses and a write per
  render, and a worse version of that number is worth less than no number.
- Onboarding. The checklist card is deleted outright, not reworked. Two of its
  five items were unknowable ("Connect Stripe" — Connect does not exist; "Share
  your storefront link" — nothing tracks it), and an unchecked box is a claim
  about the user that we cannot make.
- Pagination, filtering or date-range controls on the dashboard.

## Data layer

### `lib/server/dal/purchases.ts`

```ts
export type PeriodTotals = {
  current: { units: number; revenueInCents: number }
  previous: { units: number; revenueInCents: number }
}

export async function getSellerPeriodTotals(
  sellerId: string,
  options?: { days?: number },  // default 30
): Promise<PeriodTotals>
```

One scan, one row. `WHERE seller_id = $1 AND status = 'paid' AND created_at >=
now() - interval '60 days'`, with four aggregates:

```sql
count(*)                      filter (where created_at >= now() - interval '30 days')
sum(price_in_cents)           filter (where created_at >= now() - interval '30 days')
count(*)                      filter (where created_at <  now() - interval '30 days')
sum(price_in_cents)           filter (where created_at <  now() - interval '30 days')
```

The previous-window filter needs no lower bound because the outer `WHERE`
already supplies it. Both windows in one scan rather than two queries: the
delta is meaningless unless both halves come from the same read.

Serves `purchases_sellerId_createdAt_idx`. `sum` maps through `Number`, and
`?? 0` covers the NULL that `SUM` over zero rows returns — the same two notes
`getSellerTotals` already carries.

Only `'paid'` counts, matching `getSellerTotals`: pending money has not arrived
and refunded money left again.

```ts
export type TopProduct = {
  productId: number
  name: string
  revenueInCents: number
}

export async function getSellerTopProducts(
  sellerId: string,
  options: { since?: Date; limit: number },
): Promise<TopProduct[]>
```

`GROUP BY products.id`, `ORDER BY sum(price_in_cents) DESC`, `LIMIT $n`. Paid
rows only. `since` omitted means all time.

Two decisions worth stating, because both look wrong against the rest of this
module:

- **The name comes from a join on `products`, not from `purchases.productName`.**
  Everywhere else the snapshot is the correct read — a seller editing a product
  must not rewrite what a buyer's history says they bought. This is the seller's
  own catalogue, where the opposite holds: they think in terms of the product
  they own, and grouping by snapshot would split one renamed product into two
  rows that are really the same thing.
- **The join does not filter `deleted_at`.** A retired product still earned that
  revenue. Hiding it would silently understate the ranking, the same reasoning
  `getBuyerPurchases` gives for not filtering it either.

The join is inner and safe: `purchases.product_id` is `onDelete: 'restrict'`, so
the row cannot vanish under a purchase.

This does **not** return a total. Callers already hold one — the 30-day card uses
`getSellerPeriodTotals().current.revenueInCents`, the all-time card uses the
existing `getSellerTotals().revenueInCents` — and computing a total from five
returned rows would make the top product always 100%.

### `lib/server/dal/products.ts`

```ts
export type SellerProductCounts = { published: number; drafts: number }

export async function getSellerProductCounts(
  ownerId: string,
): Promise<SellerProductCounts>
```

One scan of `owner_id = $1 AND deleted_at IS NULL`, with
`count(*) filter (where status = 'published')` and the same for `'draft'`. The
two counts do not overlap.

## Page

`app/(master)/dashboard/page.tsx` becomes `async`.

```ts
const user = await requireUser()
const [period, allTime, topRecent, topAllTime, productCounts] = await Promise.all([
  getSellerPeriodTotals(user.id),
  getSellerTotals(user.id),
  getSellerTopProducts(user.id, { since: thirtyDaysAgo, limit: 5 }),
  getSellerTopProducts(user.id, { limit: 5 }),
  getSellerProductCounts(user.id),
])
```

`thirtyDaysAgo` is computed in the page and passed in, so the two 30-day reads
on this render agree on a boundary.

### Greeting

`Welcome back, {user.name}` — the full name verbatim. No splitting on
whitespace to find a first name; that guesses wrong on a large share of real
names, and the greeting is not worth being wrong about.

### KPI cards

Built as a `{ label, value, sub, badge }` array so the existing `.map` renders
unchanged.

| Card | Value | Sub | Badge |
| --- | --- | --- | --- |
| Revenue | `formatPrice(period.current.revenueInCents)` | `last 30 days` | delta |
| Units sold | `period.current.units` | `last 30 days` | delta |
| Products | `productCounts.published` | `{drafts} drafts` | none |
| Conversion | `—` | `storefront` | none |

Badge rule, a pure helper beside the array, taking `(current, previous)`:

| Condition | Badge |
| --- | --- |
| `previous > 0` | signed percent, one decimal; `default` variant when up, `destructive` when down |
| `previous === 0 && current > 0` | `"New"`, `secondary` variant |
| `current === 0 && previous === 0` | none |
| `previous > 0 && current === 0` | `-100%`, `destructive` — falls out of the first rule |

`previous === 0 && current > 0` cannot produce a percentage: dividing by zero is
undefined, and both `+100%` and `+∞%` would be inventions. `"New"` is the true
statement — this is the first window with sales.

The Conversion card carries a comment recording that the em dash is deliberate,
that nothing measures pageviews, and that the fix is third-party analytics rather
than a pageview table — so the next reader does not "repair" it by writing a
counter.

## `components/top-products-card.tsx`

```ts
type TopProductsCardProps = {
  title: string
  description: string
  products: TopProduct[]
  totalRevenueInCents: number
  emptyMessage: string
  footer?: React.ReactNode
}
```

Server component. Bar width is `revenueInCents / totalRevenueInCents`, so five
bars summing to less than 100% honestly show a long tail — the mock's math. When
`products` is empty it renders `emptyMessage` in muted text instead of rows;
`totalRevenueInCents` is then zero and never divided by.

Rendered twice under `grid-cols-2`:

| | 30-day card | All-time card |
| --- | --- | --- |
| description | `By revenue, last 30 days` | `By revenue, all time` |
| products | `topRecent` | `topAllTime` |
| total | `period.current.revenueInCents` | `allTime.revenueInCents` |
| empty | `No sales in the last 30 days.` | `No sales yet.` |
| footer | `View all sales` button | none |

Both cards always render. Layout does not shift between sellers, and a card with
nothing in it still tells a new seller what will appear there — the same choice
`/sales` makes with its empty table.

## Deletions

- The "Get your first sale" checklist card, and the `Check` import it was the
  only user of.
- `lib/mock-data.ts` in full. The dashboard was its last importer.
- The `Dashboard KPIs are still mock` entry in `TODO.md`, replaced by a shorter
  note: Conversion is the one remaining gap, it waits on third-party analytics,
  and the reason a home-grown pageview table is the wrong answer.

## Verification

No test suite exists in this repo, so this is manual. Five cases:

1. **Seller with no sales and no products.** Revenue `0,00 RON` with no badge,
   Units `0` with no badge, Products `0` / `0 drafts`, Conversion `—`. Both
   top-products cards render their empty messages.
2. **Sales only in the prior 30 days.** Revenue and Units show `0` with a
   `-100%` destructive badge. The 30-day card is empty; the all-time card lists
   products.
3. **Sales only in the current 30 days.** Both cards show a `New` badge.
4. **Sales in both windows.** Percentages match a hand calculation, and the sign
   picks the right badge variant.
5. **A renamed product with sales under both names.** One row in the ranking,
   showing the current name, with the revenue of both.

Additionally: a seller whose top product was soft-deleted still sees it ranked.
