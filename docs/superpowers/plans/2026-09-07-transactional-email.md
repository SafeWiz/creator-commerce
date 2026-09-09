# Transactional Email Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send a buyer a themed receipt email when their checkout is fulfilled, through a single `sendEmail` choke point that falls back to the console when no SMTP credentials are present.

**Architecture:** A generator turns the `:root` palette in `app/globals.css` into a hex config object React Email's `<Tailwind>` can use. Templates live in `components/email/` as environment-agnostic React and are viewed through a dev-only route. `lib/server/email/` holds one nodemailer transporter — real Gmail SMTP when credentials exist, nodemailer's own `jsonTransport` when they do not — so `sendEmail` never branches. `fulfillCheckoutSession` calls the receipt after a non-empty promotion and swallows its failure.

**Tech Stack:** Next 16 (App Router, route handlers), React 19, `@react-email/components` 1.0.12, `nodemailer` 10, Drizzle, `tsx` for scripts.

**Spec:** `docs/superpowers/specs/2026-09-07-transactional-email-design.md`

## Global Constraints

- **Gabi runs every npm command.** Do not run `npm install`, `npm run dev`, `npm run build`, `npm run lint`, `npx tsc`, or any `schema:*` script yourself. Steps that need one say **ASK GABI** — stop, state the exact command, wait for the output.
- **AGENTS.md:** this is not the Next.js in your training data. Before writing a route handler or touching `next.config.ts`, read the relevant guide under `node_modules/next/dist/docs/`. Heed deprecation notices.
- Every module under `lib/server/` starts with `import 'server-only'`. Modules under `components/` never do.
- **DAL rules:** `lib/server/dal/*` fetches and reshapes only — no `headers()`, no cookies, no session, no `redirect()`. Ownership is a parameter.
- Documentation, code comments and commit messages in **English only**.
- `lib/email-theme.generated.ts` is generated output. Never hand-edit it.
- Prices are stored in cents and rendered only through `formatPrice` from `lib/currency.ts`.
- Comment style: match the surrounding code. This codebase explains *why* a decision was made, not what a line does.
- Commit messages end with the trailer `Claude-Session: https://claude.ai/code/session_011i8t68vmQNtmrNzdZcuiy8`.

## Deviations from the spec (decided while planning, verified against the published packages)

1. **One dependency, not two.** `@react-email/components@1.0.12` re-exports `@react-email/render` (`export * from "@react-email/render"`), so `render` and `pretty` come from the components package. `@react-email/render` is not installed directly.
2. **No `@types/nodemailer`.** nodemailer 10 ships its own types (`"types": "./dist/cjs/nodemailer.d.ts"`). Installing the DefinitelyTyped package would shadow them.
3. **Env vars documented in CLAUDE.md, not README.md.** The README is the Romanian course description; CLAUDE.md is where this repo documents mechanics, in English.
4. **`appUrl` is a prop on the template, not `process.env` read inside it.** Keeps `components/email/*` environment-agnostic, and lets the dev route preview against localhost.
5. **The generated palette is typed `Record<string, string>`, not `as const`.** `TailwindConfig` wants mutable colour records; a readonly object fights it for nothing.
6. **The dev route gains `?send=<address>`.** Five lines, dev-only, and it makes the transport independently testable without running a Stripe checkout. Spec had the route as render-only.

## File Structure

| File | Responsibility |
|---|---|
| `scripts/generate-email-theme.ts` | Parse `:root` from globals.css, oklch → hex, write the generated palette |
| `lib/email-theme.generated.ts` | GENERATED. `emailTheme.colors` + `emailTheme.radius` |
| `components/email/layout.tsx` | `<EmailLayout>` — Html/Head/Preview/Tailwind/Body/Container shell |
| `components/email/receipt.tsx` | `<ReceiptEmail>` + `receiptSubject()` + its prop types |
| `app/dev/emails/[template]/route.tsx` | Dev-only: render a template with fixtures, or send it |
| `lib/server/email/transport.ts` | One nodemailer transporter, chosen at module load; `emailFrom`; `hasCredentials` |
| `lib/server/email/send.ts` | `sendEmail({ to, subject, react })` — render both bodies, send, log in console mode |
| `lib/server/email/receipt.tsx` | `sendReceiptEmail(purchases)` — address lookup, props, send |
| `lib/server/dal/users.ts` | + `getUserEmail(userId)` |
| `lib/server/checkout.ts` | Calls `sendReceiptEmail` after a non-empty promotion |
| `next.config.ts` | `serverExternalPackages: ['nodemailer']` |
| `CLAUDE.md` | New "Email" section: generated file, transport rule, env vars |

---

### Task 1: Generated email palette

