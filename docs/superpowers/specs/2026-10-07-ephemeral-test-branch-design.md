# Ephemeral test database branch

## Problem

The e2e specs run against the staging/dev Neon database. They create users and
products there on every run and never remove them, and their results depend on
whatever else that database holds.

## Goal

Every test run gets its own empty Neon branch, created from staging's schema and
dropped when the run ends. Each test seeds the data it needs and removes it
afterwards. Both runners use it: Playwright (e2e) and Vitest's `server` project
(for DAL integration tests to come).

## Decisions

| Question | Choice | Why |
| --- | --- | --- |
| Which runners | Playwright and Vitest `server` | Vitest DAL tests are planned; one lifecycle serves both. |
| Branch contents | Schema only | Deterministic; no staging rows (or their PII) in test runs. |
| Seed shape | Factory functions per scope | Parallel tests cannot collide; each builds only what it needs. |
| Creating users | Direct insert, password hashed by `better-auth/crypto` | Works without a server (Vitest), sends no mail, no rate limiter. |
| Lifecycle owner | Wrapper script around the runner | Playwright starts `webServer` before `globalSetup`, so the branch must exist before Playwright starts. |

Rejected: per-runner `globalSetup` (Playwright re-evaluates its config per
worker, so creating the branch there needs fragile env guards); one long-lived
`test` branch reset per run (concurrent runs reset it under each other).

## 1. Branch lifecycle — `scripts/with-test-branch.ts`

`tsx scripts/with-test-branch.ts <cmd…>`:

1. **Config.** Reads `NEON_PROJECT_ID` and `NEON_PARENT_BRANCH` (the staging
   branch). Authenticates with `NEON_API_KEY`, or locally the CLI's own
   `neon auth` session. A missing variable fails with its name — there is no
   fallback to the staging connection string.
2. **Create.** `neon branches create --project-id … --parent $NEON_PARENT_BRANCH
   --name test-<user>-<yyyymmdd-hhmmss>-<rand> --schema-only --expires-at <now+2h>
   --output json`, then `neon connection-string <branch> --pooled`. The `test-`
   prefix makes leftovers findable; the expiry is the backstop for a crashed run.
   If `--schema-only` is refused for this parent, the script fails — it never
   falls back to a full copy.
3. **Migrate.** `drizzle-kit migrate` against the branch url. A no-op when
   staging is current; applies an unmerged migration otherwise.
4. **Run.** Spawns `<cmd>` with inherited stdio and env
   `PG_CONNECTION_STRING=<branch url>`, `TEST_BRANCH=<branch name>`. Exits with
   the command's exit code.
5. **Drop.** `neon branches delete` in `finally` and on SIGINT/SIGTERM.
   `KEEP_TEST_BRANCH=1` skips the delete and prints the branch name. A failed
   delete prints the name and exits non-zero.

Each step names itself in its error ("creating branch", "migrating", "deleting
branch <name>").

`npm run test:branches:prune` deletes every `test-*` branch older than a few
hours, for anything that slipped past the expiry.

Scripts:

```json
"test:unit": "tsx scripts/with-test-branch.ts vitest",
"test:e2e": "tsx scripts/with-test-branch.ts playwright test",
"test:branches:prune": "tsx scripts/prune-test-branches.ts"
```

### Playwright server

The test server moves to **port 3100**, with `APP_URL=http://localhost:3100` in
its `env` and `reuseExistingServer: false` when `TEST_BRANCH` is set. A
hand-started `next dev` on 3000 — pointed at staging — can then never be reused
by a test run. `playwright.config.ts` throws when `TEST_BRANCH` is unset:
"run through `npm run test:e2e`".

## 2. Seed module — `test/seed/`

Shared by both runners. Imports the table definitions from
`lib/server/db/schemas/*` (they carry no `server-only` marker) and builds its own
drizzle client from `PG_CONNECTION_STRING`; it does not import `lib/server/db`.

**Guard:** the module throws on import unless `TEST_BRANCH` is set, so nothing
can seed or wipe staging by running a runner directly.

```ts
const scope = createSeedScope()          // tag: `t<random6>`
const seller = await scope.user({ name: 'Seller', emailVerified: true })
//   → { id, email: `${tag}-seller-1@example.com`, handle: `${tag}-seller-1`, password }
const product = await scope.product(seller, { priceInCents: 1250, status: 'published' })
//   → { id, name, slug, url }   (url = `/@handle/id/slug`)
await scope.cleanup()
```

- `user(opts)` inserts a `user` row and an `account` row
  (`providerId: 'credential'`, `accountId` = user id, password hashed with
  `hashPassword` from `better-auth/crypto`). Defaults: `emailVerified: false`, a
  fixed test password.
- `product(owner, opts)` inserts a product with `fileKey: null`. Defaults:
  published, a tagged name, slug derived from it.
- No `purchase()` factory: the only purchase today comes from the checkout flow
  under test. Add one when a test needs it.
- `scope.tag` is exposed so a spec can name users it creates through the UI
  (`signup.spec.ts`) such that cleanup finds them.
- `cleanup()`, in order:
  1. select users with `email like '<tag>-%@example.com'`;
  2. delete `purchases` where they are buyer or seller (both FKs `restrict`);
  3. delete those users — cascades products, uploads, image uploads, sessions,
     accounts, AI generation rows and OAuth rows.

  A failing cleanup fails the test.

### Hooks

- **Playwright** — `e2e/fixtures.ts` exports `test` extended with a test-scoped
  `seed` fixture: a fresh scope before each test, `cleanup()` after it, failed or
  not. Per test rather than per file, because under `fullyParallel` one file's
  tests run across workers and `beforeAll` runs once per worker. Specs import
  `test`/`expect` from `./fixtures`.
- **Vitest** — `useSeedScope()` registers `beforeAll`/`afterAll` for the file
  and returns the scope. A Vitest file runs in one worker, so per file is safe.

## 3. Spec migration

- `login.spec.ts` — `seed.user()` replaces the API signup.
- `signup.spec.ts` — keeps the form; email and handle built from `seed.tag`.
- `purchase.spec.ts` — seller and buyer via `seed.user()`, the buyer signed in
  over `/api/auth/sign-in/email` through `page.request`, which shares the page's
  cookies; `seed.product()` replaces the raw `neon` insert.
- The `signUp()` helpers and the `Date.now()` ids go away.

## Verification

- Claude: `tsc`, `lint`.
- Gabi: `npm run test:e2e` and `npm run test:unit` pass; `neon branches list`
  shows the branch during the run and not after.
- `npx playwright test` without the wrapper refuses to start.
- Ctrl-C mid-run still deletes the branch.
- `KEEP_TEST_BRANCH=1` leaves a branch; `test:branches:prune` removes it.

## Docs

- `CLAUDE.md` — new `# Testing` section: the wrapper and its env, the
  `TEST_BRANCH` guard, port 3100, the `seed` fixture, cleanup by tag,
  `KEEP_TEST_BRANCH` and prune.
- `.env.example` — `NEON_API_KEY`, `NEON_PROJECT_ID`, `NEON_PARENT_BRANCH`.
