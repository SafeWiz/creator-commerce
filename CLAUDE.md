@AGENTS.md

# Documentation

Write all documentation (docs/, README updates, code comments) in English only.

**Server actions** (`lib/actions/*`) parse input, l a DAL function, then
handle Next.js concerns (`revalidatePath`, direct`). They never query tables.

**DAL modules** start with `import 'server-only'`.
DAL functions resolve the current user themselves  `requireUser()` from
`lib/server/dal/user.ts` — they do not take a erId` parameter. This keeps the
  ownership check attached to the query instead of relying on every call site.
- `getUser()` is `cache()`-wrapped so repeated calls in one render pass hit the
  session once; `requireUser()` wraps it and redirects to `/login` when absent.
- Domain rules that every caller needs (e.g. deriving a product slug from its
  name) belong in the DAL, not in the action.