**Files:**
- Create: `scripts/generate-email-theme.ts`
- Create (by running the script): `lib/email-theme.generated.ts`
- Modify: `package.json` (scripts)
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: nothing.
- Produces: `import { emailTheme } from '@/lib/email-theme.generated'` where
  `emailTheme: { colors: Record<string, string>; radius: string }`. Colour keys
  are the CSS token names without the `--` prefix (`background`, `foreground`,
  `muted-foreground`, `primary`, `primary-foreground`, `border`, `card`, …).
  Values are 6-digit lowercase hex. `radius` is a px string, e.g. `'7px'`.

No new dependencies — `tsx` is already a devDependency.

- [ ] **Step 1: Look at the source of truth**

Run: `sed -n '/^:root {/,/^}/p' app/globals.css`

Expected: the light palette, every colour as `--name: oklch(L C H);`, plus
`--radius: 0.45rem;`. Count the colour lines — the generated file must contain
exactly that many entries.

- [ ] **Step 2: Write the generator**

Create `scripts/generate-email-theme.ts`:

```ts
/**
 * Generates lib/email-theme.generated.ts from the :root block of
 * app/globals.css.
 *
 * Email clients parse neither oklch() nor var(), and React Email's <Tailwind>
 * takes a v3-style JS config object rather than v4's CSS-first @theme — so the
 * design tokens have to reach an email as literal hex in an object. Generating
 * that keeps one source of truth, the same trade lib/server/db/schemas/auth.ts
 * already makes.
 *
 * Light tokens only. An email carries no theme toggle, and Gmail applies its own
 * dark-mode inversion regardless, so the .dark block is not read.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const SOURCE = join(process.cwd(), 'app/globals.css')
const OUTPUT = join(process.cwd(), 'lib/email-theme.generated.ts')

// The browser resolves rem against the root font size; an email has no such
// context, and several clients drop rem outright. 16px is the browser default
// and the number Tailwind's own pixelBasedPreset assumes.
const ROOT_FONT_SIZE_PX = 16

/**
 * OKLCH to sRGB hex, via OKLab and the LMS matrices from Björn Ottosson's
 * reference implementation.
 *
 * Out-of-gamut channels are clamped per channel. The current palette sits well
 * inside sRGB, so this is a guard rather than a routine path — but a token
 * edited to a vivid colour must still produce a valid hex string rather than
 * "NaN".
 */
function oklchToHex(lightness: number, chroma: number, hueDegrees: number): string {
  const hue = (hueDegrees * Math.PI) / 180
  const a = chroma * Math.cos(hue)
  const b = chroma * Math.sin(hue)

  const longCubeRoot = lightness + 0.3963377774 * a + 0.2158037573 * b
  const mediumCubeRoot = lightness - 0.1055613458 * a - 0.0638541728 * b
  const shortCubeRoot = lightness - 0.0894841775 * a - 1.291485548 * b

  const long = longCubeRoot ** 3
  const medium = mediumCubeRoot ** 3
  const short = shortCubeRoot ** 3

  const linear = [
    4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short,
    -1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short,
    -0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short,
  ]

  const channels = linear.map((channel) => {
    const encoded =
      channel <= 0.0031308
        ? 12.92 * channel
        : 1.055 * Math.pow(channel, 1 / 2.4) - 0.055
    const clamped = Math.min(1, Math.max(0, encoded))
    return Math.round(clamped * 255)
      .toString(16)
      .padStart(2, '0')
  })

  return `#${channels.join('')}`
}

function readRootBlock(css: string): string {
  // The first :root block is the light palette; .dark follows it and is not
  // read. [^}]* stops at the first closing brace, and neither block nests.
  const match = css.match(/:root\s*\{([^}]*)\}/)
  if (!match) {
    throw new Error(`No :root block found in ${SOURCE}`)
  }
  return match[1]
}

function parseColors(block: string): Record<string, string> {
  const colors: Record<string, string> = {}
  const token = /--([a-z0-9-]+):\s*oklch\(([^)]+)\)/g

  for (const [, name, value] of block.matchAll(token)) {
    if (value.includes('/')) {
      // A translucent token cannot become a 6-digit hex, and silently dropping
      // the alpha would ship a colour nobody chose.
      throw new Error(
        `--${name} uses alpha (oklch(${value})), which an email palette cannot express`,
      )
    }

    const parts = value.trim().split(/\s+/).map(Number)
    if (parts.length !== 3 || parts.some(Number.isNaN)) {
      throw new Error(`--${name}: cannot parse oklch(${value})`)
    }

    colors[name] = oklchToHex(parts[0], parts[1], parts[2])
  }

  if (Object.keys(colors).length === 0) {
    throw new Error('The :root block contained no oklch tokens')
  }

  return colors
}

