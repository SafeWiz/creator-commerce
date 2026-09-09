# Transactional email and the buyer receipt

Date: 2026-09-07

## Problem

Nothing in the app can send mail. A buyer completes checkout, the purchase rows
are promoted, and the only confirmation is `/purchases` — which they see only if
they are still in the browser that paid.

TODO.md already records the decisions from an earlier session: nodemailer with a
Gmail App Password, a single `sendEmail` choke point so the eventual swap to a
domain sender touches one file, and a receipt sent fire-and-forget from
`fulfillCheckoutSession`. None of it exists in code.

## Scope

- A send layer: nodemailer, one transporter, chosen from whether SMTP
  credentials are present.
- A console fallback so a fresh clone with no `.env` can exercise the whole path.
- React Email templates, themed from the shadcn palette in `app/globals.css`.
- One real caller: the buyer receipt on a fulfilled checkout.
- A dev-only route for looking at a rendered template.

Out of scope, and left in TODO.md: the per-seller sale notification, Better
Auth's `sendVerificationEmail` / password reset, the outbox table with retries,
and moving off a personal Gmail `from`.

## Decisions

**Credentials decide the transport.** `SMTP_USER` and `SMTP_PASS` both present
means Gmail; either missing means console. Zero config for a fresh clone, and no
way to send real mail from dev without deliberately pasting real credentials.
The accepted cost: a typo'd variable name in production degrades to console
silently rather than throwing.

**Both branches are nodemailer transporters.** The console branch is
`createTransport({ jsonTransport: true })`, which builds the complete message and
returns it instead of opening a socket. `sendEmail` therefore never branches on
transport — it calls `sendMail` and, in console mode, logs what came back.

**Every send is multipart.** `html` and `text` are both rendered from the same
JSX. Better deliverability, and the console output is the exact text body a
text-only client would receive rather than a second rendering that could drift.

**The palette is generated, not hand-mirrored.** Email clients parse neither
`oklch()` nor `var()`, and React Email's `<Tailwind>` takes a v3-style JS config
object rather than v4's CSS-first `@theme`. So the tokens must land as hex in a
config object. Generating that from `app/globals.css` keeps one source of truth,
the same trade `lib/server/db/schemas/auth.ts` already makes.

**Light tokens only.** Emails do not carry a theme toggle, and Gmail applies its
own dark-mode inversion regardless. The `.dark` block is not read.

**Templates live in `components/email/`, not a top-level `emails/`.** They are
environment-agnostic React, like everything else under `components/`. No
`server-only` marker, so the dev route — and any preview tool added later — can
import them outside a request.

**A dev route, not the React Email CLI.** `react-email dev` boots its own Next
app and expects `emails/` at the repo root. A route handler in the app already
running gives the same feedback loop for no new dependency.

**The receipt goes to the account email.** A DAL read by `buyerId`, not
`session.customer_details.email`. The receipt then lands where `/purchases`,
and later password reset, already land. Stripe's field is what the buyer typed
into a checkout form; it is not necessarily an address tied to any account.

**Receipt failure is swallowed.** Argued in full under Error handling.

## Architecture

```
components/email/layout.tsx           <EmailLayout> — Html/Head/Body + <Tailwind config>
components/email/receipt.tsx          <ReceiptEmail> + receiptSubject()
lib/email-theme.generated.ts          GENERATED hex palette from :root
scripts/generate-email-theme.ts       the generator (npm run schema:email-theme)
lib/server/email/transport.ts         one nodemailer transporter, chosen at module load
lib/server/email/send.ts              sendEmail({ to, subject, react })
lib/server/email/receipt.ts           sendReceiptEmail(purchases)
app/dev/emails/[template]/route.ts    renders a template with fixture data
lib/server/dal/users.ts               + getUserEmail(userId)
lib/server/checkout.ts                calls sendReceiptEmail after a non-empty promotion
```

The layering matches the rest of `lib/`: `components/email/*` is
environment-agnostic, everything under `lib/server/email/` starts with
`import 'server-only'`, the DAL gains one owner-scoped read, and `checkout.ts`
stays a sequencer — it does not build HTML.

`sendEmail` is the seam TODO.md promised. Swapping Gmail for a domain sender, or
putting an outbox in front of the send, changes `transport.ts` and `send.ts` and
nothing that calls them.

### Data flow

