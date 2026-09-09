# Seller sale notifications, Better Auth email, and a request-scope boundary

Date: 2026-09-09

## Problem

The transactional email layer built on 2026-09-07 has exactly one caller. The
buyer receipt goes out on a fulfilled checkout and nothing else in the app ever
sends mail.

Two gaps follow from that:

**Sellers learn nothing.** A sale promotes purchase rows and updates `/sales`,
which a seller sees only if they happen to load the page. The party the platform
most wants to retain gets no signal at all.

**Better Auth has no email hooks.** `lib/server/auth.ts` configures
`emailAndPassword: { enabled: true }` and stops there. There is no
`sendResetPassword`, so the login form's "Forgot?" link is `href="#"` and a user
who forgets their password has no recovery path whatsoever. There is no
`sendVerificationEmail` either: the `user.emailVerified` column exists, is
`false` on every row, and nothing reads or writes it.

A third problem surfaces once mail is scheduled from more than one place. The
receipt is currently dispatched as a bare un-awaited promise with a `.catch`,
and `lib/server/checkout.ts` carries a long comment admitting the flaw — a
serverless runtime may tear the invocation down before the promise settles, and
`next/server`'s `after()` is named there as the fix that was not applied.
Applying it now raises a question the codebase has no answer for: which modules
under `lib/server/` are allowed to call request-scoped APIs at all.

## Scope

- Seller sale notification: one email per seller per order.
- Better Auth password reset, with `/forgot-password` and `/reset-password`.
- Better Auth email verification, soft — sent on signup, nudged by a banner,
  never blocking sign-in — with `/verify-email`.
- A formal `lib/server/request/` boundary, and the moves that make it absolute.
- `after()` replacing the un-awaited receipt promise.
- The dev preview route generalised from one hardcoded template to a registry.

Out of scope:

- **The Settings page notification toggles.** They are a static mockup — a
  hardcoded `NOTIFICATIONS` array with no persistence. Real preferences need a
  column, a migration, an action, and a check inside the send path. Transactional
  mail sends unconditionally. Separate spec.
- **`requireEmailVerification: true`.** Every existing row has
  `emailVerified: false`, so flipping it locks out every account. The plumbing
  lands here; the gate is one flag away when the data is ready.
- **An outbox with retries.** Still the right fix for delivery guarantees, still
  recorded in TODO.md.
- **Email change from Settings.** Better Auth's `changeEmail` and
  `sendChangeEmailVerification` are untouched.

## Decisions

### `lib/server/request/` is where request-scoped code lives

`after()` throws when called outside a request scope
(`node_modules/next/dist/server/after/after.js:16` — `` `after` was called
outside a request scope ``). So does `headers()`, `cookies()`, and
`revalidatePath()`. A module that calls one is no longer callable from a script,
a cron, or a test harness, and nothing in the tree currently says which modules
those are.

The new rule, stated the way CLAUDE.md states the `server-only` / `client-only`
markers:

> `lib/server/request/` is the only place under `lib/server/` that may import
> `next/headers`, `next/navigation`, `next/cache`, or `next/server`. Its modules
> are callable only from a route handler, a server action, or a server
> component. Everything else under `lib/server/` is request-agnostic and
> script-callable.

The rule is grep-enforceable, which is the point — a boundary you can check
rather than a convention you remember:

```
grep -rn "next/headers\|next/navigation\|next/cache\|next/server" lib/server \
  --exclude-dir=request
```

`lib/actions/*` is unaffected. Server actions are already their own documented
category in CLAUDE.md and `revalidatePath` / `redirect` are exactly what they
exist to do.

### The sweep is all three existing modules, not just `session.ts`

Three modules under `lib/server/` violate the rule today:

| Module | Uses | Importers |
| --- | --- | --- |
| `session.ts` | `headers()`, `redirect()` | 18 files |
| `cart.ts` | `cookies()`, `revalidatePath()` | 7 files |
| `revalidate.ts` | `revalidatePath()` | 1 file |