function parseRadius(block: string): string {
  const match = block.match(/--radius:\s*([\d.]+)rem/)
  if (!match) {
    throw new Error('No --radius found in the :root block')
  }
  return `${Math.round(Number(match[1]) * ROOT_FONT_SIZE_PX)}px`
}

function main(): void {
  // A cheap proof the colour maths is wired up correctly: pure white and pure
  // black are exact in every colour space, so a wrong matrix cannot pass this.
  if (oklchToHex(1, 0, 0) !== '#ffffff' || oklchToHex(0, 0, 0) !== '#000000') {
    throw new Error('oklchToHex self-check failed')
  }

  const block = readRootBlock(readFileSync(SOURCE, 'utf8'))
  const colors = parseColors(block)
  const radius = parseRadius(block)

  const entries = Object.entries(colors)
    .map(([name, hex]) => `    '${name}': '${hex}',`)
    .join('\n')

  const file = `// GENERATED by \`npm run schema:email-theme\` — do not edit.
// Source: app/globals.css (:root, light tokens only).

export const emailTheme: { colors: Record<string, string>; radius: string } = {
  colors: {
${entries}
  },
  radius: '${radius}',
}
`

  writeFileSync(OUTPUT, file)
  console.log(
    `[email-theme] wrote ${OUTPUT} — ${Object.keys(colors).length} colors, radius ${radius}`,
  )
}

main()
```

- [ ] **Step 3: Add the npm script**

Modify `package.json`, in `"scripts"`, directly after `"schema:migrations:run"`:

```json
    "schema:email-theme": "tsx scripts/generate-email-theme.ts",
```

- [ ] **Step 4: ASK GABI to run the generator**

Command for Gabi: `npm run schema:email-theme`

Expected output: `[email-theme] wrote …/lib/email-theme.generated.ts — <n> colors, radius 7px`,
where `<n>` matches the colour-token count from Step 1.

If it throws instead, the message names the token that failed — fix the parser,
do not loosen the guard.

- [ ] **Step 5: Verify the output**

Run: `cat lib/email-theme.generated.ts`

Check, by eye:
- `'background': '#ffffff'` — `--background: oklch(1 0 0)` is pure white, so this
  one is exactly predictable and proves the pipeline end to end.
- `'primary'` is a green (`--primary: oklch(0.527 0.154 150.069)`; hue 150 is
  green), roughly `#2e7d4f`. Not exact — read it as a sanity check, not a fixture.
- Every value matches `^#[0-9a-f]{6}$`.
- `radius: '7px'`.

Run: `grep -c "': '#" lib/email-theme.generated.ts`
Expected: the same count the script reported.

- [ ] **Step 6: Document the generated file**

Modify `CLAUDE.md`. In the `# Database schema` section, after the paragraph about
`lib/server/db/schemas/product.ts`, add a new top-level section immediately
before `# Uploads`:

```markdown
# Email

`lib/email-theme.generated.ts` is **generated** — never edit it by hand. It is
output by `npm run schema:email-theme`, which reads the `:root` block of
`app/globals.css`, converts each `oklch()` token to hex and resolves `--radius`
to pixels. Email clients parse neither `oklch()` nor `var()`, and React Email's
`<Tailwind>` takes a v3-style JS config object, so the tokens have to arrive as
literal hex. Edit the palette in `app/globals.css`, then regenerate.

Only the light tokens are read. An email has no theme toggle, and Gmail applies
its own dark-mode inversion regardless.
```

- [ ] **Step 7: Commit**

```bash
git add scripts/generate-email-theme.ts lib/email-theme.generated.ts package.json CLAUDE.md
git commit -m "feat: generate an email palette from the shadcn tokens" -m "Email clients parse neither oklch() nor var(), and React Email's Tailwind takes a v3-style JS config object, so the design tokens have to reach an email as literal hex. Generating that from globals.css keeps one source of truth." -m "Claude-Session: https://claude.ai/code/session_011i8t68vmQNtmrNzdZcuiy8"
```

---

### Task 2: Receipt template and dev preview route

**Files:**
- Modify: `package.json` (dependencies)
- Create: `components/email/layout.tsx`
- Create: `components/email/receipt.tsx`
- Create: `app/dev/emails/[template]/route.tsx`

**Interfaces:**
- Consumes: `emailTheme` from Task 1; `formatPrice` from `lib/currency.ts`.
- Produces:
  - `EmailLayout({ preview, children }: { preview: string; children: ReactNode })`
  - `type ReceiptItem = { productId: number; productName: string; priceInCents: number }`
  - `type ReceiptEmailProps = { orderId: string; items: ReceiptItem[]; appUrl: string }`
  - `ReceiptEmail(props: ReceiptEmailProps)`
  - `receiptSubject(): string`

