# Creator Commerce — Design System

A design system for **Creator Commerce**, a multi-user SaaS where each creator gets a public storefront, publishes digital products, takes payments through Stripe, and delivers protected downloads to buyers. Every account can both **sell** and **buy**.

This system is a faithful recreation of the product's real UI: a **shadcn "base-nova"** stack (Next.js 16 + React 19 + Tailwind v4), olive-neutral palette with a green primary, Lucide icons.

## Sources

Built by reading the product's own code. Explore these to go deeper:

- **GitHub:** `gimre/creator-commerce` — https://github.com/gimre/creator-commerce
  - `README.md` — course/product overview (the app is the capstone of a full-stack course; README is in Romanian).
  - `docs/site-tree.md` — the canonical map of pages, grouped by layout (Marketing, Storefront, Centered-card, Dashboard).
  - `app/globals.css` — the source of truth for color/radius tokens (copied verbatim into `tokens/`).
  - `components/ui/*.tsx` — the shadcn primitives recreated here.
  - `app/layout.tsx` — declares the three webfonts (Nunito Sans, Roboto, Geist Mono).

> The reader is not assumed to have access; links are stored for those who do.

## Products / surfaces

Per `docs/site-tree.md`, the product is four layouts:

1. **Dashboard** (auth-protected app shell — sidebar + topbar): Overview, Products, Sales, Purchases, Downloads, Wishlist, Settings, Help, plus product create/edit forms. → `ui_kits/dashboard/`
2. **Storefront** (public, creator-branded): `/@handle` product grid, `/@handle/{slug}` product detail with Buy, and checkout success. → `ui_kits/storefront/`
3. **Centered-card**: login, signup, checkout success/cancel. → `ui_kits/auth/`
4. **Marketing**: landing page. → `ui_kits/marketing/`

---

## Content fundamentals