All three move. Leaving two behind would make the rule "`request/`, and also
three other places," which is not a rule. The cost is 26 mechanical import-path
edits and no logic change.

### `handleStripeWebhook` moves out of `checkout.ts`

Wrapping fulfilment in a helper that also schedules mail creates an import cycle
if the helper lives outside `checkout.ts` while `handleStripeWebhook` — a caller
of `fulfillCheckoutSession` — lives inside it.

Moving the webhook handler to `lib/server/request/stripe-webhook.ts` breaks the
cycle and is correct independently. It reads a raw request body, reads a
signature header, and returns `Response` objects with meaningful status codes.
That is request-layer work sitting in a module whose own docblock claims it does
none: *"Nothing here reads headers() or cookies() or redirects, which is what
makes it callable from the webhook."* After the move that sentence is true.

`lib/server/checkout.ts` is left holding `createCheckoutSession`,
`fulfillCheckoutSession`, and `isUniqueViolation` — pure Stripe and sequencing,
script-callable, no mail.

### One wrapper, not two call sites

`fulfillCheckoutSession` has two callers. Rather than duplicating the schedule
call at both, `lib/server/request/checkout.ts` exports `fulfillAndNotify`, which
awaits fulfilment, schedules the mail when rows were promoted, and returns the
promoted rows unchanged. Both callers switch to it.

This keeps `fulfillCheckoutSession` free of `after()` and therefore still
callable from a future reconciliation script — the reason the boundary exists.

### `after()` replaces the un-awaited promise

The existing dispatch is `sendReceiptEmail(promoted).catch(...)` with nothing
awaiting it. `after()` is the API designed for this: it defers work until the
response is sent and, on serverless platforms, extends the invocation via
`waitUntil` so the promise cannot be torn down mid-send. Both fulfilment callers
are route handlers, so request scope is guaranteed.

The long caveat paragraph in `checkout.ts` that ends *"next/server's after()
exists to hold the invocation open past the response and is the fix if that ever
proves to happen in practice — not applied here"* is deleted along with the
pattern it describes.

### Better Auth schedules its own mail through `backgroundTasks.handler`

Better Auth 1.6 exposes `advanced.backgroundTasks.handler`, documented in
`@better-auth/core/src/types/context.ts:445` as *"useful for operations like
sending emails where we want to avoid blocking the response."* `after` accepts a
promise directly (`after.d.ts`: `AfterTask<T> = Promise<T> | AfterCallback<T>`),
so wiring the two together is one line and covers every Better Auth background
task, present and future. Without a handler, `runInBackgroundOrAwait` awaits
inline and the response blocks on the SMTP handshake.

The alternative considered was omitting the handler so that a failed send could
be reported to the user. It cannot be, on these paths. `runInBackgroundOrAwait`
try/catches around **both** branches:

```js
async runInBackgroundOrAwait(promise) {
  try {
    if (options.advanced?.backgroundTasks?.handler) { /* ... */ }
    else await promise;
  } catch (e) {
    logger.error("Failed to run background task:", e);
  }
}
```

`better-auth/dist/context/create-context.mjs:214-224`. Password reset
(`password.mjs:82`), signup auto-send (`sign-up.mjs:246`), and sign-in
auto-send (`sign-in.mjs:318`) all route through it, and all return
`status: true` whether or not the mail left. Omitting the handler therefore buys
no error reporting — only latency, plus an SMTP-duration timing oracle on
`/forgot-password` that partly undoes the constant-time parity Better Auth
deliberately builds at `password.mjs:60-66`.

Where failure *is* reportable, it is reported. See the next decision.

### Resend is the path that surfaces errors, and it needs no configuration

`/send-verification-email` does not use `runInBackgroundOrAwait`. It calls
`sendVerificationEmailFn` with a bare `await`, so a throw propagates to the
client (`email-verification.mjs:121` for the signed-in branch; the signed-out
branch at `:110` catches, holds a 500ms constant-time floor, then rethrows at
`:115`). `backgroundTasks.handler` does not affect this path.