- [ ] **Step 1: Add the dependency**

Modify `package.json`, in `"dependencies"`, keeping alphabetical order (after
`"@neondatabase/serverless"`):

```json
    "@react-email/components": "^1.0.12",
```

Only this one. It re-exports `@react-email/render`, so `render` and `pretty` come
from it, and installing the render package separately would pin a second copy.

- [ ] **Step 2: ASK GABI to install**

Command for Gabi: `npm install`

Expected: `@react-email/components@1.0.12` (or a later 1.x) in the lockfile, no
peer-dependency errors against React 19.2.4.

- [ ] **Step 3: Read the Next docs for route handlers**

Per AGENTS.md, before writing the route in Step 6:

Run: `ls node_modules/next/dist/docs/`
Then read the route-handler and dynamic-segment guides in there.

What to confirm: how `params` is typed and awaited, and whether `RouteContext<'…'>`
is still the current form. `app/(master)/downloads/[productId]/route.ts` uses
`ctx: RouteContext<'/downloads/[productId]'>` with `await ctx.params` — mirror
whatever the installed version documents.

- [ ] **Step 4: Write the layout**

Create `components/email/layout.tsx`:

```tsx
import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Tailwind,
  pixelBasedPreset,
} from '@react-email/components'
import type { ReactNode } from 'react'

import { emailTheme } from '@/lib/email-theme.generated'

/**
 * The shell every email shares.
 *
 * No 'server-only' marker, deliberately: these components are plain React and
 * are imported by the dev preview route outside any request. They read no
 * environment — every url arrives as a prop — which is what keeps them that way.
 *
 * pixelBasedPreset is required rather than decorative: Tailwind's default rem
 * units are unsupported in several mail clients, and the preset rewrites the
 * utilities to px.
 *
 * The font stack is websafe and inline. --font-sans points at a next/font family
 * that does not exist in a mail client, so the generator does not emit fonts.
 */
const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

export function EmailLayout({
  preview,
  children,
}: {
  preview: string
  children: ReactNode
}) {
  return (
    <Html lang="en">
      <Head />
      {/* The grey line an inbox shows next to the subject. Without it, clients
          invent one from the first words of the body. */}
      <Preview>{preview}</Preview>
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
          theme: {
            extend: {
              colors: emailTheme.colors,
              borderRadius: { DEFAULT: emailTheme.radius },
            },
          },
        }}
      >
        <Body
          className="bg-muted text-foreground"
          style={{ fontFamily: FONT_STACK }}
        >
          <Container className="mx-auto my-[32px] w-[560px] rounded bg-background p-[32px]">
            {children}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
```

- [ ] **Step 5: Write the receipt template**

Create `components/email/receipt.tsx`:

```tsx
import { Button, Column, Hr, Link, Row, Section, Text } from '@react-email/components'

import { formatPrice } from '@/lib/currency'
import { EmailLayout } from './layout'

export type ReceiptItem = {
  productId: number
  productName: string
  priceInCents: number
}

export type ReceiptEmailProps = {
  orderId: string
  items: ReceiptItem[]
  appUrl: string
}

/**
 * Exported beside the component so the subject and the body cannot drift apart:
 * one import gives a caller both halves of the same email.
 */
export function receiptSubject(): string {
  return 'Your receipt from Creator Commerce'
}

/**
 * What a buyer gets when a checkout is fulfilled.
 *
 * Props are exactly what a purchase row already carries. No join back to
 * products: a purchase is deliberately a snapshot, and a receipt that re-read the
 * product would print a price the buyer never paid and a name they never bought.
 *
 * The per-item links are safe. /downloads/[productId] re-runs the entitlement
 * check on every request and mints its signed url inside the 302, so what travels
 * in the email is a plain url and no credential. Signed out — including a mail
 * scanner prefetching it — the route redirects to login and mints nothing.
 */
export function ReceiptEmail({ orderId, items, appUrl }: ReceiptEmailProps) {
  const total = items.reduce((sum, item) => sum + item.priceInCents, 0)

  return (
    <EmailLayout preview={`Your receipt — ${formatPrice(total)}`}>
      <Text className="m-0 text-[20px] font-bold">Thanks for your purchase</Text>
      <Text className="mb-[24px] mt-[8px] text-[14px] text-muted-foreground">
        Your files are ready. Each product below links straight to its download.
      </Text>

      <Section>
        {items.map((item) => (
          <Row key={item.productId} className="mb-[12px]">
            <Column>
              <Link
                href={`${appUrl}/downloads/${item.productId}`}
                className="text-[14px] font-medium text-foreground underline"
              >
                {item.productName}
              </Link>
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
          href={`${appUrl}/purchases`}
          className="rounded bg-primary px-[20px] py-[12px] text-[14px] font-medium text-primary-foreground"
        >
          View your purchases
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

- [ ] **Step 6: Write the dev route**

Create `app/dev/emails/[template]/route.tsx`:

```ts
import { render } from '@react-email/components'
import type { NextRequest } from 'next/server'

