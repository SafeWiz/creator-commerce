@AGENTS.md

# Documentation

Write all documentation (docs/, README updates, code comments) in English only.

Every module under `lib/server/` starts with `import 'server-only'` so it can
never be pulled into a client bundle.

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

**Session/auth helpers** live in `lib/server/session.ts`, not the DAL. Callers
(actions, pages, layouts) resolve the user there and pass ids down:
- `getUser()` is `cache()`-wrapped so repeated calls in one render pass hit the
  session once; `requireUser()` wraps it and redirects to `/login` when absent.