That is the path the `/verify-email` resend button hits, and its UI reports the
real error. It is the one place in the auth mail surface where "we sent it" can
be said truthfully, so it is the one place that says it.

No other view claims a send succeeded. `/forgot-password` renders *"If that
email exists, we've sent a link"* — required for enumeration safety regardless,
and it asserts nothing. Signup's auto-send is a convenience; the durable signal
is the verification banner, which stays up until `emailVerified` flips, so a
silently failed signup mail self-corrects the next time the user clicks Resend.

### Seller mail groups by seller, one email per seller per order

A cart is assembled from `/explore` and can hold products from several owners, so
one order's promoted rows may span N sellers. Rows are grouped by `sellerId` and
each seller gets one email listing their items and their subtotal.

One email per purchase row was rejected: a three-product order from one seller
would be three emails, and inbox noise matters most for the party you want to
retain.

### The seller email carries no buyer identity

No name, no email address, no id. A seller is told a sale happened, not who made
it. `/sales` is where that question belongs if it should ever be answerable, and
keeping it out of an email means a forwarded receipt leaks nothing.

Like the buyer receipt, the seller email reads only snapshot columns —
`productName`, `priceInCents` off the purchase row. No join back to `products`.
A seller who renames or reprices a product after a sale must not have the
notification for that sale rewritten.

### Verification is soft, and the banner is the nudge

`sendOnSignUp: true` sends on account creation. `requireEmailVerification` stays
`false`, so an unverified user signs in, sells, and buys exactly as today.

The nudge is a banner in `DashboardShell`, rendered when `!user.emailVerified`.
That component already resolves the user via `requireUser()`, so the flag is
free — no extra query. It is not dismissible: a dismissal needs storage, and a
soft nudge that cannot be cleared is what makes it a nudge.

`autoSignInAfterVerification: true`. Clicking a link in your own inbox mints a
session, which is what a magic link is; the token is single-use and expires in
an hour. The alternative — bouncing a just-verified user to `/login` to retype a
password — is worse for no security gained, since anyone holding that inbox can
reset the password anyway.

The reset token is treated differently. `resetPassword` does not sign the user
in, and this spec does not make it. That token gates a credential change rather
than confirming an address.

### `/verify-email` does double duty

Both entry points land on one page, which reads its state from the query string:

- From the emailed link, after Better Auth's `/api/auth/verify-email` consumed
  the token and redirected — success, or `?error=token_expired`.
- From the banner — "we sent a link to {email}", with the resend button.

The two are told apart without a marker in the url: on success the user is
already signed in and `emailVerified` is true, so the page reads the session
rather than a query param. Component 15 has the full state table.

One page rather than two views that differ only in copy.

## Architecture

```
                        app/api/auth/[...all]        app/checkout/return
                                 │                    app/api/stripe/webhook
                                 │                             │
                     ┌───────────┴───────────┐                 │
                     │  lib/server/auth.ts   │                 │
                     │  (config only)        │                 │
                     └───────────┬───────────┘                 │
                                 │                             │
        ┌────────────────────────┴─────────────────────────────┴──────────┐
        │                    lib/server/request/                          │
        │  background.ts   checkout.ts   stripe-webhook.ts                │
        │  session.ts      cart.ts       revalidate.ts                    │
        │  ── the only after()/headers()/cookies()/revalidatePath() ──    │
        └────────────────────────┬─────────────────────────────┬──────────┘
                                 │                             │
                     ┌───────────┴───────────┐     ┌───────────┴──────────┐
                     │  lib/server/email/    │     │  lib/server/         │
                     │  order.ts  auth.ts    │     │  checkout.ts (pure)  │
                     │  receipt.tsx  send.ts │     └───────────┬──────────┘
                     └───────────┬───────────┘                 │
                                 │                             │
                     ┌───────────┴─────────────────────────────┴──────────┐
                     │              lib/server/dal/                        │
                     └────────────────────────────────────────────────────┘
```

### Data flow: a paid order