```
Stripe webhook ──┐
                 ├─→ fulfillCheckoutSession(session)
/checkout/return ┘         │
                           ├─ markCheckoutSessionPaid → promoted: Purchase[]
                           ├─ deletePendingCheckoutSession
                           └─ if (promoted.length > 0) sendReceiptEmail(promoted)
                                      │
                                      ├─ getUserEmail(promoted[0].buyerId)
                                      ├─ render <ReceiptEmail> → html + text
                                      └─ transporter.sendMail
```

`promoted.length > 0` is the exactly-once rule, and it needs no new state.
Whichever entry point loses the race promotes zero rows; the duplicate-purchase
path returns `[]` as well. Both therefore send nothing.

### Why the receipt reads only snapshot data

`Purchase` carries `orderId`, `productId`, `productName` and `priceInCents`. The
template uses those and sums the total. It does not join back to `products`: a
purchase row is deliberately a snapshot, and a receipt that re-read the product
would print a price the buyer never paid and a name they never bought.

## Components

### 1. `scripts/generate-email-theme.ts`

Reads `app/globals.css`, isolates the `:root` block, matches every
`--token: oklch(L C H)`, converts OKLab → LMS → linear sRGB → gamma-corrected
hex, and writes `lib/email-theme.generated.ts`:

The hex values below are illustrative — the real ones come out of the run:

```ts
// GENERATED by npm run schema:email-theme — do not edit.
export const emailTheme = {
  colors: {
    background: '#ffffff',
    foreground: '#242322',
    'muted-foreground': '#8a8681',
    primary: '#2f7d4f',
    'primary-foreground': '#f7fdf9',
    // …every :root colour token
  },
  radius: '7px', // --radius: 0.45rem
} as const
```

Details that matter:

- **Every colour token, not a curated subset.** An allowlist would be a second
  place to edit when the palette changes. Unused keys cost nothing — React Email
  only inlines the classes a template actually uses.
- **Kebab keys**, so `bg-muted text-muted-foreground` means the same thing in an
  email as in the app.
- **`--radius` resolved to px.** `pixelBasedPreset` converts utility rem values,
  but a value supplied through the config has to already be px.
- **Fonts skipped.** `--font-sans` points at a `next/font` family that does not
  exist in a mail client; the layout declares a websafe stack instead.
- **Out-of-gamut channels are clamped.** The current palette is well inside
  sRGB, so this is a guard rather than a routine path.
- **No new dependency.** The conversion is about thirty lines of arithmetic.

The script is added to `package.json` as `schema:email-theme`, alongside the
existing generate scripts, and CLAUDE.md gains a line naming
`lib/email-theme.generated.ts` as generated output.

### 2. `components/email/layout.tsx`

Wraps `Html`, `Head`, `Body` and `<Tailwind>`:

```tsx
<Tailwind
  config={{
    presets: [pixelBasedPreset],
    theme: { extend: { colors: emailTheme.colors, borderRadius: { DEFAULT: emailTheme.radius } } },
  }}
>
```

`pixelBasedPreset` is required, not optional: Tailwind's default rem units are
unsupported in several clients.

### 3. `components/email/receipt.tsx`

Props are exactly what a `Purchase[]` provides:

```ts
type ReceiptEmailProps = {
  orderId: string
  items: { productId: number; productName: string; priceInCents: number }[]
}
```

Renders line items, a total, each product name linking to
`${APP_URL}/downloads/${productId}`, a "View your purchases" button to
`${APP_URL}/purchases`, and the order id in the footer. Money goes through
`formatPrice` from `lib/currency.ts`, so the receipt says `29,00 RON` exactly as
the cart did.

`receiptSubject()` is exported alongside the component so the subject and the
body cannot drift apart. Subject: `Your receipt from Creator Commerce`.

Per-item download links are safe: `/downloads/[productId]` re-runs `getUser()`
and `getDownloadableProductFile` on every request and mints the signed URL
inside its 302. The email carries a plain URL and no credential. Signed out, the
route redirects to login — landing on `/downloads` rather than the specific file,
because the `next` target is hardcoded there. Mail scanners that prefetch links
arrive without a cookie and hit that same login redirect, minting nothing.

### 4. `lib/server/email/transport.ts`

```ts
const hasCredentials = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS)

export const emailFrom = process.env.EMAIL_FROM ?? process.env.SMTP_USER ?? 'dev@localhost'

export const transporter = nodemailer.createTransport(
  hasCredentials
    ? { service: 'gmail', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }
    : { jsonTransport: true },
)
```

