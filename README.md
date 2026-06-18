# Creator Commerce Full-Stack
### SaaS multi-user cu Next.js 16, Drizzle ORM, Stripe și AI

| **60 ore** | **Nivel** | **Format** | **Rezultat** |
|---|---|---|---|
| 20 sesiuni × 3h | beginner | pas cu pas + proiect | SaaS funcțional |

*Un program practic pentru începători care vor să învețe full-stack construind pas cu pas o aplicație SaaS reală de creator commerce.*

---

## Pe scurt

**Participanții construiesc ghidat, cap-coadă, un SaaS multi-user:** fiecare creator are un storefront public, publică produse digitale, încasează plăți prin Stripe și livrează descărcări protejate cumpărătorilor. Cursul introduce gradual React, Next.js, baze de date, autentificare, plăți și integrare AI, cu accent pe practică și înțelegere pas cu pas.

---

## Pentru cine este cursul

| **Potrivit pentru** | **Cunoștințe recomandate** |
|---|---|
| Începători motivați, juniori sau persoane cu cunoștințe de bază de programare care vor să învețe full-stack printr-un proiect real, construit pas cu pas. | React: nu este necesară experiență avansată<br>Next.js: se pornește de la bază<br>HTML/CSS: nivel de bază util<br>JavaScript/TypeScript și Git: noțiuni minime, explicate pe parcurs |

> Deși produsul final este complex, cursul este gândit pentru nivel beginner — conceptele sunt introduse progresiv, iar participanții construiesc împreună cu trainerul.

---

## Produsul final construit în curs

- Storefront public pentru fiecare creator: `/@handle` și `/@handle/{slug}`
- Dashboard pentru produse, vânzări, analytics și descărcări
- Publicare produse digitale cu asset, cover image, status Draft/Published și SEO
- Checkout Stripe cu metadata pentru `buyerId`, `sellerId` și `productId`
- Descărcări protejate, accesibile doar cumpărătorului valid
- Generare AI a paginii de produs din fișierul digital, cu teaser public per tip de fișier
- Deploy pe Vercel, logging, Sentry/PostHog și checklist de producție

---

## Format de lucru

| **Explicații pas cu pas** | **Lucru ghidat** | **Q&A / clarificări** |
|---|---|---|
| ~2h / sesiune — trainerul explică și implementează împreună cu grupa, fără a presupune experiență avansată | ~45m / sesiune — participanții aplică pe propriul proiect, cu suport și recapitulări frecvente | ~15m / sesiune — întrebări, debugging, recapitulare și pregătire pentru sesiunea următoare |

---

## Principii urmărite

- **Cod organizat de la început:** Accesul la date și verificările de autorizare trăiesc în `lib/dal` — participanții înțeleg de ce, nu doar cum.
- **Multi-user simplu:** Fiecare entitate are `ownerId`; fiecare operație verifică că userul poate face acea acțiune.
- **Commerce realist:** Stripe Checkout, webhooks, descărcări protejate și extensie opțională Stripe Connect.
- **AI integrat natural:** Generare pagină de produs și teaser direct din fișierul digital uploadat.

---

## Curriculum pe module

| **Modul** | **Durată** | **Ce acoperă** |
|---|---|---|
| 1. Fundamente și setup | 6h | Next.js 16, React Server Components, App Router, shadcn UI, layout-uri de bază, dashboard/products/sales, introducere multi-user și handle public |
| 2. Routing, flux de date și DAL | 9h | Nested layouts, loading/error/not-found, structură `lib/dal`, Drizzle + Neon, schema multi-user, seed cu utilizatori multipli și caching |
| 3. Auth, formulare și upload | 9h | Better Auth, `requireUser()`, protejarea rutelor, React Hook Form, zod, next-safe-action, UploadThing, validări fișiere |
| 4. Commerce core | 12h | Stripe Checkout, metadata buyer/seller/product, webhooks, Purchase, KPI-uri, descărcări protejate, management produse și analytics |
| 5. Storefront, AI și observabilitate | 12h | Rute publice `/@handle`, SEO, AI-assisted product page, teaser per tip de fișier, rate limiting, Sentry, PostHog, performanță |
| 6. Deploy, polish și demo | 12h | Vercel, environment-uri, migrații Drizzle, test end-to-end, UI polish, QA, README, extensii și Demo Day |

---

## Planul detaliat al celor 20 de sesiuni

**Sesiunea 1 — Next.js 16 și harta cursului:** De ce React și Next.js, App Router, RSC, route handlers, server actions, proiect nou, shadcn UI, layout de bază, scaffold `/dashboard` / `/products` / `/sales`, handle public.

**Sesiunea 2 — RSC vs client și Cursor AI:** Server/client components, primitive UI shadcn, layout shell reutilizabil, Cursor AI mod de lucru și prompturi, generare `ProductCard` și `SalesTable`, pagina `/settings`.

