@AGENTS.md

# Documentation

Write all documentation (docs/, README updates, code comments) in English only.

Every module under `lib/server/` starts with `import 'server-only'` so it can
never be pulled into a client bundle.

Mirroring that, every module under `lib/client/` starts with `import 'client-only'`.
These hold browser-side singletons — the Better Auth client (`lib/client/auth.ts`)
and the UploadThing React helpers (`lib/client/uploadthing.ts`). A `lib/client/`
module may reference a `lib/server/` one **only** through `import type`, which is
erased at compile time; importing a value across that line is what the two markers
exist to catch.

Everything else directly under `lib/` is environment-agnostic and safe on both
sides: `lib/utils.ts`, `lib/schemas/*`. `lib/actions/*` is its own case — server
actions, marked with `'use server'`, imported by client components.

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

**Server actions** (`lib/actions/*`) resolve the current user, parse input, call
a DAL function, then handle Next.js concerns (`revalidatePath`, `redirect`). They
never query tables.

**DAL modules** (`lib/server/dal/*`) are a pure data layer: they fetch and
reshape data only. They do **not** read request state (`headers()`, cookies),
resolve the session, or `redirect()`. Ownership is enforced by taking an
`ownerId` (or equivalent id) parameter and scoping the query to it — the caller
passes it in.
- Domain rules that every caller needs (e.g. deriving a product slug from its
  name) belong in the DAL, not in the action.

**Session/auth helpers** live in `lib/server/request/session.ts`, not the DAL. Callers
(actions, pages, layouts) resolve the user there and pass ids down:
- `getUser()` is `cache()`-wrapped so repeated calls in one render pass hit the
  session once; `requireUser()` wraps it and redirects to `/login` when absent.

# Database schema

`lib/server/db/schemas/auth.ts` is **generated** — never edit it by hand. It is
output by `npm run schema:better-auth`, which reads the Better Auth config in
`lib/server/auth.ts`. Auth tables (`user`, `session`, `account`, `verification`)
change by editing that config — a new column on `user` is a new entry under
`user.additionalFields` — and then regenerating. A hand-written column survives
until the next generate run silently drops it.

`lib/server/db/schemas/product.ts` is not generated and is edited directly.

Either way, SQL in `drizzle/` is generated too: `npm run schema:migrations:generate`
after a schema change, then `npm run schema:migrations:run`.

# Email

`lib/email-theme.generated.ts` is **generated** — never edit it by hand. It is
output by `npm run schema:email-theme`, which reads the `:root` block of
`app/globals.css`, converts each `oklch()` token to hex and resolves `--radius`
to pixels. Email clients parse neither `oklch()` nor `var()`, and React Email's
`<Tailwind>` takes a v3-style JS config object, so the tokens have to arrive as
literal hex. Edit the palette in `app/globals.css`, then regenerate.

Only the light tokens are read. An email has no theme toggle, and Gmail applies
its own dark-mode inversion regardless.

Sending goes through one choke point, `sendEmail` in `lib/server/email/send.ts`,
over one nodemailer transporter picked at module load by
`lib/server/email/transport.ts`:

- `SMTP_USER` — the Gmail address.
- `SMTP_PASS` — a Google **App Password**; 2FA must be on for the account.
- `EMAIL_FROM` — optional, defaults to `SMTP_USER`; Gmail rewrites `From` to the
  authenticated `SMTP_USER` account unless the address given is a verified
  alias on that account, so setting a domain address without adding it as an
  alias fails silently rather than erroring.

A paid order produces one receipt for the buyer and one notification per seller.
`sendOrderEmails` in `lib/server/email/order.ts` groups the promoted purchase
rows by `sellerId` so a three-product order from one seller is one email rather
than three, resolves every seller address in a single `getUserEmails` query, and
runs the sends through `Promise.allSettled` — a seller with an unreachable
address must not cost the buyer their receipt. The seller's copy carries no
buyer identity.

Both credentials absent is a supported state, not a broken one: the transporter
becomes nodemailer's `jsonTransport`, which builds the message without opening a
socket, and `sendEmail` logs the headers and the plain-text body. So a fresh
clone can exercise the whole path, and no dev machine sends real mail by
accident.

Templates are viewed at `/dev/emails/<template>`, which 404s in production.
`?send=<address>` on the same url sends that template's fixture through
`sendEmail`.

# Uploads

Both kinds of upload are staged before they belong to anything, so a product
being created can carry them.

`product_uploads` holds the digital product file. Rows outlive the claim —
`createProduct` copies the name and size onto the product and leaves the row as
the record of what was uploaded.

`product_image_uploads` holds images. Rows are deleted when claimed, so a
surviving row means a pending upload and nothing else. `scripts/` sweeps the ones
no form ever saved: `npm run cleanup:images` reports by default and needs `-- --delete`
to act; only rows older than 24 hours are candidates, overridable with `-- --older-than=7d`.

They are separate tables because images upload `public-read` and product files
upload `private`. One table would let an image's key be claimed as a product's
`fileKey`, and the product would sell a publicly fetchable file.

Images commit on Save, on both the create and edit pages: the form owns the list
and `setProductImages` writes it whole, having checked every url against the
product's current images or a staging row of the same owner.