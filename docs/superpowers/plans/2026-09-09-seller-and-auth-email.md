# Seller and Auth Email Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the app's single-callsite email layer to cover seller sale notifications and Better Auth's password reset and email verification, behind a new `lib/server/request/` boundary that isolates every request-scoped API call.

**Architecture:** Three stages. First a pure refactor that creates `lib/server/request/` and moves every module under `lib/server/` that touches `next/headers`, `next/navigation`, `next/cache` or `next/server` into it — including a `handleStripeWebhook` move that unblocks a `fulfillAndNotify` wrapper and lets `checkout.ts` become script-callable. Then the seller sale notification, fanned out per seller from one order. Then Better Auth's mail hooks and the three views they need. Mail is scheduled with `after()` throughout: directly for checkout, via `advanced.backgroundTasks.handler` for Better Auth.

**Tech Stack:** Next.js 16.2.10 (App Router, typed routes), React 19.2.4, Better Auth 1.6.24, Drizzle ORM 0.45, nodemailer 10, `@react-email/components` 1.0, Tailwind v4, zod 4.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-09-09-seller-and-auth-email-design.md`. Read it before starting.
- **Read the Next.js docs before writing routing or request-API code.** This is not the Next.js in your training data. Guides live in `node_modules/next/dist/docs/`. `after()` is `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md`.
- **You may run `npm run lint` and `npx tsc --noEmit`. Nothing else.** Gabi runs `npm run build`, `npm run dev`, `npm install` and every `schema:*` script himself — when a step needs one of those, say so in your report and stop; do not run it. (This is a grant for this plan only. Gabi's standing preference is that he runs everything; he relaxed it for the two read-only checks.)
- **Run `npm run lint` and `npx tsc --noEmit` before every commit**, even where a task's steps only name one of them. Both must be clean.
- **You commit your own task.** Use the commit message given in the task's final step verbatim, including its `Claude-Session:` trailer.
- **Every module under `lib/server/` starts with `import 'server-only'`.** No exceptions, including the new `lib/server/request/` modules.
- **A step that needs `npm run dev` and a browser is not yours to run.** Do the code, run lint and tsc, commit, and list the browser checks you could not perform in your report under a heading `Owed to Gabi`, copied verbatim from the task's steps. Do not stall waiting for them and do not claim them as passed. The controller batches them for Gabi.
- **Documentation, comments and copy are English only.**
- **Comments explain why, not what.** The codebase's existing docblocks are the register to match: they name the alternative that was rejected and the reason. Do not add narration.
- **No new dependencies.** Everything needed is installed.
- **No schema changes.** `user.additionalFields` is untouched, so `npm run schema:better-auth` must produce no diff and no migration is generated.
- **`import 'server-only'` modules may never be imported by a client component.** The auth views are `"use client"` and talk to `@/lib/client/auth` only.
- **Templates under `components/email/` read no environment.** Every url arrives as a prop. This is what keeps them renderable by the dev preview route outside a request.
- **Each template exports its subject function beside its component**, so subject and body cannot drift. Existing example: `receiptSubject()` in `components/email/receipt.tsx`.
- **Password minimum is 8**, matching Better Auth's `minPasswordLength` default.
- **`requireEmailVerification` stays `false`.** Do not set it.
- **Existing quote style is inconsistent by directory** — `lib/server/` and `lib/` use single quotes with no semicolons, `app/` and `components/` use double quotes with no semicolons. Match the file you are editing.

---

## File Structure

**Stage 1 — the boundary**

| Path | Responsibility |
| --- | --- |
| `lib/server/request/session.ts` | Moved verbatim from `lib/server/session.ts`. |
| `lib/server/request/cart.ts` | Moved verbatim from `lib/server/cart.ts`. |
| `lib/server/request/revalidate.ts` | Moved verbatim from `lib/server/revalidate.ts`. |
| `lib/server/request/background.ts` | The only module in the app that calls `after()`. |
| `lib/server/request/checkout.ts` | `fulfillAndNotify` — fulfilment plus scheduled mail. |
| `lib/server/request/stripe-webhook.ts` | `handleStripeWebhook`, moved out of `checkout.ts`. |
| `lib/server/checkout.ts` | Reduced to pure Stripe and sequencing. |

**Stage 2 — the seller notification**

| Path | Responsibility |
| --- | --- |
| `app/dev/emails/[template]/fixtures.tsx` | `TEMPLATES` registry and every fixture. Dev only. |
| `app/dev/emails/[template]/route.tsx` | Lookup, render, `?send=`. No per-template knowledge. |
| `app/dev/emails/page.tsx` | Index of the registry. |
| `components/email/sale.tsx` | `SaleEmail` + `saleSubject`. |
| `lib/server/email/sale.tsx` | `sendSaleEmail` — one seller's mail. |
| `lib/server/email/order.ts` | `sendOrderEmails` — the fan-out. Composes nothing. |
| `lib/server/dal/users.ts` | Gains `getUserEmails`. |

**Stage 3 — Better Auth**

| Path | Responsibility |
| --- | --- |
| `components/email/password-reset.tsx` | `PasswordResetEmail` + `passwordResetSubject`. |
| `components/email/verify-email.tsx` | `VerifyEmail` + `verifyEmailSubject`. |
| `lib/server/email/auth.tsx` | `sendPasswordResetEmail`, `sendEmailVerification`. |
| `lib/server/auth.ts` | Gains `advanced.backgroundTasks`, `sendResetPassword`, `emailVerification`. |
| `lib/schemas/auth.ts` | Gains `PASSWORD_MIN_LENGTH`. |
| `app/(auth)/forgot-password/` | `page.tsx` + `forgot-password-form.tsx`. |
| `app/(auth)/reset-password/` | `page.tsx` + `reset-password-form.tsx`. |
| `app/(auth)/verify-email/` | `page.tsx` + `verify-email-view.tsx`. |
| `components/layouts/verify-email-banner.tsx` | The unverified nudge. |
| `components/layouts/dashboard-shell.tsx` | Renders the banner. |

## A note on testing

This project has no test harness — no runner, no test files, nothing in
`package.json` beyond `lint`. Do not introduce one; that is a separate decision
and not this plan's job.

Every task therefore ends with a concrete, checkable verification instead of a
test suite: a `grep` whose output is specified, a lint and build that Gabi runs,
or a dev-server URL with the exact expected output. Treat those as the gate —
do not commit a task whose verification you have not seen pass.

The dev preview route is the workhorse. `SMTP_USER` / `SMTP_PASS` absent means
`sendEmail` uses nodemailer's `jsonTransport` and logs the full rendered text
body to the server console, so every template and every fan-out can be exercised
end to end without sending real mail.

---

# Stage 1 — the request boundary

## Task 1: Move the three request-scoped modules into `lib/server/request/`

Pure refactor. No behaviour changes, no new files beyond the moves.

**Files:**
- Move: `lib/server/session.ts` → `lib/server/request/session.ts`
- Move: `lib/server/cart.ts` → `lib/server/request/cart.ts`
- Move: `lib/server/revalidate.ts` → `lib/server/request/revalidate.ts`
- Modify: 26 importers (listed in Step 2)

**Interfaces:**
- Consumes: nothing.
- Produces: `@/lib/server/request/session` exporting `getUser` and `requireUser`; `@/lib/server/request/cart` exporting `readCartIds`, `readCartMembership`, `commitCart`, `clearCart`; `@/lib/server/request/revalidate` exporting `revalidateStorefront`. All signatures unchanged.

- [ ] **Step 1: Move the three files with git**

```bash
mkdir -p lib/server/request
git mv lib/server/session.ts lib/server/request/session.ts
git mv lib/server/cart.ts lib/server/request/cart.ts
git mv lib/server/revalidate.ts lib/server/request/revalidate.ts
```

File contents are not edited. `git mv` keeps the history attached.

- [ ] **Step 2: Rewrite every import path**

```bash
grep -rl "@/lib/server/session\|@/lib/server/cart\|@/lib/server/revalidate" \
  app lib components \
| xargs sed -i '' \
    -e 's|@/lib/server/session|@/lib/server/request/session|g' \
    -e 's|@/lib/server/cart|@/lib/server/request/cart|g' \
    -e 's|@/lib/server/revalidate|@/lib/server/request/revalidate|g'
```

`sed -i ''` is the macOS form; this is a darwin machine.

The 26 references live in these files:

```
app/(master)/settings/page.tsx          app/(master)/purchases/page.tsx
app/(master)/products/page.tsx          app/(master)/products/[id]/page.tsx
app/(master)/sales/page.tsx             app/(master)/explore/page.tsx
app/(master)/dashboard/page.tsx         app/(master)/downloads/page.tsx
app/(master)/downloads/[productId]/route.ts
app/checkout/return/route.ts            app/cart/page.tsx
app/(public)/[handle]/page.tsx          app/(public)/[handle]/[id]/[slug]/page.tsx
lib/server/uploadthing.ts               lib/actions/products.ts
lib/actions/cart.ts                     components/layouts/cart-shell.tsx
components/layouts/dashboard-shell.tsx  components/cart-badge.tsx
```

- [ ] **Step 3: Verify no stale references remain**

Run:
```bash
grep -rn "@/lib/server/session\|@/lib/server/cart\|@/lib/server/revalidate" app lib components
```
Expected: no output, exit code 1. Any hit is a path the `sed` missed.

Guard against a partial rewrite creating a doubled path:
```bash
grep -rn "request/request" app lib components
```
Expected: no output.

- [ ] **Step 4: Verify the boundary rule now holds for these three**

Run:
```bash
grep -rn "next/headers\|next/navigation\|next/cache\|next/server" lib/server --exclude-dir=request
```
Expected: exactly two hits, both of them comments in `lib/server/checkout.ts` and `lib/server/auth.ts` that mention these modules in prose rather than importing them:

```
lib/server/checkout.ts:151:  // still be lost that way even though the promotion went through. next/server's
lib/server/auth.ts:26:  // auth cookies via next/headers.
```

Task 2 deletes the `checkout.ts` one. The `auth.ts` one stays — it explains why `nextCookies()` must be the last plugin, and it is prose, not an import.

- [ ] **Step 5: Lint and build**

Run:
```bash
npm run lint && npx tsc --noEmit
```
Expected: both clean.

Then note in your report that `npm run build` is still owed — Gabi runs it. A failure here is a missed import path, not a logic error.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: move request-scoped modules to lib/server/request

session.ts, cart.ts and revalidate.ts each import next/headers, next/navigation
or next/cache, which makes them callable only inside a request scope. Nothing in
the tree said which modules those were. Grouping them under lib/server/request/
makes the constraint visible and greppable, and leaves everything else under
lib/server/ script-callable.

Pure move plus import-path updates. No behaviour change.

Claude-Session: https://claude.ai/code/session_01EA1cFgzhNomjwRV3WTg2fj"
```