1. Stripe's webhook or the buyer's return redirect calls `fulfillAndNotify`.
2. It awaits `fulfillCheckoutSession`, which promotes pending rows to `paid` and
   returns them. An empty array means the other entry point won the race.
3. Non-empty, it calls `scheduleEmail(() => sendOrderEmails(promoted), ...)`.
   `after()` defers the work past the response.
4. `sendOrderEmails` resolves the buyer's address from the first row, groups the
   remaining rows by `sellerId`, resolves every seller address in one query, and
   runs receipt plus N seller mails through `Promise.allSettled`.
5. Each rejection is logged with the order id. A seller with a dead address
   cannot cost the buyer their receipt, and vice versa.

### Data flow: password reset

1. `/forgot-password` posts to `authClient.requestPasswordReset({ email,
   redirectTo: '/reset-password' })`.
2. Better Auth looks the user up. Unknown email: dummy token generation, dummy
   verification lookup, `status: true`. Known email: it mints a token and calls
   `sendResetPassword` with `url =
   {baseURL}/api/auth/reset-password/{token}?callbackURL=/reset-password`.
3. The handler is scheduled through `backgroundTasks.handler` → `after`, so the
   response returns before the SMTP handshake.
4. The page renders "If that email exists, we've sent a link" in both cases.
5. The user clicks `data.url`, which hits Better Auth's endpoint. That endpoint
   validates the token and redirects to `/reset-password?token=VALID_TOKEN`, or
   to `/reset-password?error=INVALID_TOKEN` when it is expired or forged.
6. `/reset-password` with a token renders the new-password form and calls
   `authClient.resetPassword({ newPassword, token })`, then navigates to
   `/login`. With an error it renders "This link has expired" and a link back to
   `/forgot-password`.

The email carries Better Auth's `data.url` verbatim, never a url built against
our own page. The token has to be validated at Better Auth's endpoint first.

### Data flow: verification

1. Signup calls `sendVerificationEmail` with `url =
   {baseURL}/api/auth/verify-email?token={token}&callbackURL=/verify-email`,
   scheduled through the same handler.
2. The banner appears on every signed-in page until `emailVerified` is true.
3. Clicking the link consumes the token, flips `emailVerified`, signs the user
   in via `autoSignInAfterVerification`, and redirects to `/verify-email`.
4. Resend posts to `authClient.sendVerificationEmail({ email, callbackURL:
   '/verify-email' })`. That path awaits and rethrows, so the button reports a
   real failure rather than a fixed success message.

## Components

### 1. `lib/server/request/background.ts` (new)

The only module in the app that calls `after()`.

```ts
import 'server-only'
import { after } from 'next/server'

export function scheduleEmail(task: () => Promise<void>, context: string): void
export function scheduleBackgroundTask(promise: Promise<unknown>): void
```

`scheduleEmail` wraps the task in a try/catch that logs
`[email] {context} failed` and swallows, so a send failure can never surface as
an unhandled rejection or a 500. `context` is a caller-supplied label — the
order id, for the checkout path.

`scheduleBackgroundTask` is `after` itself, passed to Better Auth's
`advanced.backgroundTasks.handler`. No catch of its own: Better Auth already
`.catch`es and logs before calling the handler
(`create-context.mjs:216-218`), and a second one would just double the log line.

### 2. `lib/server/request/checkout.ts` (new)

```ts
export async function fulfillAndNotify(
  session: Pick<Stripe.Checkout.Session, 'id' | 'payment_intent'>,
): Promise<Purchase[]>
```

Awaits `fulfillCheckoutSession`, schedules `sendOrderEmails` when the promoted
array is non-empty, returns the promoted array. Nothing else.

### 3. `lib/server/request/stripe-webhook.ts` (new)

`handleStripeWebhook`, moved from `checkout.ts` unchanged except that its
fulfilment call becomes `fulfillAndNotify`. The signature-verification logic, the
status-code contract, and the surrounding docblock move with it.

### 4. `lib/server/request/session.ts`, `cart.ts`, `revalidate.ts` (moved)