**Sesiunea 3 — Routing și layout-uri avansate:** Nested layouts, `loading.tsx`, `error.tsx`, `not-found` pentru `/products/[id]`.

**Sesiunea 4 — Organizarea codului de server:** Structură `lib/dal` — unde trăiesc interogările la baza de date, module separate users/products/purchases, fiecare user vede doar datele lui, `getDashboardMetrics(userId)`.

**Sesiunea 5 — Drizzle ORM, Neon și caching:** Conectare Drizzle la Neon Postgres, schema cu `Product.ownerId` / `Purchase.buyerId` / `User.handle`, constrângeri și indexări, seed cu utilizatori multipli, `revalidateTag` per owner.

**Sesiunea 6 — Autentificare cu Better Auth:** Sesiune și current user, protejarea rutelor, `requireUser()`, login/logout, redirect după autentificare.

**Sesiunea 7 — Formulare și server actions:** shadcn UI + React Hook Form, validare cu zod, next-safe-action, Create/Update Product, UI optimist, validări preț și monede.

**Sesiunea 8 — Upload-uri cu UploadThing:** Callback-uri server, prefix per owner, atașare asset digital la produs, upload cover image, validări fișiere și mesaje de eroare.

**Sesiunea 9 — Stripe Checkout:** Setup Stripe, checkout session, metadata `buyerId` / `sellerId` / `productId`, success/cancel URLs, buton Buy pe storefront.

**Sesiunea 10 — Webhooks și achiziții:** Ce este un webhook și de ce îl folosim, verificare semnătură Stripe, creare `Purchase` la plată confirmată, revalidare cache, KPI-uri revenue și units sold.

**Sesiunea 11 — Descărcări protejate:** Rute securizate de download, verificare `buyerId`, pagina `/downloads`, redirect după plată, rate limiting simplu.

**Sesiunea 12 — Management produse și analytics:** Draft vs Published, filtrare, căutare, paginare, duplicare produs, sales analytics, top 5 produse.

**Sesiunea 13 — Storefront public și SEO:** Routing `/@handle`, pagini publice de produs, doar produse Published vizibile, metadata SEO, sitemap/robots opțional.

**Sesiunea 14 — AI-assisted product page:** File type router per `mimeType` (PDF, ZIP, imagine, audio), Vercel AI SDK `streamObject` + schema zod cu câmpuri completate live, vision model / `pdf-parse` / `adm-zip`, teaser generation per tip, `<ProductTeaser>` pe storefront, rate limiting pe endpoint AI.

**Sesiunea 15 — Observabilitate și analytics:** Sentry server/client, error boundaries, logging webhooks, PostHog sau tracking custom, funnel și KPI-uri.

**Sesiunea 16 — Performanță și securitate de bază:** Strategii de caching în Next.js, evitarea N+1, optimizări Drizzle, securizare server actions.

**Sesiunea 17 — Deploy:** Environment-uri, migrații Drizzle, Stripe `APP_URL`, deploy pe Vercel, test end-to-end.

**Sesiunea 18 — Polish UI:** Tabele îmbunătățite, empty states, toasts, onboarding checklist, pagina "Cum vinzi primul produs".

**Sesiunea 19 — Feature freeze și QA:** Checklist producție, bug bash, fixuri finale, README final.

**Sesiunea 20 — Extensii și Demo Day:** Subscriptions, Teams/Organisations, Stripe Connect overview, design doc pentru o extensie, demo live Creator vinde → Buyer cumpără și descarcă.

---

## Resurse introductive
- [Web Development - Core](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core) - MDN
- [Web Development - Server-side](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Server-side) - MDN
- [React Quick Start](https://react.dev/learn) - react.dev
- [React Foundations](https://nextjs.org/learn/react-foundations) - nextjs.org
- [From React to Next.js](https://nextjs.org/learn/react-foundations/from-react-to-nextjs) - nextjs.org

## Stack tehnic

- [Next.js 16](https://nextjs.org)
- [React](https://react.dev)
- [Drizzle ORM](https://orm.drizzle.team)
- [Neon Postgres](https://neon.tech)
- [Better Auth](https://www.better-auth.com)
- [Stripe](https://stripe.com)
- [Vercel](https://vercel.com)
- [UploadThing](https://uploadthing.com)
- [next-safe-action](https://next-safe-action.dev)
- [React Hook Form](https://react-hook-form.com)
- [zod](https://zod.dev)
- [shadcn UI](https://ui.shadcn.com)
- [Sentry](https://sentry.io)
- [PostHog](https://posthog.com)
- [Vercel AI SDK](https://sdk.vercel.ai)
- [Cursor AI](https://cursor.com)

Stack-ul este predat gradual — nicio tehnologie nu este presupusă cunoscută dinainte.