---

## Task 2: Extract the webhook handler, add `after()` scheduling, document the rule

**Files:**
- Create: `lib/server/request/background.ts`
- Create: `lib/server/request/checkout.ts`
- Create: `lib/server/request/stripe-webhook.ts`
- Modify: `lib/server/checkout.ts` (delete `handleStripeWebhook`, `isUniqueViolation` moves with it, delete the mail dispatch)
- Modify: `app/api/stripe/webhook/route.ts`
- Modify: `app/checkout/return/route.ts:63`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: `fulfillCheckoutSession(session): Promise<Purchase[]>` from `@/lib/server/checkout`; `sendReceiptEmail(purchases: Purchase[]): Promise<void>` from `@/lib/server/email/receipt`.
- Produces:
  - `scheduleEmail(task: () => Promise<void>, context: string): void` from `@/lib/server/request/background`
  - `scheduleBackgroundTask(promise: Promise<unknown>): void` from `@/lib/server/request/background`
  - `fulfillAndNotify(session: Pick<Stripe.Checkout.Session, 'id' | 'payment_intent'>): Promise<Purchase[]>` from `@/lib/server/request/checkout`
  - `handleStripeWebhook(request: Request): Promise<Response>` from `@/lib/server/request/stripe-webhook`

- [ ] **Step 1: Create `lib/server/request/background.ts`**

```ts
import 'server-only'

import { after } from 'next/server'

/**
 * The one place this app calls after().
 *
 * after() defers work until the response has been sent and, on a serverless
 * platform, extends the invocation through waitUntil so the work cannot be torn
 * down half-finished. That last part is the reason it exists here: the receipt
 * used to be a bare un-awaited promise, which a runtime is free to kill the
 * moment it returns the response.
 *
 * It throws outside a request scope, which is what confines this module — and
 * everything else that calls after(), headers(), cookies() or revalidatePath() —
 * to lib/server/request/.
 */

/**
 * Sends after the response, and never lets a send failure escape.
 *
 * Swallowing is deliberate and matches what fulfillCheckoutSession already did:
 * a dead SMTP connection must not turn a fulfilled order into a 500, because
 * Stripe would then retry for three days against a state that will never
 * resolve — the rows are already promoted and the retry promotes nothing.
 *
 * `context` is whatever identifies the send in a log: the order id, a user id.
 */
export function scheduleEmail(
  task: () => Promise<void>,
  context: string,
): void {
  after(async () => {
    try {
      await task()
    } catch (error) {
      console.error(`[email] ${context} failed`, error)
    }
  })
}

/**
 * Better Auth's advanced.backgroundTasks.handler.
 *
 * Passed a promise rather than a callback, which after() accepts directly. No
 * catch of its own: Better Auth attaches one and logs before it ever calls this
 * (create-context.mjs), so a second would only duplicate the line.
 *
 * Without this wired up, Better Auth awaits its email hooks inline and every
 * signup, reset request and resend blocks on the SMTP handshake.
 */
export function scheduleBackgroundTask(promise: Promise<unknown>): void {
  after(promise)
}
```

- [ ] **Step 2: Create `lib/server/request/checkout.ts`**

```ts
import 'server-only'

import type Stripe from 'stripe'

import { fulfillCheckoutSession } from '@/lib/server/checkout'
import type { Purchase } from '@/lib/server/db/schemas/purchase'
import { sendOrderEmails } from '@/lib/server/email/order'
import { scheduleEmail } from './background'

/**
 * Fulfilment plus the mail it triggers.
 *
 * Both entry points — the webhook and the buyer's return redirect — go through
 * here rather than calling fulfillCheckoutSession directly, so the schedule call
 * exists once instead of at both call sites.
 *
 * The split is the point: fulfillCheckoutSession stays free of after() and
 * therefore stays callable from a script that has no request scope, which is
 * what a reconciliation pass over stuck sessions would need.
 *
 * An empty promoted array is the normal case whenever the two entry points race,
 * and it means the winner already sent the mail.
 */
export async function fulfillAndNotify(
  session: Pick<Stripe.Checkout.Session, 'id' | 'payment_intent'>,
): Promise<Purchase[]> {
  const promoted = await fulfillCheckoutSession(session)

  if (promoted.length > 0) {
    scheduleEmail(
      () => sendOrderEmails(promoted),
      `order ${promoted[0].orderId} (session ${session.id})`,
    )
  }

  return promoted
}
```

`@/lib/server/email/order` does not exist until Task 7. Until then this import
fails to resolve. Step 3 handles that.

- [ ] **Step 3: Create a placeholder `lib/server/email/order.ts` that only sends the receipt**

Stage 1 must leave the app working, and Task 7 is where the seller fan-out
lands. So the module is born doing exactly what `checkout.ts` did:

```ts
import 'server-only'

import type { Purchase } from '@/lib/server/db/schemas/purchase'
import { sendReceiptEmail } from './receipt'

/**
 * Every email one paid order produces.
 *
 * Its own module rather than more of the request layer: fulfillAndNotify's job
 * is to schedule, not to decide who hears about a sale.
 *
 * Today that is only the buyer's receipt. The per-seller notification lands here
 * next, which is why the signature takes the whole promoted array rather than
 * the single address the receipt needs.
 */
export async function sendOrderEmails(purchases: Purchase[]): Promise<void> {
  await sendReceiptEmail(purchases)
}
```

- [ ] **Step 4: Create `lib/server/request/stripe-webhook.ts`**

Move `handleStripeWebhook` and its `isUniqueViolation` helper's *caller*
relationship carefully: `isUniqueViolation` is used by `fulfillCheckoutSession`,
not by the webhook, so it **stays** in `checkout.ts`. Only the webhook handler
moves.

```ts
import 'server-only'

import type Stripe from 'stripe'

import { deletePendingCheckoutSession } from '@/lib/server/dal/purchases'
import { stripe } from '@/lib/server/stripe'
import { fulfillAndNotify } from './checkout'

/**
 * Stripe's side of the flow. Mounted at app/api/stripe/webhook/route.ts.
 *
 * Here rather than in lib/server/checkout.ts because it is a route handler in
 * everything but name: it reads a raw body, reads a signature header, and
 * answers in status codes. Keeping it next to the pure fulfilment logic made
 * that module's own docblock false and made a fulfillAndNotify wrapper
 * impossible without an import cycle.
 *
 * Status codes are the contract here, not decoration: 400 tells Stripe the
 * request was never valid, 500 asks it to retry with backoff, and 200 means done
 * — including for events we do not handle, since anything else marks the
 * endpoint as failing in the dashboard.
 */
export async function handleStripeWebhook(request: Request): Promise<Response> {
  // Before anything else, and text() rather than json(): the signature covers the
  // raw bytes, so re-serialising a parsed body would invalidate it.
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    )
  } catch (error) {
    // A 400 here means the secret is wrong or the request is forged. Stripe will
    // retry and keep failing, which is the point — this should be loud rather
    // than silently swallowed with a 200.
    const message = error instanceof Error ? error.message : 'Invalid signature'
    console.error(`[checkout] webhook signature rejected: ${message}`)
    return new Response('Invalid signature', { status: 400 })
  }

  // log event type
  console.log('stripe event:', event.type)

  // Anything thrown past here is left to propagate: a database failure should
  // become a 500 so Stripe retries, rather than a 200 that loses the order.
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object
      // 'completed' fires for delayed payment methods too, where the session is
      // done but the money is not in yet. That case is finished later by
      // async_payment_succeeded.
      if (session.payment_status !== 'unpaid') {
        await fulfillAndNotify(session)
      }
      break
    }
    case 'checkout.session.expired':
    case 'checkout.session.async_payment_failed': {
      await deletePendingCheckoutSession(event.data.object.id)
      break
    }
  }

  return Response.json({ received: true })
}
```

- [ ] **Step 5: Strip `lib/server/checkout.ts`**

Delete four things:

1. The imports that are no longer used: `sendReceiptEmail`, and `stripe` **only
   if** nothing else in the file uses it — `createCheckoutSession` does, so
   `stripe` stays.
2. The entire `handleStripeWebhook` function.
3. The mail dispatch block at the end of `fulfillCheckoutSession`, comment
   included.
4. The `deletePendingCheckoutSession` import stays — `fulfillCheckoutSession`
   still calls it on the duplicate-purchase path and in the sweep.

The tail of `fulfillCheckoutSession` becomes:

```ts
  await deletePendingCheckoutSession(session.id)

  return promoted
}
```