Byte-identical moves from `lib/server/`. 26 importers update their paths.
`lib/server/session.ts` is referenced by name in CLAUDE.md; that reference
updates with it.

### 5. `lib/server/checkout.ts` (edited)

Loses `handleStripeWebhook`, the `sendReceiptEmail` import, the un-awaited
dispatch, and the eight-line comment justifying it. `fulfillCheckoutSession`
ends at `deletePendingCheckoutSession` and `return promoted`.

The module docblock's "two entry points" paragraph is rewritten: both entry
points now reach it through `fulfillAndNotify`.

### 6. `lib/server/email/order.ts` (new)

```ts
export async function sendOrderEmails(purchases: Purchase[]): Promise<void>
```

The fan-out, and nothing else. It composes no mail itself: it groups the rows by
`sellerId`, resolves every seller address in one `getUserEmails` call, then calls
`sendReceiptEmail` once and `sendSaleEmail` once per group, and runs the lot
through `Promise.allSettled`. A seller with no resolvable address is logged and
skipped — the same trade `sendReceiptEmail` already makes for the buyer.

`lib/server/email/receipt.tsx` is unchanged. It stays the receipt composer; it
simply stops being called from `checkout.ts` and starts being called from here,
and the `.catch` it never owned now lives in `scheduleEmail`.

### 7. `lib/server/email/sale.tsx` (new)

```ts
export async function sendSaleEmail(params: {
  to: string
  orderId: string
  items: SaleItem[]
}): Promise<void>
```

Mirrors `receipt.tsx`: resolves nothing it can be handed, composes the element,
calls `sendEmail`. It takes the address rather than a `sellerId` — unlike
`sendReceiptEmail`, which looks its buyer up — because the caller has already
resolved every seller in the order in one query, and re-resolving here would
undo that.

### 8. `lib/server/email/auth.tsx` (new)

```ts
export async function sendPasswordResetEmail(data: { user: User; url: string })
export async function sendEmailVerification(data: { user: User; url: string })
```

Plain awaited composers. No `after()`, no scheduling — Better Auth owns that
through the handler.

### 9. `components/email/sale.tsx` (new)

Subject exported beside the component, per the house pattern that keeps subject
and body from drifting:

```ts
export function saleSubject(itemCount: number): string
```

`You made a sale — {productName}` for one item, `You made {n} sales` above one.

Body: the seller's items with prices, their subtotal, and a button to `/sales`.
Same `EmailLayout`, same snapshot-only props as the receipt. No buyer identity.

### 10. `components/email/password-reset.tsx`, `components/email/verify-email.tsx` (new)

Each exports its component and its subject function. Both take `url` as a prop —
`EmailLayout`'s contract is that templates read no environment, which is what
keeps them renderable outside a request by the dev preview route.

Password reset states the expiry (one hour, Better Auth's
`resetPasswordTokenExpiresIn` default) and says to ignore the mail if it was not
requested. Verification is a single button and one line of copy.

### 11. `lib/server/auth.ts` (edited)

```ts
advanced: {
  backgroundTasks: { handler: scheduleBackgroundTask },
},
emailAndPassword: {
  enabled: true,
  sendResetPassword: ({ user, url }) => sendPasswordResetEmail({ user, url }),
},
emailVerification: {
  sendOnSignUp: true,
  autoSignInAfterVerification: true,
  sendVerificationEmail: ({ user, url }) => sendEmailVerification({ user, url }),
},
```

`requireEmailVerification` is not set — the default is `false` and this spec
leaves it there deliberately. No change to `user.additionalFields`, so
`npm run schema:better-auth` produces no diff and no migration is needed.

### 12. `lib/server/dal/users.ts` (edited)

```ts
export async function getUserEmails(ids: string[]): Promise<Map<string, string>>
```

One `inArray` query for the seller fan-out; a three-seller order costs one round
trip rather than three. Returns a `Map` so callers look up by id without a scan.
`getUserEmail` stays for the single-buyer receipt path.