import { ReceiptEmail, type ReceiptEmailProps } from '@/components/email/receipt'

/**
 * Looking at an email while building it.
 *
 * A route in the app already running rather than the react-email CLI, which
 * boots its own Next app and expects an emails/ directory at the repo root. This
 * gives the same loop — edit, refresh — for no extra dependency.
 *
 * Fixtures live here rather than beside the template: they exist to exercise the
 * layout (a long name that has to wrap, a zero price), and nothing in production
 * should be able to import them.
 */
const APP_URL = process.env.APP_URL ?? 'http://localhost:3000'

const FIXTURES: { receipt: ReceiptEmailProps } = {
  receipt: {
    orderId: '3f1c0b8e-9d2a-4f77-9a1e-5c6f2b7d8e90',
    appUrl: APP_URL,
    items: [
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
    ],
  },
}

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<'/dev/emails/[template]'>,
) {
  // Before anything renders. This route exposes fixtures and, later, a send
  // trigger; neither belongs to a deployed app.
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not found', { status: 404 })
  }

  const { template } = await ctx.params
  if (template !== 'receipt') {
    return new Response(`Unknown template: ${template}`, { status: 404 })
  }

  const html = await render(<ReceiptEmail {...FIXTURES.receipt} />)

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
```

Note the file must be `route.tsx`, not `route.ts` — it contains JSX. Create it as
`app/dev/emails/[template]/route.tsx`.

- [ ] **Step 7: ASK GABI to start the dev server**

Command for Gabi: `npm run dev`

Leave it running for the next step.

- [ ] **Step 8: Verify the render**

Run: `curl -s http://localhost:3000/dev/emails/receipt | head -c 400`

Expected: an HTML document whose `<body>` carries inline styles — not Tailwind
class names. React Email inlines them, so seeing `class="bg-muted"` with no
corresponding `style` means `<Tailwind>` is not wrapping the tree.

Run: `curl -s http://localhost:3000/dev/emails/receipt | grep -c "downloads/1"`
Expected: `1`

Run: `curl -s http://localhost:3000/dev/emails/nope -o /dev/null -w '%{http_code}\n'`
Expected: `404`

Then open `http://localhost:3000/dev/emails/receipt` in a browser: green button,
three line items, the long name wrapping without shoving the price column, the
total matching the sum, prices reading `129,00 RON` style.

- [ ] **Step 9: ASK GABI to typecheck**

Command for Gabi: `npx tsc --noEmit`

Expected: no errors. A complaint that `emailTheme.colors` is not assignable to
the Tailwind config means the generated file was emitted `as const` — regenerate
with the Task 1 script as written.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json components/email app/dev
git commit -m "feat: receipt email template and a dev preview route" -m "Templates are environment-agnostic React under components/email, so the preview route can import them outside a request. Every url arrives as a prop rather than being read from the environment inside the component." -m "Claude-Session: https://claude.ai/code/session_011i8t68vmQNtmrNzdZcuiy8"
```

---

### Task 3: Transport and `sendEmail`

**Files:**
- Modify: `package.json` (dependencies)
- Modify: `next.config.ts`
- Create: `lib/server/email/transport.ts`
- Create: `lib/server/email/send.ts`
- Modify: `app/dev/emails/[template]/route.tsx`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: `ReceiptEmail`, `receiptSubject` from Task 2.
- Produces:
  - `transporter: nodemailer.Transporter`, `emailFrom: string`, `hasCredentials: boolean` from `lib/server/email/transport.ts`
  - `sendEmail(params: { to: string; subject: string; react: ReactElement }): Promise<void>` from `lib/server/email/send.ts`

- [ ] **Step 1: Add the dependency**

Modify `package.json`, in `"dependencies"`, alphabetically (after `"next"`):

```json
    "nodemailer": "^10.0.1",