Everything from `// promoted.length > 0 is the exactly-once rule` through the
closing `}` of the `if (promoted.length > 0)` block is deleted. That comment
block ends with *"next/server's after() exists to hold the invocation open past
the response and is the fix if that ever proves to happen in practice — not
applied here"* — it is now applied, elsewhere, and the caveat is obsolete.

Then update the module docblock. Replace:

```ts
 * Its own module rather than living in lib/actions/cart.ts because two entry
 * points need the same fulfilment: the browser coming back from Stripe
 * (app/checkout/return/route.ts) and Stripe's own webhook
 * (app/api/stripe/webhook/route.ts). Whichever arrives first does the work.
```

with:

```ts
 * Its own module rather than living in lib/actions/cart.ts because two entry
 * points need the same fulfilment: the browser coming back from Stripe
 * (app/checkout/return/route.ts) and Stripe's own webhook
 * (lib/server/request/stripe-webhook.ts). Whichever arrives first does the work.
 * Both reach it through fulfillAndNotify, which adds the mail this module
 * deliberately does not send.
```

And extend the layering paragraph's last sentence:

```ts
 * the DAL owns SQL. Nothing here reads headers() or cookies() or redirects, and
 * nothing here calls after() — which is what keeps it callable from a script
 * with no request scope, not merely from the webhook.
```

- [ ] **Step 6: Re-point `app/api/stripe/webhook/route.ts`**

```ts
import { handleStripeWebhook } from '@/lib/server/request/stripe-webhook'

export const POST = handleStripeWebhook
```

- [ ] **Step 7: Re-point `app/checkout/return/route.ts`**

Change the import:

```ts
import { fulfillAndNotify } from '@/lib/server/request/checkout'
```

and the call at what is currently line 63:

```ts
  await fulfillAndNotify(session)
```

Nothing else in that file changes — it already imports `clearCart` and `getUser`
from their new `request/` paths after Task 1.

- [ ] **Step 8: Verify the boundary grep is now clean**

Run:
```bash
grep -rn "next/headers\|next/navigation\|next/cache\|next/server" lib/server --exclude-dir=request
```
Expected: exactly one hit, the prose comment in `lib/server/auth.ts`:
```
lib/server/auth.ts:26:  // auth cookies via next/headers.
```

Run:
```bash
grep -rn "from 'next/server'" lib
```
Expected: exactly one hit,
`lib/server/request/background.ts:3:import { after } from 'next/server'`.

Grep the import, not `after(` — the latter matches the prose comments in
`checkout.ts` and `request/checkout.ts` that say a module does *not* call it, and
those comments are mandated by this plan. The import is the invariant.

- [ ] **Step 9: Document the rule in CLAUDE.md**

After the paragraph ending *"`lib/actions/*` is its own case — server actions, marked with `'use server'`, imported by client components."*, insert:

```markdown
**`lib/server/request/`** is the only place under `lib/server/` that may import
`next/headers`, `next/navigation`, `next/cache` or `next/server`. Its modules
are callable only from a route handler, a server action, or a server component;
everything else under `lib/server/` is request-agnostic and callable from a
script or a cron. `after()` throws outside a request scope, so this is a real
constraint rather than a stylistic one, and it is checkable:

```bash
grep -rn "next/headers\|next/navigation\|next/cache\|next/server" lib/server --exclude-dir=request
```

It holds `session.ts` (the session helpers), `cart.ts` (the cart cookie),
`revalidate.ts`, `background.ts` (the app's only `after()` call),
`checkout.ts` (`fulfillAndNotify`) and `stripe-webhook.ts`.
```

Then update the existing session bullet, which currently reads
*"**Session/auth helpers** live in `lib/server/session.ts`, not the DAL"* — the
path becomes `lib/server/request/session.ts`.

- [ ] **Step 10: Lint and build**

Run:
```bash
npm run lint && npx tsc --noEmit
```
Expected: both clean.

Then note in your report that `npm run build` is still owed — Gabi runs it.

- [ ] **Step 11: Verify a checkout still produces exactly one receipt**

Ask Gabi to run `npm run dev`, then buy one product end to end with Stripe test
card `4242 4242 4242 4242`.

Expected in the server console: exactly one `[email] to=...` block with subject
`Your receipt from Creator Commerce`, and it appears **after** the redirect to
`/purchases` has already rendered — that ordering is the visible proof `after()`
is doing its job.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "refactor: schedule order mail with after(), extract webhook handler

The receipt was dispatched as a bare un-awaited promise, and checkout.ts carried
a comment admitting a serverless runtime may tear the invocation down before it
settles — naming after() as the fix and not applying it. Applied now, through
lib/server/request/background.ts, the app's only after() call.

handleStripeWebhook moves to lib/server/request/ because it is a route handler
in everything but name, and because leaving it in checkout.ts made a
fulfillAndNotify wrapper impossible without an import cycle. checkout.ts is left
pure: no mail, no request APIs, callable from a script.

Claude-Session: https://claude.ai/code/session_01EA1cFgzhNomjwRV3WTg2fj"
```

---

# Stage 2 — the seller notification

## Task 3: Turn the dev preview route into a registry

Pure refactor, one template. Doing it before the new templates means each one
lands previewable.

**Files:**
- Create: `app/dev/emails/[template]/fixtures.tsx`
- Create: `app/dev/emails/page.tsx`
- Modify: `app/dev/emails/[template]/route.tsx`

**Interfaces:**
- Consumes: `ReceiptEmail`, `receiptSubject`, `ReceiptEmailProps` from `@/components/email/receipt`.
- Produces: `TEMPLATES: Record<string, EmailFixture>` and `type EmailFixture = { subject: string; element: ReactElement }` from `./fixtures`.

- [ ] **Step 1: Create `app/dev/emails/[template]/fixtures.tsx`**

```tsx
import type { ReactElement } from 'react'

import { ReceiptEmail, receiptSubject } from '@/components/email/receipt'

/**
 * Every template the dev preview can render, and the data it renders with.
 *
 * Here rather than beside each template: fixtures exist to exercise a layout —
 * a name long enough to wrap, a zero price — and nothing in production should be
 * able to import them. The route stays free of per-template knowledge, so adding
 * a template is an entry in this record and nothing else.
 */
export type EmailFixture = {
  subject: string
  element: ReactElement
}

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000'

export const TEMPLATES: Record<string, EmailFixture> = {
  receipt: {
    subject: receiptSubject(),
    element: (
      <ReceiptEmail
        orderId="3f1c0b8e-9d2a-4f77-9a1e-5c6f2b7d8e90"
        appUrl={APP_URL}
        items={[
          {
            productId: 1,
            productName: 'Lightroom Presets — Golden Hour',
            priceInCents: 12900,
          },
          {
            productId: 2,
            productName:
              'A deliberately long product name that has to wrap inside a narrow email column without pushing the price out of alignment',
            priceInCents: 4900,
          },
          { productId: 3, productName: 'Free sample pack', priceInCents: 0 },
        ]}
      />
    ),
  },
}
```

- [ ] **Step 2: Rewrite `app/dev/emails/[template]/route.tsx`**

```tsx
import { render } from '@react-email/components'
import type { NextRequest } from 'next/server'

import { sendEmail } from '@/lib/server/email/send'
import { TEMPLATES } from './fixtures'

/**
 * Looking at an email while building it.
 *
 * A route in the app already running rather than the react-email CLI, which
 * boots its own Next app and expects an emails/ directory at the repo root. This
 * gives the same loop — edit, refresh — for no extra dependency.
 *
 * The route knows nothing about any individual template; fixtures.tsx is the
 * registry.
 */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/dev/emails/[template]'>,
) {
  // Before anything renders. This route exposes fixtures and a send trigger;
  // neither belongs to a deployed app.
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not found', { status: 404 })
  }

  const { template } = await ctx.params
  const fixture = TEMPLATES[template]

  if (!fixture) {
    return new Response(
      `Unknown template: ${template}\nKnown: ${Object.keys(TEMPLATES).join(', ')}\n`,
      { status: 404 },
    )
  }

  // ?send=<address> exercises the whole path — render, transport, log — without
  // running a Stripe checkout or a password reset. Dev only, like the rest.
  const to = request.nextUrl.searchParams.get('send')
  if (to) {
    await sendEmail({ to, subject: fixture.subject, react: fixture.element })
    return new Response(`Sent to ${to}\n`)
  }

  const html = await render(fixture.element)

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
```

- [ ] **Step 3: Create `app/dev/emails/page.tsx`**

```tsx
import { notFound } from 'next/navigation'

import { TEMPLATES } from './[template]/fixtures'

/**
 * The index, so the slugs do not have to be remembered.
 *
 * notFound() rather than the route handler's literal 404 response, because a
 * page has one available and it renders the app's own not-found.tsx.
 */
export default function DevEmailsPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return (
    <main className="mx-auto flex max-w-[640px] flex-col gap-4 p-8">
      <h1 className="text-2xl font-medium">Email templates</h1>
      <p className="text-sm text-muted-foreground">
        Append <code>?send=you@example.com</code> to any of these to run the
        template through the real send path.
      </p>
      <ul className="flex flex-col gap-2">
        {Object.entries(TEMPLATES).map(([slug, fixture]) => (
          <li key={slug}>
            <a
              href={`/dev/emails/${slug}`}
              className="text-primary underline"
            >
              {slug}
            </a>
            <span className="ml-2 text-sm text-muted-foreground">
              {fixture.subject}
            </span>
          </li>
        ))}
      </ul>
    </main>
  )
}
```

- [ ] **Step 4: Verify both routes**

Ask Gabi to run `npm run dev`, then check:

- `http://localhost:3000/dev/emails` — lists one entry, `receipt`, with the
  subject `Your receipt from Creator Commerce`.