Not `cache()`d, for the reason already recorded on `getUserEmail`: the caller is
a webhook, not a render pass.

### 13. `app/(auth)/forgot-password/page.tsx` + `forgot-password-form.tsx` (new)

Under the `(auth)` group, so it inherits `CenteredCardShell`. Client form with
one email field. On submit it always renders the same confirmation, never
branching on the response — branching would hand back the enumeration signal
Better Auth spends a dummy lookup to suppress.

### 14. `app/(auth)/reset-password/page.tsx` + `reset-password-form.tsx` (new)

Reads `token` and `error` from `searchParams`. With `error` or no token: the
expired-link message and a link to `/forgot-password`. With a token: new
password plus confirmation, `minLength={PASSWORD_MIN_LENGTH}` on the input and a
mismatch check before submit, then `authClient.resetPassword` and
`router.push('/login')`.

### 15. `app/(auth)/verify-email/page.tsx` + `verify-email-view.tsx` (new)

The dual-purpose view. State is derived, not signalled — the page needs no
marker distinguishing "arrived from the link" from "arrived from the banner",
because the session already answers it:

| `?error` | `getUser()` | Renders |
| --- | --- | --- |
| present | any | The expiry message, plus the resend form |
| absent | verified | Success, and a link to `/dashboard` |
| absent | unverified | "We sent a link to {email}", plus a resend button |
| absent | signed out | The resend form with an email field, and a link to `/login` |

`autoSignInAfterVerification: true` is what makes the second row reachable: a
user who clicks the link is signed in by the time they land, so `emailVerified`
is true on the session that renders the page.

The signed-out row needs the email field because there is no session to read it
from. Better Auth's `/send-verification-email` handles that case with its own
constant-time floor, so the form renders one outcome regardless of whether the
address exists — same discipline as `/forgot-password`.

The resend button surfaces the real error from
`authClient.sendVerificationEmail` — the one place in this surface where a
failure is reportable.

### 16. `components/layouts/dashboard-shell.tsx` (edited)

Renders a banner above `children` when `!user.emailVerified`, linking to
`/verify-email`. The user is already resolved there.

### 17. `app/(auth)/login/login-form.tsx` (edited)

`href="#"` becomes `/forgot-password`, and the `<a>` becomes a `next/link`
`<Link>` to match every other navigation in the form.

### 18. `lib/schemas/auth.ts` (edited)

```ts
export const PASSWORD_MIN_LENGTH = 8
```

A constant, not a zod schema. Both auth forms are uncontrolled and validate
natively — `minLength`, `pattern`, `required` — with no resolver anywhere, so a
schema would be the only one of its kind and would not be reached by the browser
validation that actually gates submission.

`signup-form.tsx` already hardcodes `minLength={8}`; it and the new reset form
both read the constant instead. Eight matches Better Auth's `minPasswordLength`
default, so client and server agree, and a change to that option has one place
to follow.

### 19. `app/dev/emails/[template]/fixtures.tsx` (new) and `route.tsx` (edited)

```ts
export const TEMPLATES: Record<string, { subject: string; element: ReactElement }>
```

Four entries: `receipt`, `sale`, `reset-password`, `verify-email`. The route
keeps its production 404 and its `?send=` behaviour but loses all per-template
knowledge — look up, 404 on miss, render or send. Adding a template is one entry.

The receipt fixture moves out of the route unchanged, including its deliberately
long product name and its zero-price row. The sale fixture covers both subject
branches: a single-item order and a multi-item one.

### 20. `app/dev/emails/page.tsx` (new)

An index listing the four templates with links to each, so the slugs do not have
to be remembered. Same production 404.

### 21. `CLAUDE.md` (edited)

A new section stating the `lib/server/request/` rule and the grep that checks it.
The existing "Session/auth helpers live in `lib/server/session.ts`" line updates
to the new path. The Email section gains the seller notification and the Better
Auth hooks, and records that `backgroundTasks.handler` is what keeps auth mail
off the response path.