How Creator Commerce writes. The **in-app UI copy is English**; the course README is Romanian (that's teaching material, not product voice — follow the English UI).

- **Voice:** direct, second-person, action-first. "Sell your first digital product." "Connect Stripe to get paid." "Share your storefront link." Speak to the creator as *you*; the platform is invisible.
- **Tone:** plain, encouraging, unfussy. It's a tool for beginners — no jargon, no hype. Onboarding is framed as a checklist ("Get your first sale · 3 of 5 complete"), not marketing.
- **Casing:** Sentence case everywhere — headings, buttons, labels ("New product", "Save draft", "View all sales"). Never Title Case UI, never ALL CAPS except tiny uppercase eyebrow labels (table headers, section kickers) with wide tracking.
- **Buttons** are verbs: *Publish, Save draft, Duplicate, Delete, Generate, Connect Stripe*. One primary (green) action per view; everything else outline/ghost.
- **Numbers & money** are always mono (Geist Mono): `$29.00`, `142 units`, `ord_8fA2c1`. Prices carry the currency symbol; USD is the default.
- **Status language:** products are **Draft** or **Published**. Sales/buying split into "Selling" and "Buying" nav sections.
- **Emoji:** none. The product uses Lucide icons, never emoji, never unicode symbols as icons.
- **Empty/loading states** are honest and short ("No products match.", skeleton rows) — no cutesy filler.

---

## Visual foundations

- **Color:** an **olive-tinted neutral** ramp (warm gray, hue ~107 in OKLCH) carries almost the entire UI — text, surfaces, borders, the sidebar. A single **green primary** (`--primary` = `oklch(0.527 0.154 150)`) marks the one important action, active nav, and Published status. **Destructive** is a *tinted* treatment (10% red background + red text), not a solid red fill. Secondary is a cool near-neutral. No gradients in product chrome (a faint one only stands in for missing cover images). See `tokens/colors.css`.
- **Type:** three families. **Roboto** (`--font-heading`) for page/card titles at **medium (500)**, tracking `-0.02em` — headings are medium, *not* bold. **Nunito Sans** (`--font-sans`) for all body/UI at a small **14px baseline** (this is a dense app). **Geist Mono** (`--font-mono`) for money, counts, IDs. See `tokens/typography.css`.
- **Spacing:** 0.25rem base unit; dense rhythm (gaps of 1–2 units inside controls). Cards use a `--card-spacing` token (16px default, 12px compact). Controls are compact: **32px** default button/input height. See `tokens/spacing.css`.
- **Radius:** base **0.45rem (~7px)**. Buttons/inputs = `lg` (7px), cards = `xl` (~10px), badges = `4xl` (pill). Exact values, not snapped to a 4/8 grid. See `tokens/radius.css`.
- **Elevation:** carried by **1px hairline rings** (`box-shadow: 0 0 0 1px foreground/10`), *not* drop shadows. Cards get a ring; only popovers/tooltips/sheets get a soft real shadow. See `tokens/shadows.css`.
- **Borders:** hairline, olive-100. Dividers and table row separators are the same 1px border. Inputs are transparent-fill with a 1px border and a **3px translucent focus ring**.
- **Backgrounds:** flat white surfaces; the sidebar is a barely-off-white (`--sidebar`, olive-25). No textures, no patterns, no imagery in chrome. Product cover images are the only imagery.
- **Cards:** flat white, ~10px radius, hairline ring, 16px padding; a leading `<img>` bleeds to the top corners; a footer becomes a muted, top-bordered bar.
- **Motion:** restrained and fast. Color/background transitions ~150ms ease; buttons translate down **1px** on `:active`; skeletons pulse ~1.6s. No bounces, no decorative loops.
- **Hover/press:** buttons darken (primary mixes ~20% toward transparent/foreground); ghost/outline fill with `--muted`; press = 1px translate. Nav items fill with `--sidebar-accent`.
- **Transparency & blur:** used sparingly — `color-mix` tints for the destructive button and AI callout; the mobile sidebar sheet uses a light backdrop blur.

---

## Iconography

- **Set:** **Lucide** (`lucide-react` in source). This is the only icon system — no icon font, no custom SVG set, no emoji, no unicode glyphs.
- **Style:** outline, **2px stroke**, no fill, `currentColor` so icons inherit text color. Default **16px** in-app (14px inside small buttons, 20px in nav/marketing).
- **Usage:** one leading icon per nav item, icon-only ghost buttons for row actions (with a Tooltip), a `sparkles` glyph for anything AI. Common glyphs: `layout-dashboard, package, trending-up, receipt, download, heart, settings, plus, panel-left, search, sparkles, chevron-*`.
- **In this system:** cards and kits load Lucide from CDN (`unpkg.com/lucide`) and render via a small `Icon` component. See `guidelines/iconography.card.html`.

---

## Components

Reusable primitives (recreations of the source `components/ui`). React, token-driven, self-contained. Namespace: `window.CreatorCommerceDesignSystem_0c16ec`.

- **Button** — `components/forms/` — action control; 7 variants × 4 sizes (+ icon sizes).
- **Input** — `components/forms/` — text field / textarea (`asTextarea`), with invalid state.
- **Label** — `components/forms/` — form field caption.
- **Card** — `components/display/` — content surface + `CardHeader/Title/Description/Action/Content/Footer`.
- **Badge** — `components/display/` — status pill (Draft/Published), 5 variants, optional dot.
- **Separator** — `components/display/` — 1px divider, horizontal/vertical.
- **Skeleton** — `components/display/` — pulsing loading placeholder.
- **Tooltip** — `components/overlay/` — hover/focus label on a dark popup.

Each component ships `<Name>.jsx` + `<Name>.d.ts` + `<Name>.prompt.md`, with a `@dsCard` showcase per directory.

### Intentional additions

None. The component inventory is exactly the source's `components/ui` set. (Complex primitives — Sidebar, NavigationMenu, Sheet — are recreated as composed layout inside the Dashboard UI kit rather than shipped as standalone primitives, since the product only ever uses them as app chrome.)

---

## Foundations (Design System tab)

Specimen cards live in `guidelines/`, grouped **Colors** (primary ramp, olive neutrals, semantic roles), **Type** (Roboto / Nunito Sans / Geist Mono), **Spacing** (scale, control heights), and **Brand** (radius, elevation, wordmark, iconography).

---

## Index / manifest

- `styles.css` — global entry point (consumers link this only). `@import`s everything below.
- `tokens/` — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `radius.css`, `shadows.css`.
- `components/` — `forms/` (Button, Input, Label), `display/` (Card, Badge, Separator, Skeleton), `overlay/` (Tooltip).
- `guidelines/` — foundation specimen cards.
- `ui_kits/dashboard/` — interactive dashboard recreation (shell + Overview, Products, Product form).
- `ui_kits/storefront/` — interactive public storefront (creator grid → product detail → checkout success).
- `ui_kits/marketing/` — marketing landing page (header, hero, features, how-it-works, CTA, footer).
- `ui_kits/auth/` — centered-card layouts (login, signup, checkout success / cancel).
- `SKILL.md` — Agent-Skills-compatible entry point.

## Caveats

- **Fonts** are loaded from the Google Fonts CDN (same three families the source loads via `next/font`). Swap `tokens/fonts.css` for self-hosted `woff2` if you need offline/pinned versions.
- **Logo:** the source repo ships no mark, so an original one was designed — the interlocking **CC** monogram (one neutral C for *Creator*, one green C for *Commerce*) paired with the Roboto wordmark. Files: `assets/logo.svg` (full color) and `assets/logo-mono.svg` (single-color / `currentColor`). See the **Logo** card in the Brand group.
- All four product layouts (Dashboard, Storefront, Marketing, Centered-card auth) now have UI kits.