- `http://localhost:3000/dev/emails/receipt` — renders the receipt, unchanged
  from before this task: three line items, the long name wrapping, a zero price.
- `http://localhost:3000/dev/emails/nope` — 404 with body
  `Unknown template: nope` and `Known: receipt`.

- [ ] **Step 5: Lint**

Run:
```bash
npm run lint && npx tsc --noEmit
```
Expected: both clean.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: make the dev email preview a template registry

The route hardcoded a single slug and inlined its fixture, so a second template
meant editing the route. Fixtures move to their own dev-only module keyed by
slug; the route looks up, renders or sends, and knows nothing about any
individual template. Adds an index page so the slugs need not be remembered.

Claude-Session: https://claude.ai/code/session_01EA1cFgzhNomjwRV3WTg2fj"
```

---

## Task 4: The seller sale template

**Files:**
- Create: `components/email/sale.tsx`
- Modify: `app/dev/emails/[template]/fixtures.tsx`

**Interfaces:**
- Consumes: `EmailLayout` from `@/components/email/layout`; `formatPrice` from `@/lib/currency`.
- Produces:
  - `type SaleItem = { productId: number; productName: string; priceInCents: number }`
  - `type SaleEmailProps = { orderId: string; items: SaleItem[]; appUrl: string }`
  - `saleSubject(itemCount: number): string`
  - `SaleEmail(props: SaleEmailProps)`

- [ ] **Step 1: Create `components/email/sale.tsx`**

```tsx
import { Button, Column, Hr, Row, Section, Text } from '@react-email/components'

import { formatPrice } from '@/lib/currency'
import { EmailLayout } from './layout'

export type SaleItem = {
  productId: number
  productName: string
  priceInCents: number
}

export type SaleEmailProps = {
  orderId: string
  items: SaleItem[]
  appUrl: string
}

/**
 * Exported beside the component so the subject and the body cannot drift apart,
 * the same arrangement receipt.tsx uses.
 *
 * Takes the count rather than the items because that is all it needs, and a
 * subject that could read a price is a subject that could leak one into a
 * notification preview.
 */
export function saleSubject(itemCount: number): string {
  return itemCount === 1 ? 'You made a sale' : `You made ${itemCount} sales`
}

/**
 * What a seller gets when one of their products is bought.
 *
 * Deliberately carries nothing about the buyer — no name, no address, no id. A
 * seller is told that a sale happened, not who made it; /sales is where that
 * question belongs if it should ever be answerable, and an email that omits it
 * cannot leak it when forwarded.
 *
 * Props are snapshot columns off the purchase row, for the same reason the
 * receipt uses them: a seller who renames or reprices a product afterwards must
 * not have the notification for a past sale rewritten under them.
 *
 * Product names are plain text here, unlike the receipt's download links. A
 * seller's copy of their own product is not something this email needs to hand
 * them, and /sales is one button away.
 */
export function SaleEmail({ orderId, items, appUrl }: SaleEmailProps) {
  const total = items.reduce((sum, item) => sum + item.priceInCents, 0)

  return (
    <EmailLayout preview={`${saleSubject(items.length)} — ${formatPrice(total)}`}>
      <Text className="m-0 text-[20px] font-bold">
        {items.length === 1 ? 'You made a sale' : `You made ${items.length} sales`}
      </Text>
      <Text className="mb-[24px] mt-[8px] text-[14px] text-muted-foreground">
        Payment has been confirmed. Here is what sold.
      </Text>

      <Section>
        {items.map((item) => (
          <Row key={item.productId} className="mb-[12px]">
            <Column>
              <Text className="m-0 text-[14px] font-medium">
                {item.productName}
              </Text>
            </Column>
            <Column align="right" className="w-[110px] align-top">
              <Text className="m-0 text-[14px]">
                {formatPrice(item.priceInCents)}
              </Text>
            </Column>
          </Row>
        ))}
      </Section>

      <Hr className="my-[20px] border-border" />

      <Row>
        <Column>
          <Text className="m-0 text-[14px] font-bold">Total</Text>
        </Column>
        <Column align="right" className="w-[110px]">
          <Text className="m-0 text-[14px] font-bold">{formatPrice(total)}</Text>
        </Column>
      </Row>

      <Section className="mt-[28px]">
        <Button
          href={`${appUrl}/sales`}
          className="rounded bg-primary px-[20px] py-[12px] text-[14px] font-medium text-primary-foreground"
        >
          View your sales
        </Button>
      </Section>

      <Hr className="my-[24px] border-border" />

      <Text className="m-0 text-[12px] text-muted-foreground">
        Order {orderId}
      </Text>
    </EmailLayout>
  )
}
```

- [ ] **Step 2: Register two fixtures in `app/dev/emails/[template]/fixtures.tsx`**

Add the import:

```tsx
import { SaleEmail, saleSubject } from '@/components/email/sale'
```

and two entries to `TEMPLATES`, after `receipt`. Two, because `saleSubject`
branches on count and both branches need looking at:

```tsx
  sale: {
    subject: saleSubject(1),
    element: (
      <SaleEmail
        orderId="3f1c0b8e-9d2a-4f77-9a1e-5c6f2b7d8e90"
        appUrl={APP_URL}
        items={[
          {
            productId: 1,
            productName: 'Lightroom Presets — Golden Hour',
            priceInCents: 12900,
          },
        ]}
      />
    ),
  },
  'sale-multi': {
    subject: saleSubject(3),
    element: (
      <SaleEmail
        orderId="7c2e1a4b-8f30-4d19-b6a2-0e5d3c9f1a72"
        appUrl={APP_URL}
        items={[
          {
            productId: 1,
            productName: 'Lightroom Presets — Golden Hour',
            priceInCents: 12900,
          },
          {
            productId: 2,
            productName:
              'A deliberately long product name that has to wrap inside a narrow email column without pushing the price out of alignment',
            priceInCents: 4900,
          },
          { productId: 3, productName: 'Free sample pack', priceInCents: 0 },
        ]}
      />
    ),
  },
```

- [ ] **Step 3: Verify both render**

Ask Gabi to run `npm run dev`, then check:

- `http://localhost:3000/dev/emails/sale` — heading "You made a sale", one row,
  total `129,00 RON`, a "View your sales" button.
- `http://localhost:3000/dev/emails/sale-multi` — heading "You made 3 sales",
  three rows with the long name wrapping and the price staying in its column,
  total `178,00 RON`.
- `http://localhost:3000/dev/emails` — now lists three entries.
- Neither page shows a buyer name, email, or id anywhere.

- [ ] **Step 4: Lint**

Run:
```bash
npm run lint && npx tsc --noEmit
```
Expected: both clean.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(email): seller sale notification template

Mirrors the receipt: same layout, snapshot-only props, subject exported beside
the component. Carries no buyer identity — a seller is told a sale happened, not
who made it, so a forwarded copy leaks nothing and /sales stays the only place
that question is answerable.

Two fixtures, because the subject branches on item count.

Claude-Session: https://claude.ai/code/session_01EA1cFgzhNomjwRV3WTg2fj"
```

---

## Task 5: Fan the order out to sellers

**Files:**
- Modify: `lib/server/dal/users.ts`
- Create: `lib/server/email/sale.tsx`
- Modify: `lib/server/email/order.ts`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: `getUserEmail` from `@/lib/server/dal/users`; `sendReceiptEmail` from `@/lib/server/email/receipt`; `SaleItem` from `@/components/email/sale`; `Purchase` from `@/lib/server/db/schemas/purchase`.
- Produces:
  - `getUserEmails(ids: string[]): Promise<Map<string, string>>` from `@/lib/server/dal/users`
  - `sendSaleEmail(params: { to: string; orderId: string; items: SaleItem[] }): Promise<void>` from `@/lib/server/email/sale`
  - `sendOrderEmails(purchases: Purchase[]): Promise<void>` — unchanged signature, new behaviour.

- [ ] **Step 1: Add `getUserEmails` to `lib/server/dal/users.ts`**

Extend the `drizzle-orm` import to bring in `inArray`:

```ts
import { eq, inArray } from 'drizzle-orm'
```

and append:

```ts
/**
 * The same address as getUserEmail, for many ids at once.
 *
 * One order can span several sellers, so the notification path would otherwise
 * open a round trip per seller. A Map rather than an array because the caller
 * has already grouped its rows by id and wants a lookup, not a scan.
 *
 * An empty input short-circuits: inArray with an empty list is a SQL error in
 * some drivers and a full scan in others, and neither is worth finding out.
 *
 * Ids with no row are simply absent from the Map. That is the caller's cue to
 * log and skip, not an error — the same trade getUserEmail's null makes.
 */
export async function getUserEmails(
  ids: string[],
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map()

  const rows = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(inArray(user.id, ids))

  return new Map(rows.map((row) => [row.id, row.email]))
}
```

- [ ] **Step 2: Create `lib/server/email/sale.tsx`**

```tsx
import 'server-only'

import { SaleEmail, saleSubject, type SaleItem } from '@/components/email/sale'
import { sendEmail } from './send'

/**
 * One seller's notification for one order.
 *
 * Takes the address rather than resolving it, unlike sendReceiptEmail: the
 * caller has already resolved every seller in the order in one query, and
 * re-resolving here would undo that.
 */