```

Do **not** add `@types/nodemailer`. nodemailer 10 ships its own types, and the
DefinitelyTyped package would shadow them with an older shape.

- [ ] **Step 2: Mark nodemailer external to the server bundle**

Modify `next.config.ts`:

```ts
const nextConfig: NextConfig = {
  // nodemailer is a CommonJS node library with dynamic requires; bundling it
  // into the server output breaks those. Loaded from node_modules at runtime
  // instead.
  serverExternalPackages: ['nodemailer'],
  images: {
    // UploadThing serves files from https://<appId>.ufs.sh/f/<key>.
    remotePatterns: [{ protocol: "https", hostname: "**.ufs.sh" }],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2678400
  },
};
```

Per AGENTS.md, confirm the key name against the installed version before
trusting it: `grep -rn "serverExternalPackages" node_modules/next/dist/docs/`.
If this Next renamed or moved it, use what the docs say and note it in the
commit body.

- [ ] **Step 3: ASK GABI to install**

Command for Gabi: `npm install`

Expected: `nodemailer@10.x` in the lockfile.

- [ ] **Step 4: Write the transport**

Create `lib/server/email/transport.ts`:

```ts
import 'server-only'

import nodemailer from 'nodemailer'

/**
 * One transporter, chosen once at module load.
 *
 * Credentials decide it: both present means Gmail, either missing means the
 * console. A fresh clone with no .env therefore logs instead of throwing, and
 * nothing sends real mail from a dev machine unless someone deliberately pasted
 * real credentials. The accepted cost is that a typo'd variable name in
 * production degrades to console silently.
 *
 * Both branches are nodemailer transporters, which is the point. jsonTransport
 * builds the complete message and hands it back instead of opening a socket, so
 * sendEmail calls sendMail identically either way and never branches on
 * transport.
 *
 * Not pooled. The Gmail handshake costs 1-3s inside a webhook Stripe is timing,
 * and TODO.md already names the outbox as the fix for that; pooling a connection
 * in a per-invocation serverless function would be a false one.
 *
 * service: 'gmail' resolves host, port and TLS from nodemailer's built-in
 * profile. SMTP_PASS is a Google App Password, which requires 2FA on the
 * account — a normal password will be rejected.
 */
export const hasCredentials = Boolean(
  process.env.SMTP_USER && process.env.SMTP_PASS,
)

export const emailFrom =
  process.env.EMAIL_FROM ?? process.env.SMTP_USER ?? 'dev@localhost'

export const transporter = hasCredentials
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : nodemailer.createTransport({ jsonTransport: true })
```

- [ ] **Step 5: Write `sendEmail`**

Create `lib/server/email/send.ts`:

```ts
import 'server-only'

import { render } from '@react-email/components'
import type { ReactElement } from 'react'

import { emailFrom, hasCredentials, transporter } from './transport'

/**
 * The one place mail leaves this app.
 *
 * Every caller goes through here, so swapping Gmail for a domain sender, or
 * putting an outbox with retries in front of the send, is a change to this file
 * and transport.ts and to nothing that calls them.
 *
 * Both bodies are rendered from the same element. Multipart is better for
 * deliverability, and it means the console output is the exact text a text-only
 * client would receive rather than a second rendering that could drift from it.
 *
 * Nothing logged here contains SMTP_PASS.
 */
export async function sendEmail(params: {
  to: string
  subject: string
  react: ReactElement
}): Promise<void> {
  const { to, subject, react } = params

  const [html, text] = await Promise.all([
    render(react),
    render(react, { plainText: true }),
  ])

  await transporter.sendMail({ from: emailFrom, to, subject, html, text })

  if (!hasCredentials) {
    console.log(
      `[email] to=${to} from=${emailFrom}\n[email] subject: ${subject}\n\n${text}`,
    )
  }
}
```

- [ ] **Step 6: Add the send trigger to the dev route**

Modify `app/dev/emails/[template]/route.tsx`. Add the import:

```ts
import { receiptSubject } from '@/components/email/receipt'
import { sendEmail } from '@/lib/server/email/send'
```

and, after the `template !== 'receipt'` guard, before the render:

```ts
  // ?send=<address> exercises the whole path — render, transport, log — without
  // running a Stripe checkout. Dev only, like everything else on this route.
  const to = _request.nextUrl.searchParams.get('send')
  if (to) {
    await sendEmail({
      to,
      subject: receiptSubject(),
      react: <ReceiptEmail {...FIXTURES.receipt} />,
    })
    return new Response(`Sent to ${to}\n`)
  }
