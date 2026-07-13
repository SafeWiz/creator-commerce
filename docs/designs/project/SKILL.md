---
name: creator-commerce-design
description: Use this skill to generate well-branded interfaces and assets for Creator Commerce (a multi-user SaaS where creators sell digital products via public storefronts + Stripe), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.
If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.
If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick map
- `readme.md` — full design guide: content voice, visual foundations, iconography, component index.
- `styles.css` — the one stylesheet to link; `@import`s all tokens + fonts.
- `tokens/` — colors (olive neutrals + green primary, OKLCH), typography (Nunito Sans / Roboto / Geist Mono), spacing, radius, shadows.
- `components/` — React primitives: forms/ (Button, Input, Label), display/ (Card, Badge, Separator, Skeleton), overlay/ (Tooltip). Load `_ds_bundle.js`, read from `window.CreatorCommerceDesignSystem_0c16ec`.
- `guidelines/` — foundation specimen cards.
- `ui_kits/dashboard/` — interactive dashboard recreation to copy patterns from.

## House rules (short)
- Sentence case; buttons are verbs; one green primary action per view.
- Money/counts/IDs in Geist Mono. Headings in Roboto **medium** (not bold).
- Icons: Lucide only, 16px, 2px stroke, currentColor. No emoji.
- Elevation = 1px hairline rings, not drop shadows. Compact 32px controls.