export async function sendSaleEmail(params: {
  to: string
  orderId: string
  items: SaleItem[]
}): Promise<void> {
  const { to, orderId, items } = params

  await sendEmail({
    to,
    subject: saleSubject(items.length),
    react: (
      <SaleEmail orderId={orderId} appUrl={process.env.APP_URL!} items={items} />
    ),
  })
}
```

Note the `.tsx` extension: the module contains JSX, the same as `receipt.tsx`.

- [ ] **Step 3: Rewrite `lib/server/email/order.ts`**

```ts
import 'server-only'

import type { Purchase } from '@/lib/server/db/schemas/purchase'
import { getUserEmails } from '@/lib/server/dal/users'
import { sendReceiptEmail } from './receipt'
import { sendSaleEmail } from './sale'

/**
 * Every email one paid order produces.
 *
 * Composes nothing itself — it decides who hears about a sale and lets the
 * receipt and sale modules build their own mail. Its own module rather than more
 * of the request layer, whose job is scheduling.
 *
 * A cart is assembled from /explore and can hold products from several owners,
 * so one order's rows may span N sellers. Each seller gets one email covering
 * their own items, not one per row: a three-product order from one seller would
 * otherwise be three notifications, and inbox noise matters most for the party
 * the platform wants to keep.
 *
 * allSettled, not all. The buyer's receipt and every seller's notification are
 * independent obligations, and `all` would abandon the rest on the first
 * rejection — one seller with a malformed address costing the buyer their
 * receipt.
 */
export async function sendOrderEmails(purchases: Purchase[]): Promise<void> {
  const [first] = purchases
  if (!first) return

  const bySeller = new Map<string, Purchase[]>()
  for (const purchase of purchases) {
    const existing = bySeller.get(purchase.sellerId)
    if (existing) existing.push(purchase)
    else bySeller.set(purchase.sellerId, [purchase])
  }

  // Queued before the lookup is awaited, deliberately. A transient database
  // error resolving seller addresses must not take the receipt down with it —
  // allSettled below isolates a bad address and a failed send, but it cannot
  // isolate the query that feeds it.
  const sends: Promise<void>[] = [sendReceiptEmail(purchases)]

  let sellerEmails: Map<string, string>
  try {
    sellerEmails = await getUserEmails([...bySeller.keys()])
  } catch (error) {
    // An empty Map sends every seller through the missing-address branch below,
    // which already logs and skips one at a time. So this degrades to "receipt
    // sent, notifications skipped, logged" rather than aborting.
    console.error(
      `[email] seller address lookup failed for order ${first.orderId}`,
      error,
    )
    sellerEmails = new Map()
  }

  for (const [sellerId, rows] of bySeller) {
    const to = sellerEmails.get(sellerId)
    if (!to) {
      // Near-impossible: purchases.sellerId is onDelete: 'restrict'. Logged and
      // skipped rather than thrown, because one unreachable seller must not cost
      // the buyer their receipt.
      console.error(
        `[email] no address for seller ${sellerId} — sale notification for order ${first.orderId} not sent`,
      )
      continue
    }

    sends.push(
      sendSaleEmail({
        to,
        orderId: first.orderId,
        items: rows.map((row) => ({
          productId: row.productId,
          productName: row.productName,
          priceInCents: row.priceInCents,
        })),
      }),
    )
  }

  const results = await Promise.allSettled(sends)

  for (const result of results) {
    if (result.status === 'rejected') {
      console.error(
        `[email] a send failed for order ${first.orderId}`,
        result.reason,
      )
    }
  }
}
```

- [ ] **Step 4: Verify the fan-out with a two-seller order**

This needs two accounts. Ask Gabi to run `npm run dev`, then:

1. Sign up as seller A, publish a product.
2. Sign up as seller B, publish a different product.
3. Sign up as a buyer, add both products to the cart, check out with
   `4242 4242 4242 4242`.

Expected in the server console: three `[email]` blocks.

- One to the buyer, subject `Your receipt from Creator Commerce`, listing both
  products.
- One to seller A, subject `You made a sale`, listing **only** A's product.
- One to seller B, subject `You made a sale`, listing **only** B's product.

No buyer name or address appears in either seller's body.

- [ ] **Step 5: Verify the single-seller grouping**

Same dev server. As the buyer, buy two products that both belong to seller A.

Expected: two `[email]` blocks — one receipt, and **one** seller mail with
subject `You made 2 sales` listing both products. Not two seller mails.

- [ ] **Step 6: Lint and build**

Run:
```bash
npm run lint && npx tsc --noEmit
```
Expected: both clean.

Then note in your report that `npm run build` is still owed — Gabi runs it.

- [ ] **Step 7: Document it in CLAUDE.md**

In the Email section, after the paragraph about the `sendEmail` choke point,
insert:

```markdown
A paid order produces one receipt for the buyer and one notification per seller.
`sendOrderEmails` in `lib/server/email/order.ts` groups the promoted purchase
rows by `sellerId` so a three-product order from one seller is one email rather
than three, resolves every seller address in a single `getUserEmails` query, and
runs the sends through `Promise.allSettled` — a seller with an unreachable
address must not cost the buyer their receipt. The seller's copy carries no
buyer identity.
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(email): notify sellers when their product sells

One order can span several sellers, so the promoted rows are grouped by sellerId
and each seller gets one email covering their own items. Addresses resolve in a
single getUserEmails query rather than one round trip per seller, and the sends
run through allSettled so one unreachable seller cannot cost the buyer their
receipt.

Claude-Session: https://claude.ai/code/session_01EA1cFgzhNomjwRV3WTg2fj"
```

---

# Stage 3 — Better Auth email

## Task 6: The two auth templates

**Files:**
- Create: `components/email/password-reset.tsx`
- Create: `components/email/verify-email.tsx`
- Modify: `app/dev/emails/[template]/fixtures.tsx`

**Interfaces:**
- Consumes: `EmailLayout` from `@/components/email/layout`.
- Produces:
  - `passwordResetSubject(): string`, `PasswordResetEmail({ url, name }: { url: string; name: string })`
  - `verifyEmailSubject(): string`, `VerifyEmail({ url, name }: { url: string; name: string })`

- [ ] **Step 1: Create `components/email/password-reset.tsx`**

```tsx
import { Button, Link, Section, Text } from '@react-email/components'

import { EmailLayout } from './layout'

export type PasswordResetEmailProps = {
  url: string
  name: string
}

export function passwordResetSubject(): string {
  return 'Reset your Creator Commerce password'
}

/**
 * The recovery path for a forgotten password.
 *
 * `url` is Better Auth's own, handed to the hook verbatim — it points at
 * /api/auth/reset-password/<token>, which validates before redirecting to the
 * form. Building a url against our own page here would skip that validation and
 * hand an unchecked token to a client component.
 *
 * The expiry is stated because the token really does expire in an hour
 * (resetPasswordTokenExpiresIn's default) and a link that silently stops working
 * reads as a broken app rather than an expired token.
 *
 * The "ignore this" line is the whole security story for an unrequested reset:
 * nothing changes until someone follows the link, so doing nothing is genuinely
 * sufficient and saying so stops a recipient hunting for a button that would
 * "cancel" it.
 */
export function PasswordResetEmail({ url, name }: PasswordResetEmailProps) {
  return (
    <EmailLayout preview="Reset your password">
      <Text className="m-0 text-[20px] font-bold">Reset your password</Text>
      <Text className="mb-[24px] mt-[8px] text-[14px] text-muted-foreground">
        Hi {name}, someone asked to reset the password on your Creator Commerce
        account. This link works for one hour.
      </Text>

      <Section>
        <Button
          href={url}
          className="rounded bg-primary px-[20px] py-[12px] text-[14px] font-medium text-primary-foreground"
        >
          Choose a new password
        </Button>
      </Section>

      <Text className="mt-[24px] text-[12px] text-muted-foreground">
        If you didn&apos;t ask for this, you can ignore this email — nothing
        changes until the link above is used.
      </Text>

      <Text className="m-0 text-[12px] text-muted-foreground">
        Or paste this into your browser:{' '}
        <Link href={url} className="text-muted-foreground underline">
          {url}
        </Link>
      </Text>
    </EmailLayout>
  )
}
```

- [ ] **Step 2: Create `components/email/verify-email.tsx`**

```tsx
import { Button, Link, Section, Text } from '@react-email/components'

import { EmailLayout } from './layout'

export type VerifyEmailProps = {
  url: string
  name: string
}

export function verifyEmailSubject(): string {
  return 'Confirm your email address'
}

/**
 * Sent on signup, and again whenever someone asks for it from /verify-email.
 *
 * Short on purpose. Verification is not enforced — an unverified account signs
 * in, buys and sells exactly like a verified one — so this asks rather than
 * warns, and promises nothing about what confirming unlocks.
 */
export function VerifyEmail({ url, name }: VerifyEmailProps) {
  return (
    <EmailLayout preview="Confirm your email address">
      <Text className="m-0 text-[20px] font-bold">Confirm your email</Text>
      <Text className="mb-[24px] mt-[8px] text-[14px] text-muted-foreground">
        Hi {name}, confirm this address so we can reach you about your sales and
        purchases.
      </Text>

      <Section>
        <Button
          href={url}
          className="rounded bg-primary px-[20px] py-[12px] text-[14px] font-medium text-primary-foreground"
        >
          Confirm email address
        </Button>
      </Section>

      <Text className="mt-[24px] m-0 text-[12px] text-muted-foreground">
        Or paste this into your browser:{' '}
        <Link href={url} className="text-muted-foreground underline">
          {url}
        </Link>
      </Text>
    </EmailLayout>
  )
}
```

- [ ] **Step 3: Register both fixtures**

Add to the imports in `app/dev/emails/[template]/fixtures.tsx`:

```tsx
import {
  PasswordResetEmail,
  passwordResetSubject,
} from '@/components/email/password-reset'
import { VerifyEmail, verifyEmailSubject } from '@/components/email/verify-email'
```

and two entries to `TEMPLATES`:

```tsx
  'password-reset': {
    subject: passwordResetSubject(),
    element: (
      <PasswordResetEmail
        name="Gabi"
        url={`${APP_URL}/api/auth/reset-password/dGhpcy1pcy1hLWZha2UtdG9rZW4?callbackURL=%2Freset-password`}
      />
    ),
  },
  'verify-email': {
    subject: verifyEmailSubject(),
    element: (
      <VerifyEmail
        name="Gabi"
        url={`${APP_URL}/api/auth/verify-email?token=dGhpcy1pcy1hLWZha2UtdG9rZW4&callbackURL=%2Fverify-email`}
      />
    ),
  },