```

Rename the first parameter from `_request` to `request` — it is used now — and
update its use above.

- [ ] **Step 7: Verify the console transport**

With no `SMTP_USER`/`SMTP_PASS` in `.env` (confirm: `grep -c SMTP .env` → `0`),
and Gabi's `npm run dev` running:

Run: `curl -s "http://localhost:3000/dev/emails/receipt?send=someone@example.com"`
Expected: `Sent to someone@example.com`

In the dev-server terminal, expect:
```
[email] to=someone@example.com from=dev@localhost
[email] subject: Your receipt from Creator Commerce
```
followed by the plain-text receipt — product names, prices, the total, and the
urls. No HTML tags, no stack trace.

If the terminal shows nothing, `hasCredentials` was true: something in `.env` is
setting SMTP variables.

- [ ] **Step 8: Verify the SMTP transport**

ASK GABI: add `SMTP_USER` and `SMTP_PASS` (a Google App Password) to `.env`,
optionally `EMAIL_FROM`, and restart `npm run dev` — the transport is chosen at
module load, so a running server will not pick them up.

Run: `curl -s "http://localhost:3000/dev/emails/receipt?send=<Gabi's address>"`
Expected: `Sent to <address>`, no console block this time, and the mail arrives.

Open it in Gmail web and Gmail mobile. Check: green button, readable line items,
the long product name wrapping, the total correct. Then remove the credentials
from `.env` again before continuing, so Task 4 is tested on the console path
first.

- [ ] **Step 9: Document the environment**

Modify `CLAUDE.md`, appending to the `# Email` section from Task 1:

```markdown
Sending goes through one choke point, `sendEmail` in `lib/server/email/send.ts`,
over one nodemailer transporter picked at module load by
`lib/server/email/transport.ts`:

- `SMTP_USER` — the Gmail address.
- `SMTP_PASS` — a Google **App Password**; 2FA must be on for the account.
- `EMAIL_FROM` — optional, defaults to `SMTP_USER`.

Both credentials absent is a supported state, not a broken one: the transporter
becomes nodemailer's `jsonTransport`, which builds the message without opening a
socket, and `sendEmail` logs the headers and the plain-text body. So a fresh
clone can exercise the whole path, and no dev machine sends real mail by
accident.

Templates are viewed at `/dev/emails/<template>`, which 404s in production.
`?send=<address>` on the same url sends that template's fixture through
`sendEmail`.
```

- [ ] **Step 10: ASK GABI to typecheck and lint**

Commands for Gabi: `npx tsc --noEmit` then `npm run lint`

Expected: clean.

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json next.config.ts lib/server/email app/dev CLAUDE.md
git commit -m "feat: nodemailer transport with a console fallback" -m "Credentials decide the transport: both present means Gmail, either missing means nodemailer's jsonTransport plus a log. Both branches are transporters, so sendEmail never branches — which is also what makes it the single seam for a domain sender or an outbox later." -m "Claude-Session: https://claude.ai/code/session_011i8t68vmQNtmrNzdZcuiy8"
```

---

### Task 4: Send the receipt on a fulfilled checkout

**Files:**
- Modify: `lib/server/dal/users.ts`
- Create: `lib/server/email/receipt.tsx`
- Modify: `lib/server/checkout.ts:126-127`

**Interfaces:**
- Consumes: `sendEmail` (Task 3), `ReceiptEmail` / `receiptSubject` (Task 2),
  `Purchase` from `@/lib/server/db/schemas/purchase`.
- Produces:
  - `getUserEmail(userId: string): Promise<string | null>`
  - `sendReceiptEmail(purchases: Purchase[]): Promise<void>`

- [ ] **Step 1: Observe the gap**

Run: `grep -n "sendReceiptEmail\|deletePendingCheckoutSession(session.id)" lib/server/checkout.ts`

Expected: two `deletePendingCheckoutSession` hits (lines 122 and 126), no
`sendReceiptEmail`. Line 127 is `return promoted` — the receipt goes between
them.

- [ ] **Step 2: Add the DAL read**

Modify `lib/server/dal/users.ts`, appending:

```ts
/**
 * The address a transactional email goes to.
 *
 * The account email rather than what Stripe collected: this is where /purchases
 * and, later, password reset already live, and Stripe's field is whatever the
 * buyer typed into a checkout form — not necessarily an address tied to any
 * account.
 *
 * Not cache()d, unlike getUserByHandle: the caller is a webhook, not a render
 * pass, and it asks once.
 */
export async function getUserEmail(userId: string): Promise<string | null> {
  const [found] = await db
    .select({ email: user.email })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)

  return found?.email ?? null
}
```

- [ ] **Step 3: Write the receipt sender**

Create `lib/server/email/receipt.tsx`:

```ts
import 'server-only'

import { ReceiptEmail, receiptSubject } from '@/components/email/receipt'
import { getUserEmail } from '@/lib/server/dal/users'
import type { Purchase } from '@/lib/server/db/schemas/purchase'
import { sendEmail } from './send'

/**
 * The buyer's receipt for one fulfilled order.
 *
 * Its own module rather than more of checkout.ts, which is already the longest
 * file in lib/server/ and whose job is sequencing, not composing mail.
 *
 * Every row of one order shares a buyer, so the address is resolved once from
 * the first. A missing address logs and returns: the onDelete: 'restrict'
 * foreign key makes it near-impossible, and it is not worth an exception on a
 * path whose caller already swallows failures.
 */