`service: 'gmail'` resolves host, port and TLS from nodemailer's built-in
profile. The password is a Google **App Password**, which requires 2FA on the
account.

Not pooled. The 1–3s Gmail handshake inside a webhook Stripe is timing is real,
and TODO.md already names the outbox as its fix; pooling a connection in a
per-invocation serverless function would be a false one.

### 5. `lib/server/email/send.ts`

```ts
export async function sendEmail({ to, subject, react }: SendEmailParams): Promise<void> {
  const [html, text] = await Promise.all([render(react), render(react, { plainText: true })])
  await transporter.sendMail({ from: emailFrom, to, subject, html, text })
  if (!hasCredentials) console.log(`[email] to=${to} from=${emailFrom}\n${subject}\n\n${text}`)
}
```

Nothing containing `SMTP_PASS` is ever logged.

### 6. `lib/server/email/receipt.ts`

`sendReceiptEmail(purchases: Purchase[])` — its own module rather than more of
`checkout.ts`, which is already the longest file in `lib/server/` and whose job
is sequencing. It reads `getUserEmail(purchases[0].buyerId)` (every row of one
order shares a buyer), maps the rows to props, and calls `sendEmail`.

### 7. `lib/server/dal/users.ts`

```ts
export async function getUserEmail(userId: string): Promise<string | null>
```

One column, scoped by id, consistent with the DAL rules: no session, no headers,
no redirect.

### 8. `app/dev/emails/[template]/route.ts`

Returns rendered HTML with `Content-Type: text/html` for a named template, using
fixture data defined in the route. Responds 404 when `NODE_ENV === 'production'`,
checked before anything renders. Hot-reloads with `next dev`.

### 9. `lib/server/checkout.ts`

```ts
await deletePendingCheckoutSession(session.id)
if (promoted.length > 0) {
  try {
    await sendReceiptEmail(promoted)
  } catch (error) {
    console.error(`[checkout] receipt failed for order ${promoted[0].orderId} (session ${session.id})`, error)
  }
}
return promoted
```

## Error handling

**A failed receipt never fails the order.** Throwing would return a 500, Stripe
would retry in good faith, and the retry's `markCheckoutSessionPaid` would match
no pending rows and return `[]` — so the receipt is lost either way, and the
order additionally looks unfulfilled to whoever reads the logs. The
`console.error` carries the order id and the session id so a failed receipt can
be resent by hand. This is the same trade `deleteUploadedFiles` already makes:
the operation the user cares about succeeded.

**No address for `buyerId`** — log and return. The `onDelete: 'restrict'` foreign
key makes it near-impossible, and it is not worth an exception.

**SMTP failure** (wrong App Password, quota, timeout) surfaces through the same
catch. Gmail's cap is roughly 500 messages a day.

**The generator fails loudly.** A missing `:root` block, or a token that does not
parse as `oklch()`, throws rather than writing a partial file. A silently empty
palette would ship unstyled receipts, and that failure would only show up in
someone's inbox.

**The dev route 404s in production** before rendering.

## Verification

The repo has no test framework, so this is a manual list:

1. `npm run schema:email-theme` — spot-check `primary` in the generated file
   against `--primary` in `app/globals.css`.
2. `npm run dev`, open `/dev/emails/receipt` — a styled, multi-item receipt.
3. With no SMTP env set, complete a test-mode Stripe checkout — the terminal
   prints `to`, `from`, subject and the plain-text body.
4. With `SMTP_USER` and `SMTP_PASS` set to a Gmail App Password, repeat — the
   mail arrives. Open it in Gmail web and Gmail mobile.
5. Let the webhook fulfil first, then hit `/checkout/return` for the same
   session — exactly one email.
6. `npm run lint`, `npx tsc --noEmit`, `npm run build`.

## Dependencies

- `nodemailer`, `@types/nodemailer` (dev)
- `@react-email/components`, `@react-email/render`

## Environment

- `SMTP_USER` — the Gmail address.
- `SMTP_PASS` — a Google App Password (requires 2FA on the account).
- `EMAIL_FROM` — optional; defaults to `SMTP_USER`.

Both credentials absent is a supported state: the console transport.
Documented in the README.

## Follow-ups recorded in TODO.md

Already written down there, and unchanged by this work: the outbox table with
retries (which also answers the handshake cost inside the webhook), the
per-seller sale notification grouped by `sellerId`, the move off a personal
Gmail `from` to a domain with its own DKIM, and `requireEmailVerification`
staying off until existing accounts are backfilled.