```

The fixture urls are the real shapes Better Auth produces, with a fake token —
long enough to prove the paste-this line wraps without breaking the layout.

- [ ] **Step 4: Verify both render**

Ask Gabi to run `npm run dev`, then check `http://localhost:3000/dev/emails` now
lists five entries, and that `/dev/emails/password-reset` and
`/dev/emails/verify-email` each render a heading, a button, and a wrapped url
that does not overflow the 560px container.

- [ ] **Step 5: Lint**

Run:
```bash
npm run lint && npx tsc --noEmit
```
Expected: both clean.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(email): password reset and verification templates

Both take Better Auth's own url as a prop and render it verbatim — it points at
the API endpoint that validates the token before redirecting to a view, so
building a url against our own pages here would hand an unchecked token to a
client component.

Claude-Session: https://claude.ai/code/session_01EA1cFgzhNomjwRV3WTg2fj"
```

---

## Task 7: Wire Better Auth's email hooks

**Files:**
- Create: `lib/server/email/auth.tsx`
- Modify: `lib/server/auth.ts`

**Interfaces:**
- Consumes: `scheduleBackgroundTask` from `@/lib/server/request/background`; the two templates from Task 6.
- Produces:
  - `sendPasswordResetEmail(data: { user: { name: string; email: string }; url: string }): Promise<void>`
  - `sendEmailVerification(data: { user: { name: string; email: string }; url: string }): Promise<void>`

- [ ] **Step 1: Create `lib/server/email/auth.tsx`**

```tsx
import 'server-only'

import {
  PasswordResetEmail,
  passwordResetSubject,
} from '@/components/email/password-reset'
import { VerifyEmail, verifyEmailSubject } from '@/components/email/verify-email'
import { sendEmail } from './send'

/**
 * The two mails Better Auth asks for.
 *
 * Plain awaited composers with no scheduling of their own: Better Auth decides
 * when these run, and advanced.backgroundTasks.handler is where after() is
 * attached. Putting after() here as well would schedule inside a scheduled task.
 *
 * The `user` parameter is deliberately structural rather than Better Auth's User
 * type. These need a name and an address; typing them to the full user would
 * couple two email templates to the auth schema for nothing.
 */
type AuthEmailUser = { name: string; email: string }

export async function sendPasswordResetEmail(data: {
  user: AuthEmailUser
  url: string
}): Promise<void> {
  await sendEmail({
    to: data.user.email,
    subject: passwordResetSubject(),
    react: <PasswordResetEmail url={data.url} name={data.user.name} />,
  })
}

export async function sendEmailVerification(data: {
  user: AuthEmailUser
  url: string
}): Promise<void> {
  await sendEmail({
    to: data.user.email,
    subject: verifyEmailSubject(),
    react: <VerifyEmail url={data.url} name={data.user.name} />,
  })
}
```

Named `sendEmailVerification`, not `sendVerificationEmail`, so it does not read
as a recursive reference to the Better Auth config key of that name.

- [ ] **Step 2: Rewrite `lib/server/auth.ts`**

```ts
import 'server-only';

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';

import db from '@/lib/server/db';
import * as authSchema from '@/lib/server/db/schemas/auth';
import {
  sendEmailVerification,
  sendPasswordResetEmail,
} from '@/lib/server/email/auth';
import { scheduleBackgroundTask } from '@/lib/server/request/background';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: authSchema,
  }),
  advanced: {
    // Better Auth awaits its email hooks inline unless a handler is set, so
    // without this every signup and reset request blocks on the SMTP handshake.
    // after() is the handler because it also holds a serverless invocation open
    // past the response, which a bare un-awaited promise would not.
    //
    // Deliberately not omitted in order to surface send failures to the user:
    // runInBackgroundOrAwait try/catches around both of its branches, so these
    // endpoints answer status: true whether or not the mail left. Awaiting would
    // buy latency and an SMTP-duration timing signal on forgot-password, and no
    // error reporting at all. /send-verification-email is the exception — it
    // awaits and rethrows on its own, which is why the resend button on
    // /verify-email can report a real failure.
    backgroundTasks: { handler: scheduleBackgroundTask },
  },
  emailAndPassword: {
    enabled: true,
    // requireEmailVerification is deliberately unset. Every existing row has
    // emailVerified: false, so turning the gate on locks out every account; the
    // banner in DashboardShell is the nudge until that is dealt with.
    sendResetPassword: ({ user, url }) => sendPasswordResetEmail({ user, url }),
  },
  emailVerification: {
    sendOnSignUp: true,
    // Clicking a link in your own inbox mints a session, which is what a magic
    // link is. The token is single-use and expires in an hour, and the
    // alternative is bouncing a just-verified user to /login to retype a
    // password that whoever holds that inbox could reset anyway.
    autoSignInAfterVerification: true,
    sendVerificationEmail: ({ user, url }) =>
      sendEmailVerification({ user, url }),
  },
  user: {
    additionalFields: {
      handle: { type: 'string', required: true, unique: true, input: true },
      // Shown on the storefront. Optional — an account is usable without one.
      bio: { type: 'string', required: false, input: true },
    },
  },
  // nextCookies must be the last plugin: it lets server actions set
  // auth cookies via next/headers.
  plugins: [nextCookies()],
});
```

This file uses semicolons and single quotes. Keep them.

- [ ] **Step 3: Verify no schema drift**

Ask Gabi to run:
```bash
npm run schema:better-auth
git diff --stat lib/server/db/schemas/auth.ts
```
Expected: no diff. Nothing in this task touches `user.additionalFields`, so the
generated schema is unchanged and no migration is needed. A diff here means
something was added to `additionalFields` by mistake — revert it.

- [ ] **Step 4: Verify signup sends a verification mail**

Ask Gabi to run `npm run dev` and sign up a new account.

Expected in the server console: one `[email]` block, subject `Confirm your email
address`, to the address just registered, containing a
`/api/auth/verify-email?token=...` url.

Expected in the browser: the signup completes and redirects normally. It must
**not** wait on the send — the redirect happens first, the log line appears
after.

- [ ] **Step 5: Verify the link actually verifies**

Copy the `/api/auth/verify-email?token=...` url from the console into the
browser.

Expected: it redirects to `/verify-email` (which 404s until Task 9 — that is
fine and expected at this point) and the session is now verified. Confirm with:

```bash
psql "$DATABASE_URL" -c 'select email, email_verified from "user" order by created_at desc limit 1;'
```
Expected: `email_verified` is `t`.

If `psql` is not set up, Task 9's banner is the visual confirmation — note it
and move on.

- [ ] **Step 6: Lint and build**

Run:
```bash
npm run lint && npx tsc --noEmit
```
Expected: both clean.

Then note in your report that `npm run build` is still owed — Gabi runs it.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(auth): wire Better Auth password reset and verification email

sendResetPassword and sendVerificationEmail now have handlers, and
advanced.backgroundTasks.handler routes every Better Auth background task
through after() — without it Better Auth awaits these inline and each signup
blocks on the SMTP handshake.

Verification is soft: sendOnSignUp with requireEmailVerification left unset, so
existing unverified accounts keep working. autoSignInAfterVerification is on
because a link in your own inbox is already a credential for that account.

Claude-Session: https://claude.ai/code/session_01EA1cFgzhNomjwRV3WTg2fj"
```

---

## Task 8: The password reset views

**Files:**
- Modify: `lib/schemas/auth.ts`
- Modify: `app/(auth)/signup/signup-form.tsx:84`
- Create: `app/(auth)/forgot-password/page.tsx`
- Create: `app/(auth)/forgot-password/forgot-password-form.tsx`
- Create: `app/(auth)/reset-password/page.tsx`
- Create: `app/(auth)/reset-password/reset-password-form.tsx`
- Modify: `app/(auth)/login/login-form.tsx:64-66`

**Interfaces:**
- Consumes: `authClient` from `@/lib/client/auth`; `CardContent`, `CardDescription`, `CardHeader`, `CardTitle` from `@/components/ui/card`; `Button`, `Input`, `Label`.
- Produces: `PASSWORD_MIN_LENGTH: number` from `@/lib/schemas/auth`.

- [ ] **Step 1: Add `PASSWORD_MIN_LENGTH` to `lib/schemas/auth.ts`**

Below `DEFAULT_POST_AUTH_PATH`:

```ts
/**
 * Better Auth's minPasswordLength default. Both password forms read it so the
 * browser's own validation and the server agree, and so changing that option
 * has one place to follow.
 */
export const PASSWORD_MIN_LENGTH = 8
```

A constant rather than a zod schema: both auth forms are uncontrolled and
validate natively, with no resolver anywhere, so a schema would never be reached
by the validation that actually gates submission.

- [ ] **Step 2: Use it in `app/(auth)/signup/signup-form.tsx`**

Extend the existing import:

```tsx
import { authPathWithNext, PASSWORD_MIN_LENGTH } from "@/lib/schemas/auth"
```