export async function sendReceiptEmail(purchases: Purchase[]): Promise<void> {
  const [first] = purchases
  if (!first) return

  const to = await getUserEmail(first.buyerId)
  if (!to) {
    console.error(
      `[email] no address for buyer ${first.buyerId} — receipt for order ${first.orderId} not sent`,
    )
    return
  }

  await sendEmail({
    to,
    subject: receiptSubject(),
    react: (
      <ReceiptEmail
        orderId={first.orderId}
        appUrl={process.env.APP_URL!}
        items={purchases.map((purchase) => ({
          productId: purchase.productId,
          productName: purchase.productName,
          priceInCents: purchase.priceInCents,
        }))}
      />
    ),
  })
}
```

This file contains JSX — create it as `lib/server/email/receipt.tsx`.

- [ ] **Step 4: Wire it into fulfilment**

Modify `lib/server/checkout.ts`. Add to the imports:

```ts
import { sendReceiptEmail } from '@/lib/server/email/receipt'
```

Replace lines 126-127:

```ts
  await deletePendingCheckoutSession(session.id)
  return promoted
```

with:

```ts
  await deletePendingCheckoutSession(session.id)

  // promoted.length > 0 is the exactly-once rule, and it needs no new state:
  // whichever entry point loses the race promotes zero rows, and so does the
  // duplicate-purchase path above.
  //
  // Swallowed on purpose. Throwing returns a 500, Stripe retries in good faith,
  // and the retry's markCheckoutSessionPaid matches no pending rows and returns
  // [] — so the receipt is lost either way and the order additionally looks
  // unfulfilled to whoever reads the logs. Same trade deleteUploadedFiles makes:
  // the operation the buyer cares about succeeded.
  if (promoted.length > 0) {
    try {
      await sendReceiptEmail(promoted)
    } catch (error) {
      console.error(
        `[checkout] receipt failed for order ${promoted[0].orderId} (session ${session.id})`,
        error,
      )
    }
  }

  return promoted
```

- [ ] **Step 5: ASK GABI to typecheck**

Command for Gabi: `npx tsc --noEmit`

Expected: no errors. If `Purchase` lacks `productId`, `productName` or
`priceInCents`, read `lib/server/db/schemas/purchase.ts` — those columns exist,
so an error here means the import is wrong, not the schema.

- [ ] **Step 6: Verify on the console path**

With no SMTP credentials in `.env`, `npm run dev` running, and the Stripe CLI
forwarding webhooks, ASK GABI to complete one test-mode checkout with two
products in the cart.

Expected in the dev-server terminal:
- `stripe event: checkout.session.completed`
- one `[email]` block, addressed to the **account** email of the signed-in buyer
- both product names and both prices in the plain text, and a total that is
  their sum
- exactly **one** block, even though both the webhook and `/checkout/return`
  call `fulfillCheckoutSession`

Then confirm the order itself still landed: `/purchases` lists both products.

- [ ] **Step 7: Verify the race**

ASK GABI to run a checkout with the dev server's webhook forwarding **stopped**,
so `/checkout/return` fulfils alone. Expect exactly one `[email]` block. Restart
forwarding; Stripe delivers the queued event; expect **no second** block, because
`markCheckoutSessionPaid` now promotes nothing.

- [ ] **Step 8: Verify a real send**

ASK GABI to put `SMTP_USER`/`SMTP_PASS` back in `.env`, restart `npm run dev`,
and run one more test checkout. The receipt should arrive at the buyer's account
address. Click a product link in it while signed in — it should download that
file; signed out, it should land on the login page.

- [ ] **Step 9: ASK GABI for the full check**

Commands for Gabi: `npm run lint` then `npm run build`

Expected: clean. A build error naming nodemailer means `serverExternalPackages`
in Task 3 Step 2 did not take.

- [ ] **Step 10: Commit**

```bash
git add lib/server/dal/users.ts lib/server/email/receipt.tsx lib/server/checkout.ts
git commit -m "feat: email the buyer a receipt when a checkout is fulfilled" -m "Sent only when the promotion returned rows, which is the exactly-once rule already implied by the race between the webhook and the return handler. A failed send is logged and swallowed: throwing would 500 the webhook, and the retry would find nothing to promote, losing the receipt anyway." -m "Claude-Session: https://claude.ai/code/session_011i8t68vmQNtmrNzdZcuiy8"
```

---

## After the plan

Update `TODO.md` — the Notifications section currently describes this work in the
present tense as though it exists. Once these tasks land, the entries that stay
are the ones still true: the outbox with retries, the seller notification, the
personal-Gmail `from`, and `requireEmailVerification`. The line about receipt
delivery being fire-and-forget stays too — it now describes shipped code.