## Error handling

**A send that fails is logged and swallowed, never thrown.** Both scheduling
paths enforce this: `scheduleEmail` catches, and Better Auth catches before it
reaches the handler. A dead SMTP connection must not 500 a webhook, because a
500 buys three days of Stripe retries for a state that will never resolve — the
rows are already promoted and the retry promotes nothing.

**`Promise.allSettled`, not `Promise.all`.** One order fans out to 1 + N sends.
`all` would abandon the remaining sends on the first rejection, so a seller whose
account row has a malformed address could cost the buyer their receipt.

**A missing address is logged and skipped.** For the buyer this is near
impossible — `purchases.buyerId` is `onDelete: 'restrict'` — and the existing
code already treats it this way. The seller path takes the same trade.

**An expired reset or verification token is a rendered message, not an error
page.** Both are ordinary outcomes: mail sits in inboxes for days. `/reset-password`
and `/verify-email` render the expiry with the action that recovers from it.

**Enumeration is preserved at the UI layer.** `/forgot-password` renders one
outcome. The temptation to show "no account with that email" is the whole attack.

## Implementation order

Three independently verifiable stages. Each leaves the app working.

1. **The boundary.** Create `lib/server/request/`, move `session.ts`, `cart.ts`,
   `revalidate.ts`, move `handleStripeWebhook`, add `background.ts` and
   `fulfillAndNotify`, switch the receipt to `after()`. Pure refactor — no new
   mail, no new views. Verified by the grep, a build, and one checkout that still
   produces exactly one receipt.
2. **The seller notification.** `getUserEmails`, `components/email/sale.tsx`,
   `lib/server/email/sale.tsx`, `sendOrderEmails`, and the dev-route registry.
   Verified by the multi-seller and single-seller checkouts.
3. **Better Auth email.** The two auth templates, `lib/server/email/auth.tsx`,
   the `lib/server/auth.ts` config, `passwordSchema`, the three views, the
   banner, and the login-form link.

CLAUDE.md is updated at the end of the stage that makes each statement true —
the boundary rule with stage 1, the mail sections with stages 2 and 3.

## Verification

Manual, since the project has no test harness:

1. `npm run lint` and a build pass.
2. `grep -rn "next/headers\|next/navigation\|next/cache\|next/server" lib/server
   --exclude-dir=request` returns nothing.
3. `/dev/emails` lists four templates; each renders; `?send=` on each logs a
   complete message with no credentials in the output.
4. A checkout of two products from two different sellers produces three console
   messages: one receipt, two seller mails, each listing only that seller's item.
5. A checkout of two products from one seller produces two messages, and the
   seller's subject reads "You made 2 sales".
6. `/forgot-password` with a real address logs a reset mail; with an unknown
   address it renders the identical confirmation and logs nothing.
7. The reset link lands on `/reset-password` with a token; a new password is
   accepted and signs in at `/login`. Visiting `/reset-password?error=INVALID_TOKEN`
   renders the expiry message.
8. A fresh signup logs a verification mail and shows the banner. Clicking the
   link clears the banner and leaves the user signed in.
9. Resend on `/verify-email` logs a second mail. With `SMTP_USER`/`SMTP_PASS` set
   to invalid credentials, the button surfaces an error rather than a success
   message.
10. An existing unverified account still signs in, sells, and buys.

## Dependencies

None. `nodemailer`, `@react-email/components`, and `better-auth` are already
installed, and `advanced.backgroundTasks` exists in the installed 1.6.24.

## Environment

No new variables. `APP_URL` is already required by the receipt; Better Auth
builds its own urls from its `baseURL`.

## Follow-ups

To record in TODO.md:

- Settings notification preferences, and the check in `sendOrderEmails` that
  would honour them.
- `requireEmailVerification: true`, and the backfill or grace period that has to
  precede it.
- Email change from Settings via `changeEmail` /
  `sendChangeEmailVerification` — now cheap, since the handler and templates
  exist.
- The outbox with retries, unchanged from the previous spec.