and replace the hardcoded attribute on the password input:

```tsx
            minLength={PASSWORD_MIN_LENGTH}
```

- [ ] **Step 3: Create `app/(auth)/forgot-password/page.tsx`**

```tsx
import type { Metadata } from "next"

import {
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { ForgotPasswordForm } from "./forgot-password-form"

export const metadata: Metadata = {
  title: "Reset your password",
}

export default function ForgotPasswordPage() {
  return (
    <>
      <CardHeader>
        <CardTitle className="text-xl">Reset your password</CardTitle>
        <CardDescription>
          We&apos;ll email you a link to choose a new one.
        </CardDescription>
      </CardHeader>
      <ForgotPasswordForm />
    </>
  )
}
```

No `next` param: a password reset ends at `/login` regardless of where the user
started, because the link is followed from an inbox in a possibly different
browser.

- [ ] **Step 4: Create `app/(auth)/forgot-password/forgot-password-form.tsx`**

```tsx
"use client"

import { useState } from "react"
import Link from "next/link"

import { authClient } from "@/lib/client/auth"
import { Button } from "@/components/ui/button"
import { CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * One outcome, always.
 *
 * Better Auth spends a dummy token generation and a dummy verification lookup on
 * an unknown address specifically so the response cannot be timed apart from a
 * known one. Branching the UI on that response would hand back the enumeration
 * signal it just paid to suppress — so the confirmation below is rendered on
 * success and on failure alike, and the only errors surfaced are the ones that
 * are not about whether the account exists.
 */
export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    setPending(true)

    await authClient.requestPasswordReset({
      email: String(formData.get("email")),
      redirectTo: "/reset-password",
    })

    setPending(false)
    setSent(true)
  }

  if (sent) {
    return (
      <CardContent className="flex flex-col gap-3.5">
        <p className="text-sm text-muted-foreground">
          If that email is registered, a reset link is on its way. The link works
          for one hour.
        </p>
        <Button
          variant="outline"
          className="w-full"
          nativeButton={false}
          render={<Link href="/login" />}
        >
          Back to sign in
        </Button>
      </CardContent>
    )
  }

  return (
    <form onSubmit={onSubmit}>
      <CardContent className="flex flex-col gap-3.5">
        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </div>
        <Button type="submit" className="mt-1 w-full" disabled={pending}>
          {pending ? "Sending…" : "Send reset link"}
        </Button>
        <p className="mt-1.5 text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </form>
  )
}
```

The `nativeButton={false} render={<Link />}` pattern is how this codebase renders
a Button as a link — see `dashboard-shell.tsx`'s "View storefront" button.

- [ ] **Step 5: Create `app/(auth)/reset-password/page.tsx`**

```tsx
import type { Metadata } from "next"
import Link from "next/link"

import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

import { ResetPasswordForm } from "./reset-password-form"

export const metadata: Metadata = {
  title: "Choose a new password",
}

/**
 * Reached from the email, by way of Better Auth.
 *
 * The emailed link points at /api/auth/reset-password/<token>, which validates
 * the token and only then redirects here with ?token=, or with
 * ?error=INVALID_TOKEN when it is expired or forged. So the token this page
 * receives has already been checked, and an error here is an ordinary outcome —
 * mail sits in inboxes for days — rather than something to throw over.
 */
export default async function ResetPasswordPage({
  searchParams,
}: PageProps<"/reset-password">) {
  const params = await searchParams
  const token = typeof params.token === "string" ? params.token : null

  if (!token) {
    return (
      <>
        <CardHeader>
          <CardTitle className="text-xl">This link has expired</CardTitle>
          <CardDescription>
            Reset links work for one hour. Ask for a fresh one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            nativeButton={false}
            render={<Link href="/forgot-password" />}
          >
            Send a new link
          </Button>
        </CardContent>
      </>
    )
  }

  return (
    <>
      <CardHeader>
        <CardTitle className="text-xl">Choose a new password</CardTitle>
        <CardDescription>
          You&apos;ll sign in with this from now on.
        </CardDescription>
      </CardHeader>
      <ResetPasswordForm token={token} />
    </>
  )
}
```

A missing token and an `?error=INVALID_TOKEN` are the same screen, so the page
branches on the token alone — `error` needs no separate read.

- [ ] **Step 6: Create `app/(auth)/reset-password/reset-password-form.tsx`**

```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { authClient } from "@/lib/client/auth"
import { PASSWORD_MIN_LENGTH } from "@/lib/schemas/auth"
import { Button } from "@/components/ui/button"
import { CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * The token arrives already validated by Better Auth's endpoint — this form
 * spends it, it does not check it.
 *
 * No auto sign-in afterwards, unlike email verification: that token confirms an
 * address, this one changes a credential, and the two do not deserve the same
 * trust. Better Auth does not sign the user in here either.
 */
export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const password = String(formData.get("password"))

    if (password !== String(formData.get("confirm"))) {
      setError("Those passwords don't match.")
      return
    }

    setPending(true)
    setError(null)

    const { error } = await authClient.resetPassword({
      newPassword: password,
      token,
    })

    if (error) {
      setError(error.message ?? "Could not reset your password. Please try again.")
      setPending(false)
      return
    }

    router.push("/login")
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit}>
      <CardContent className="flex flex-col gap-3.5">
        <div className="grid gap-1.5">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={PASSWORD_MIN_LENGTH}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="confirm">Confirm new password</Label>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            minLength={PASSWORD_MIN_LENGTH}
            required
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="mt-1 w-full" disabled={pending}>
          {pending ? "Saving…" : "Save new password"}
        </Button>
      </CardContent>
    </form>
  )
}
```

- [ ] **Step 7: Wire the login form's dead link**

In `app/(auth)/login/login-form.tsx`, replace:

```tsx
            <a href="#" className="text-[13px] text-primary hover:underline">
              Forgot?
            </a>
```

with:

```tsx
            <Link
              href="/forgot-password"
              className="text-[13px] text-primary hover:underline"
            >
              Forgot?
            </Link>
```

`Link` is already imported in that file.

- [ ] **Step 8: Verify the whole reset flow**

Ask Gabi to run `npm run dev`, then:

1. `/login` — the "Forgot?" link goes to `/forgot-password`, not `#`.
2. Submit a **registered** address. The page shows "If that email is registered,
   a reset link is on its way." The console logs one `[email]` block with
   subject `Reset your Creator Commerce password`.
3. Submit an **unregistered** address. Identical screen. Console logs **no**
   `[email]` block. Both responses come back promptly — the send is scheduled,
   not awaited.
4. Copy the `/api/auth/reset-password/...` url from the console into the
   browser. It lands on `/reset-password?token=...` with the form.
5. Enter a 4-character password. The browser blocks submission on `minLength`.
6. Enter two different 8+ character passwords. The form shows "Those passwords
   don't match." and does not submit.
7. Enter matching valid passwords. It redirects to `/login`, and signing in with
   the new password works.
8. Reload the same `/reset-password?token=...` url. The token is spent, so
   submitting shows Better Auth's error rather than succeeding twice.
9. Visit `/reset-password` with no query at all. The expired-link screen renders
   with a "Send a new link" button.

- [ ] **Step 9: Lint and build**

Run:
```bash
npm run lint && npx tsc --noEmit
```
Expected: both clean.

Then note in your report that `npm run build` is still owed — Gabi runs it.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(auth): password reset views

/forgot-password renders one outcome whether or not the address exists — Better
Auth pays for that timing parity with a dummy lookup, and branching the UI would
hand the enumeration signal straight back.

/reset-password receives a token Better Auth's endpoint has already validated,
so a missing or rejected token is the same ordinary expired-link screen. No auto
sign-in: this token changes a credential rather than confirming an address.

Wires the login form's Forgot link, which was href=#.

Claude-Session: https://claude.ai/code/session_01EA1cFgzhNomjwRV3WTg2fj"
```

---

## Task 9: The verification view and the banner

**Files:**
- Create: `app/(auth)/verify-email/page.tsx`
- Create: `app/(auth)/verify-email/verify-email-view.tsx`
- Create: `components/layouts/verify-email-banner.tsx`
- Modify: `components/layouts/dashboard-shell.tsx`
- Modify: `CLAUDE.md`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: `getUser` from `@/lib/server/request/session`; `authClient` from `@/lib/client/auth`.
- Produces: `VerifyEmailBanner()` from `@/components/layouts/verify-email-banner`.

- [ ] **Step 1: Create `app/(auth)/verify-email/page.tsx`**

```tsx
import type { Metadata } from "next"

import { getUser } from "@/lib/server/request/session"

import { VerifyEmailView } from "./verify-email-view"

export const metadata: Metadata = {
  title: "Confirm your email",
}

/**
 * One page for both arrivals: the emailed link, and the banner.
 *
 * They are told apart without a marker in the url, because the session already
 * answers it. autoSignInAfterVerification means whoever followed the link is
 * signed in by the time this renders, with emailVerified true — so a verified
 * session *is* the success state.
 *
 * getUser rather than requireUser: someone can land here signed out, from a link
 * opened in another browser, and bouncing them to /login would strand a
 * perfectly good token outcome behind a password prompt.
 */
export default async function VerifyEmailPage({
  searchParams,
}: PageProps<"/verify-email">) {
  const params = await searchParams
  const failed = typeof params.error === "string"
  const user = await getUser()

  return (
    <VerifyEmailView
      failed={failed}
      verified={user?.emailVerified ?? false}
      email={user?.email ?? null}
    />
  )
}
```

- [ ] **Step 2: Create `app/(auth)/verify-email/verify-email-view.tsx`**

```tsx
"use client"

import { useState } from "react"
import Link from "next/link"

import { authClient } from "@/lib/client/auth"
import { Button } from "@/components/ui/button"
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * Four states, derived rather than signalled:
 *
 *   failed              → the link expired; offer a fresh one
 *   verified            → done
 *   signed in, unverified → we sent one; offer a resend
 *   signed out          → offer a resend, but ask which address
 *
 * The resend is the one place in this whole surface where a send failure can be
 * reported. /send-verification-email awaits its hook and rethrows, unlike the
 * signup and reset paths, which swallow inside runInBackgroundOrAwait and answer
 * status: true regardless. So this button says what actually happened, and no
 * other view claims a send succeeded.
 */
export function VerifyEmailView({
  failed,
  verified,
  email,
}: {
  failed: boolean
  verified: boolean
  email: string | null
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resent, setResent] = useState(false)

  async function resend(address: string) {
    setPending(true)
    setError(null)

    const { error } = await authClient.sendVerificationEmail({
      email: address,
      callbackURL: "/verify-email",
    })

    setPending(false)

    if (error) {
      setError(error.message ?? "Could not send the email. Please try again.")
      return
    }

    setResent(true)
  }

  if (verified && !failed) {
    return (
      <>
        <CardHeader>
          <CardTitle className="text-xl">Email confirmed</CardTitle>
          <CardDescription>
            Thanks — that address is verified.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            nativeButton={false}
            render={<Link href="/dashboard" />}
          >
            Go to your dashboard
          </Button>
        </CardContent>
      </>
    )
  }

  const title = failed ? "This link has expired" : "Confirm your email"
  const description = failed
    ? "Confirmation links work for one hour. We can send another."
    : email
      ? `We sent a link to ${email}.`
      : "Enter your email and we'll send a new link."

  return (
    <>
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3.5">
        {resent && (
          <p className="text-sm text-muted-foreground">
            Sent. Check your inbox.
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}

        {email ? (
          <Button
            className="w-full"
            disabled={pending || resent}
            onClick={() => resend(email)}
          >
            {pending ? "Sending…" : "Resend the link"}
          </Button>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              const formData = new FormData(event.currentTarget)
              void resend(String(formData.get("email")))
            }}
            className="flex flex-col gap-3.5"
          >
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Sending…" : "Send a new link"}
            </Button>
          </form>
        )}

        <p className="mt-1.5 text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </>
  )
}
```

- [ ] **Step 3: Create `components/layouts/verify-email-banner.tsx`**

```tsx
import Link from "next/link"
import { MailWarning } from "lucide-react"

/**
 * The whole enforcement mechanism for email verification.
 *
 * requireEmailVerification is off, so nothing blocks an unverified seller —
 * this is the only thing that asks. Not dismissible on purpose: a dismissal
 * needs somewhere to live, and a nudge you cannot clear is what makes it a
 * nudge rather than a toast. It disappears when emailVerified flips, which is
 * the only way it should.
 */
export function VerifyEmailBanner() {
  return (
    <div className="flex items-center gap-2.5 border-b bg-muted px-4 py-2.5 text-[13px]">
      <MailWarning className="size-4 shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground">
        Confirm your email address so we can reach you about your sales.
      </span>
      <Link
        href="/verify-email"
        className="font-medium text-primary hover:underline"
      >
        Confirm now
      </Link>
    </div>
  )
}
```

- [ ] **Step 4: Render it in `components/layouts/dashboard-shell.tsx`**

Add the import:

```tsx
import { VerifyEmailBanner } from "@/components/layouts/verify-email-banner"
```

and render it inside `SidebarInset`, between the `</header>` and the `<main>`:

```tsx
        </header>
        {!user.emailVerified && <VerifyEmailBanner />}
        <main className="flex-1 overflow-auto">{children}</main>
```

`user` is already resolved by the `requireUser()` at the top of the component, so
this costs no extra query.

- [ ] **Step 5: Verify the four states**

Ask Gabi to run `npm run dev`, then:

1. Sign up a fresh account. The banner appears on `/dashboard` and every other
   signed-in page.
2. Click "Confirm now" → `/verify-email` shows "We sent a link to
   <that address>" and a "Resend the link" button.
3. Click Resend. The console logs a second `Confirm your email address` block,
   and the page shows "Sent. Check your inbox."
4. Follow a `/api/auth/verify-email?token=...` url from the console. It lands on
   `/verify-email` showing "Email confirmed", and the banner is gone from
   `/dashboard`.
5. Visit `/verify-email?error=token_expired` while signed in and verified. It
   shows the expired-link screen, not the success screen — `failed` wins.
6. Sign out, visit `/verify-email`. It shows the email field rather than
   redirecting to `/login`.

- [ ] **Step 6: Verify the resend reports a real failure**

Ask Gabi to put deliberately invalid Gmail credentials in `.env`:

```
SMTP_USER=notreal@gmail.com
SMTP_PASS=definitelynotanapppassword
```

restart `npm run dev`, sign in as an unverified account, and click Resend on
`/verify-email`.

Expected: the page shows a red error message rather than "Sent. Check your
inbox." This is the behaviour that distinguishes this path from the signup and
reset ones, which swallow.

Then ask Gabi to remove both variables again and restart, so the console
transport comes back.

- [ ] **Step 7: Verify an unverified account is not blocked**

Sign in as an account whose `emailVerified` is false. Confirm it can reach
`/dashboard`, `/products/new`, and complete a purchase. The banner is present
throughout and nothing is gated behind it.

- [ ] **Step 8: Update CLAUDE.md**

In the Email section, after the seller-notification paragraph added in Task 5,
insert:

```markdown
Better Auth's own mail — password reset and email verification — is composed in
`lib/server/email/auth.tsx` and wired in `lib/server/auth.ts`. Those hooks are
plain awaited functions; `advanced.backgroundTasks.handler` is what keeps them
off the response path, and without it Better Auth awaits them inline. Note that
`runInBackgroundOrAwait` swallows send failures in both of its branches, so the
reset and signup endpoints answer `status: true` regardless — only
`/send-verification-email` awaits and rethrows, which is why the resend button
on `/verify-email` is the one place a send failure is reported to the user.

Verification is soft: `sendOnSignUp` is on, `requireEmailVerification` is not
set, and the banner in `DashboardShell` is the only thing that asks. Turning the
gate on would lock out every existing row, all of which have
`emailVerified: false`.
```

- [ ] **Step 9: Record the follow-ups in TODO.md**

Append a section:

```markdown
## Email

- **Settings notification preferences are a mockup.** The toggles on
  `/settings` are a hardcoded `NOTIFICATIONS` array with no persistence.
  Honouring them means a column, a migration, an action, and a check inside
  `sendOrderEmails`. Transactional mail currently sends unconditionally.

- **`requireEmailVerification` is off.** Every existing row has
  `emailVerified: false`, so turning it on locks out every account. It needs a
  backfill or a grace period first. The banner is the only nudge until then.

- **Email change from Settings is unwired.** Better Auth's `changeEmail` and
  `sendChangeEmailVerification` are untouched. Now cheap — the handler and the
  template pattern both exist.

- **Still no outbox.** A send that fails is logged and lost. Retries, and a
  record of what was sent, remain the fix.
```

- [ ] **Step 10: Lint and build**

Run:
```bash
npm run lint && npx tsc --noEmit
```
Expected: both clean.

Then note in your report that `npm run build` is still owed — Gabi runs it.

- [ ] **Step 11: Final boundary check**

Run:
```bash
grep -rn "next/headers\|next/navigation\|next/cache\|next/server" lib/server --exclude-dir=request
```
Expected: exactly one hit, the prose comment in `lib/server/auth.ts:26`.

Run:
```bash
grep -rn "from 'next/server'" lib
```
Expected: exactly one hit, the `after` import in
`lib/server/request/background.ts`.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat(auth): verification view and unverified banner

/verify-email serves both arrivals from one page, deriving its state from the
session rather than a marker in the url — autoSignInAfterVerification means a
link-follower is signed in and verified by the time it renders, so a verified
session is the success state.

The resend button reports real send failures, because
/send-verification-email awaits and rethrows where the signup and reset paths
swallow. The banner in DashboardShell is the only thing asking an unverified
seller to confirm; nothing is gated behind it.

Claude-Session: https://claude.ai/code/session_01EA1cFgzhNomjwRV3WTg2fj"
```

---

## Final verification

Run once the last task is committed. This is the spec's own Verification section.

- [ ] `npm run lint` and `npm run build` both pass (Gabi runs these).
- [ ] `grep -rn "next/headers\|next/navigation\|next/cache\|next/server" lib/server --exclude-dir=request` returns only the `auth.ts:26` prose comment.
- [ ] `/dev/emails` lists five templates; each renders; `?send=` on each logs a complete message with no credentials in the output.
- [ ] A checkout of two products from two different sellers produces three console messages: one receipt, two seller mails, each listing only that seller's item.
- [ ] A checkout of two products from one seller produces two messages, and the seller's subject reads "You made 2 sales".
- [ ] `/forgot-password` with a real address logs a reset mail; with an unknown address it renders the identical confirmation and logs nothing.
- [ ] The reset link lands on `/reset-password` with a token; a new password is accepted and signs in at `/login`. `/reset-password` with no token renders the expiry message.
- [ ] A fresh signup logs a verification mail and shows the banner. Clicking the link clears the banner and leaves the user signed in.
- [ ] Resend on `/verify-email` logs a second mail; with invalid SMTP credentials it surfaces an error rather than a success message.
- [ ] An existing unverified account still signs in, sells, and buys.
- [ ] `npm run schema:better-auth` produces no diff.
