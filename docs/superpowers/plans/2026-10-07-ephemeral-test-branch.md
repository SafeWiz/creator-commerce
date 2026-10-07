# Ephemeral Test Branch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every test run (Playwright and Vitest) gets a throwaway schema-only Neon branch of staging; each test seeds what it needs through tagged factories and deletes it afterwards.

**Architecture:** A wrapper script (`scripts/with-test-branch.ts`) creates the branch with the `neonctl` CLI, migrates it, runs the test command with `PG_CONNECTION_STRING`/`TEST_BRANCH` pointing at it, and deletes it afterwards. A seed module (`test/seed/`) inserts users and products tagged with a per-scope id and deletes by that tag; Playwright gets it as a test-scoped fixture, Vitest as a per-file hook.

**Tech Stack:** neonctl 2.x, drizzle-orm (neon-http), drizzle-kit, better-auth/crypto, Playwright 1.63, Vitest 4, tsx.

**Spec:** `docs/superpowers/specs/2026-10-07-ephemeral-test-branch-design.md`

## Global Constraints

- Branches are created `--schema-only` from `NEON_PARENT_BRANCH`. Never fall back to a full copy.
- Branch names start with `test-`; expiry backstop is 2 hours (`--expires-at`).
- Env the wrapper reads: `NEON_PROJECT_ID`, `NEON_PARENT_BRANCH` (required); `NEON_API_KEY` (optional — neonctl reads it itself, else its `neon auth` session); `KEEP_TEST_BRANCH=1` (optional).
- Env the wrapper sets for the child: `PG_CONNECTION_STRING=<branch url>`, `TEST_BRANCH=<branch name>`.
- `test/seed/` throws on import without `TEST_BRANCH`; `playwright.config.ts` throws without it.
- Playwright's app server runs on port **3100**, `reuseExistingServer: false`, `APP_URL=http://localhost:3100`.
- Seed emails are `<tag>-<label>-<n>@example.com`; cleanup deletes by `email like '<tag>-%@example.com'`. Tag is `t` + 6 hex chars.
- Seed password: `correct-horse-battery`.
- Code comments in English; match surrounding style (single quotes, no semicolons in `e2e/`, `test/`, `scripts/`).
- Per memory: Claude runs `npx tsc --noEmit` and `npm run lint`; Gabi runs installs, the test suites and anything touching Neon.

## File Structure

| File | Responsibility |
| --- | --- |
| `scripts/test-branch/neon.ts` (create) | Pure helpers (branch name, config read, JSON parse, staleness) + a thin `neonctl` runner |
| `scripts/test-branch/neon.test.ts` (create) | Unit tests for the pure helpers |
| `scripts/with-test-branch.ts` (create) | Lifecycle: create → migrate → run → delete |
| `scripts/prune-test-branches.ts` (create) | Deletes stale `test-*` branches |
| `test/seed/db.ts` (create) | `TEST_BRANCH` guard + drizzle client |
| `test/seed/scope.ts` (create) | `createSeedScope()`: `user`, `product`, `cleanup` |
| `test/seed/vitest.ts` (create) | `useSeedScope()` for Vitest files |
| `test/seed/scope.test.ts` (create) | Integration test of the seed module against the branch |
| `e2e/fixtures.ts` (create) | Playwright `test` with a `seed` fixture |
| `e2e/*.spec.ts` (modify) | Use the fixture |
| `playwright.config.ts` (modify) | Guard, port 3100, no reuse |
| `vite.config.mts` (modify) | Include `scripts/**` and `test/**` tests in the `server` project |
| `package.json` (modify) | Scripts, `neonctl` devDependency |
| `.env.example`, `CLAUDE.md` (modify) | Docs |

---

### Task 1: Neon helpers

**Files:**
- Create: `scripts/test-branch/neon.ts`
- Test: `scripts/test-branch/neon.test.ts`
- Modify: `vite.config.mts` (server project `include`)
- Modify: `package.json` (devDependency `neonctl`)

**Interfaces:**
- Produces:
  - `testBranchName(user: string, now: Date, rand: string): string`
  - `readNeonConfig(env: NodeJS.ProcessEnv): { projectId: string; parentBranch: string }` — throws naming the missing variable
  - `parseCreatedBranch(json: string): { id: string; name: string }`
  - `isStaleTestBranch(branch: { name: string; created_at: string }, now: Date, maxAgeMs: number): boolean`
  - `neonctl(args: string[]): Promise<string>` — runs `neonctl` with `--no-color --no-analytics`, resolves stdout, rejects with stderr

- [ ] **Step 1: Ask Gabi to install the CLI as a devDependency**

So CI and fresh clones don't depend on a global install. Gabi runs:

```bash
npm i -D neonctl
```

Expected: `package.json` gains `"neonctl": "^2.x"` under `devDependencies`; `npx neonctl --version` prints a 2.x version.

- [ ] **Step 2: Widen the Vitest server project's include**

In `vite.config.mts`, server project:

```ts
          include: ['lib/**/*.test.ts', 'scripts/**/*.test.ts', 'test/**/*.test.ts'],
```

- [ ] **Step 3: Write the failing test**

`scripts/test-branch/neon.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

import {
    isStaleTestBranch,
    parseCreatedBranch,
    readNeonConfig,
    testBranchName,
} from './neon'

describe('testBranchName', () => {
    it('is test-<user>-<utc timestamp>-<rand>', () => {
        // run
        const name = testBranchName('gimre', new Date('2026-10-07T09:05:03Z'), 'a1b2')

        // assertions
        expect(name).toBe('test-gimre-20261007-090503-a1b2')
    })

    it('reduces the user to lowercase letters, digits and dashes', () => {
        // run
        const name = testBranchName('Gabi O.Brien', new Date('2026-10-07T09:05:03Z'), 'a1b2')

        // assertions
        expect(name).toBe('test-gabi-o-brien-20261007-090503-a1b2')
    })
})

describe('readNeonConfig', () => {
    it('returns the project and parent branch', () => {
        // run
        const config = readNeonConfig({ NEON_PROJECT_ID: 'p-1', NEON_PARENT_BRANCH: 'staging' })

        // assertions
        expect(config).toEqual({ projectId: 'p-1', parentBranch: 'staging' })
    })

    it('names the missing variable', () => {
        // run + assertions
        expect(() => readNeonConfig({ NEON_PROJECT_ID: 'p-1' })).toThrow('NEON_PARENT_BRANCH')
        expect(() => readNeonConfig({ NEON_PARENT_BRANCH: 'staging' })).toThrow('NEON_PROJECT_ID')
    })
})

describe('parseCreatedBranch', () => {
    it('reads the branch out of `branches create --output json`', () => {
        // setup
        const json = JSON.stringify({
            branch: { id: 'br-cool-1', name: 'test-x' },
            endpoints: [],
            connection_uris: [],
        })

        // run + assertions
        expect(parseCreatedBranch(json)).toEqual({ id: 'br-cool-1', name: 'test-x' })
    })

    it('throws on output without a branch id', () => {
        // run + assertions
        expect(() => parseCreatedBranch('{}')).toThrow('branch id')
    })
})

describe('isStaleTestBranch', () => {
    const now = new Date('2026-10-07T12:00:00Z')
    const threeHours = 3 * 60 * 60 * 1000

    it('is true for an old test- branch', () => {
        // run + assertions
        expect(isStaleTestBranch({ name: 'test-a', created_at: '2026-10-07T08:00:00Z' }, now, threeHours)).toBe(true)
    })

    it('is false for a recent test- branch', () => {
        // run + assertions
        expect(isStaleTestBranch({ name: 'test-a', created_at: '2026-10-07T11:00:00Z' }, now, threeHours)).toBe(false)
    })

    it('is false for any branch not named test-', () => {
        // run + assertions
        expect(isStaleTestBranch({ name: 'staging', created_at: '2020-01-01T00:00:00Z' }, now, threeHours)).toBe(false)
    })
})
```

- [ ] **Step 4: Run it to make sure it fails**

Run: `npx vitest run --project server scripts/test-branch/neon.test.ts`
Expected: FAIL — cannot resolve `./neon`.

- [ ] **Step 5: Implement**

`scripts/test-branch/neon.ts`:

```ts
/**
 * The neonctl calls behind scripts/with-test-branch.ts and
 * scripts/prune-test-branches.ts, and the pure decisions around them.
 *
 * neonctl authenticates itself: NEON_API_KEY if set, else the session
 * `neonctl auth` stored. Nothing here reads the key.
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)

// Every branch this tooling creates starts with it, and prune deletes nothing
// that doesn't — the staging branch can never match.
export const TEST_BRANCH_PREFIX = 'test-'

export function testBranchName(user: string, now: Date, rand: string): string {
    const slug = user.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    const stamp = now.toISOString().slice(0, 19).replace(/-|:/g, '').replace('T', '-')
    return `${TEST_BRANCH_PREFIX}${slug}-${stamp}-${rand}`
}

export function readNeonConfig(env: NodeJS.ProcessEnv): { projectId: string; parentBranch: string } {
    const projectId = env.NEON_PROJECT_ID
    const parentBranch = env.NEON_PARENT_BRANCH
    if (!projectId) throw new Error('NEON_PROJECT_ID is not set (see .env.example)')
    if (!parentBranch) throw new Error('NEON_PARENT_BRANCH is not set (see .env.example)')
    return { projectId, parentBranch }
}

export function parseCreatedBranch(json: string): { id: string; name: string } {
    const parsed = JSON.parse(json) as { branch?: { id?: string; name?: string } }
    const id = parsed.branch?.id
    if (!id) throw new Error(`no branch id in neonctl output: ${json.slice(0, 200)}`)
    return { id, name: parsed.branch?.name ?? id }
}

export function isStaleTestBranch(
    branch: { name: string; created_at: string },
    now: Date,
    maxAgeMs: number,
): boolean {
    if (!branch.name.startsWith(TEST_BRANCH_PREFIX)) return false
    return now.getTime() - new Date(branch.created_at).getTime() > maxAgeMs
}

export async function neonctl(args: string[]): Promise<string> {
    try {
        const { stdout } = await run('neonctl', [...args, '--no-color', '--no-analytics'])
        return stdout.trim()
    } catch (error) {
        const stderr = (error as { stderr?: string }).stderr?.trim()
        throw new Error(stderr || (error as Error).message)
    }
}
```

- [ ] **Step 6: Run the tests to make sure they pass**

Run: `npx vitest run --project server scripts/test-branch/neon.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 7: Typecheck, lint, commit**

```bash
npx tsc --noEmit && npm run lint
git add scripts/test-branch vite.config.mts package.json package-lock.json
git commit -m "test: neonctl helpers for ephemeral test branches"
```

---

### Task 2: Branch lifecycle wrapper and prune

**Files:**
- Create: `scripts/with-test-branch.ts`
- Create: `scripts/prune-test-branches.ts`
- Modify: `package.json` (scripts)
- Modify: `.env.example`

**Interfaces:**
- Consumes (Task 1): `testBranchName`, `readNeonConfig`, `parseCreatedBranch`, `isStaleTestBranch`, `neonctl`, `TEST_BRANCH_PREFIX`.
- Produces: child process env `PG_CONNECTION_STRING`, `TEST_BRANCH`; npm scripts `test:unit`, `test:e2e`, `test:branches:prune`.

- [ ] **Step 1: Write the wrapper**

`scripts/with-test-branch.ts`:

```ts
/**
 * Runs a command against a throwaway Neon branch.
 *
 * Creates a schema-only branch of NEON_PARENT_BRANCH, applies any migration
 * staging doesn't have yet, runs the command with PG_CONNECTION_STRING pointed
 * at the branch and TEST_BRANCH set to its name, then deletes the branch.
 *
 * Schema-only on purpose: the tests see only the rows they seed, and no staging
 * row — real people's emails among them — ends up in a test run. If Neon
 * refuses a schema-only branch of this parent, this fails; it never falls back
 * to a full copy.
 *
 * A wrapper rather than a globalSetup because Playwright starts its webServer
 * before globalSetup runs, and the app server must already be pointed at the
 * branch when it starts.
 *
 * The branch also carries a 2-hour expiry, so one a crashed run leaves behind
 * deletes itself; `npm run test:branches:prune` catches anything else.
 *
 * Usage:
 *   tsx scripts/with-test-branch.ts <command> [args...]
 *   KEEP_TEST_BRANCH=1 npm run test:e2e   # leaves the branch for inspection
 */
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { userInfo } from 'node:os'

import { neonctl, parseCreatedBranch, readNeonConfig, testBranchName } from './test-branch/neon'

const EXPIRY_MS = 2 * 60 * 60 * 1000

async function step<T>(label: string, fn: () => Promise<T>): Promise<T> {
    try {
        return await fn()
    } catch (error) {
        throw new Error(`with-test-branch: ${label} failed: ${(error as Error).message}`)
    }
}

function runCommand(command: string, args: string[], env: NodeJS.ProcessEnv): Promise<number> {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, { stdio: 'inherit', env })
        // Ctrl-C reaches the child from the terminal on its own; swallowing it
        // here keeps this process alive until the child exits, so the branch is
        // still deleted. SIGTERM (CI cancelling) only reaches this process, so
        // it is forwarded.
        const onInt = () => {}
        const onTerm = () => child.kill('SIGTERM')
        process.on('SIGINT', onInt)
        process.on('SIGTERM', onTerm)
        child.on('error', reject)
        child.on('exit', (code, signal) => {
            process.off('SIGINT', onInt)
            process.off('SIGTERM', onTerm)
            resolve(code ?? (signal ? 1 : 0))
        })
    })
}

async function main() {
    const [command, ...args] = process.argv.slice(2)
    if (!command) throw new Error('usage: tsx scripts/with-test-branch.ts <command> [args...]')

    const { projectId, parentBranch } = readNeonConfig(process.env)
    const name = testBranchName(userInfo().username, new Date(), randomBytes(2).toString('hex'))
    const project = ['--project-id', projectId]

    const branch = await step('creating branch', async () =>
        parseCreatedBranch(
            await neonctl([
                'branches', 'create', ...project,
                '--parent', parentBranch,
                '--name', name,
                '--schema-only',
                '--expires-at', new Date(Date.now() + EXPIRY_MS).toISOString(),
                '--output', 'json',
            ]),
        ),
    )
    console.log(`with-test-branch: created ${branch.name} (${branch.id}) from ${parentBranch}`)

    let exitCode = 1
    try {
        const url = await step('reading connection string', () =>
            neonctl(['connection-string', branch.id, ...project]),
        )
        const env = { ...process.env, PG_CONNECTION_STRING: url, TEST_BRANCH: branch.name }

        const migrated = await step('migrating', () =>
            runCommand('npx', ['drizzle-kit', 'migrate'], env),
        )
        if (migrated !== 0) throw new Error(`with-test-branch: migrating failed (exit ${migrated})`)

        exitCode = await runCommand(command, args, env)
    } finally {
        if (process.env.KEEP_TEST_BRANCH === '1') {
            console.log(`with-test-branch: kept ${branch.name} (KEEP_TEST_BRANCH=1)`)
        } else {
            try {
                await neonctl(['branches', 'delete', branch.id, ...project])
                console.log(`with-test-branch: deleted ${branch.name}`)
            } catch (error) {
                console.error(
                    `with-test-branch: deleting branch ${branch.name} failed: ${(error as Error).message}` +
                        ` — remove it with \`npm run test:branches:prune\` or the Neon console`,
                )
                if (exitCode === 0) exitCode = 1
            }
        }
    }
    process.exitCode = exitCode
}

main().catch((error) => {
    console.error((error as Error).message)
    process.exitCode = 1
})
```

- [ ] **Step 2: Write prune**

`scripts/prune-test-branches.ts`:

```ts
/**
 * Deletes test branches older than three hours — ones a run left behind that
 * their own 2-hour expiry didn't already remove. Only names starting with
 * `test-` are ever considered, so the parent branch cannot match.
 *
 * Usage:
 *   npm run test:branches:prune
 */
import { isStaleTestBranch, neonctl, readNeonConfig } from './test-branch/neon'

const MAX_AGE_MS = 3 * 60 * 60 * 1000

async function main() {
    const { projectId } = readNeonConfig(process.env)
    const project = ['--project-id', projectId]
    const branches = JSON.parse(
        await neonctl(['branches', 'list', ...project, '--output', 'json']),
    ) as { id: string; name: string; created_at: string }[]

    const stale = branches.filter((b) => isStaleTestBranch(b, new Date(), MAX_AGE_MS))
    if (stale.length === 0) {
        console.log('prune-test-branches: nothing to delete')
        return
    }
    for (const branch of stale) {
        await neonctl(['branches', 'delete', branch.id, ...project])
        console.log(`prune-test-branches: deleted ${branch.name} (created ${branch.created_at})`)
    }
}

main().catch((error) => {
    console.error(`prune-test-branches: ${(error as Error).message}`)
    process.exitCode = 1
})
```

- [ ] **Step 3: Wire scripts**

In `package.json` `scripts`, replace `test:unit` / `test:e2e` and add prune. `--env-file-if-exists` makes the three `NEON_*` variables in `.env`/`.env.local` reach the wrapper:

```json
    "test:unit": "tsx --env-file-if-exists=.env --env-file-if-exists=.env.local scripts/with-test-branch.ts vitest",
    "test:e2e": "tsx --env-file-if-exists=.env --env-file-if-exists=.env.local scripts/with-test-branch.ts playwright test",
    "test:branches:prune": "tsx --env-file-if-exists=.env --env-file-if-exists=.env.local scripts/prune-test-branches.ts"
```

Note: tsx's env file loading puts `.env`'s `PG_CONNECTION_STRING` into the wrapper's env too; the wrapper overwrites it in the child's env, which is the point.

- [ ] **Step 4: Document the variables**

Append to `.env.example`:

```bash
# Test runs (npm run test:unit / test:e2e) create a throwaway schema-only Neon
# branch of NEON_PARENT_BRANCH and delete it afterwards. NEON_API_KEY is
# optional locally: without it, neonctl uses the session `npx neonctl auth`
# stored.
NEON_PROJECT_ID=
NEON_PARENT_BRANCH=
NEON_API_KEY=
```

- [ ] **Step 5: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 6: Gabi verifies the lifecycle**

With the three variables set in `.env.local`:

```bash
npm run test:unit -- run
```

Expected: `with-test-branch: created test-…` → drizzle-kit migrate output → Vitest runs (both projects pass) → `with-test-branch: deleted test-…`; `npx neonctl branches list --project-id <id>` shows no `test-` branch. If creation fails on `--schema-only`, stop and report the message — do not drop the flag.

Then: `KEEP_TEST_BRANCH=1 npm run test:unit -- run` leaves one branch; `npm run test:branches:prune` says "nothing to delete" (it's under 3h — expected; delete it with `npx neonctl branches delete <name> --project-id <id>`).

- [ ] **Step 7: Commit**

```bash
git add scripts/with-test-branch.ts scripts/prune-test-branches.ts package.json .env.example
git commit -m "test: run test suites against a throwaway Neon branch"
```

---

### Task 3: Seed module

**Files:**
- Create: `test/seed/db.ts`, `test/seed/scope.ts`, `test/seed/vitest.ts`
- Test: `test/seed/scope.test.ts`

**Interfaces:**
- Consumes: `TEST_BRANCH`, `PG_CONNECTION_STRING` from Task 2's wrapper; tables from `lib/server/db/schemas/{auth,product,purchase}.ts`; `slugify` from `lib/utils.ts`.
- Produces (from `test/seed/scope.ts`):
  - `SEED_PASSWORD = 'correct-horse-battery'`
  - `type SeededUser = { id: string; name: string; email: string; handle: string; password: string }`
  - `type SeededProduct = { id: number; name: string; slug: string; priceInCents: number; url: string }`
  - `type SeedScope = { tag: string; user(opts?: { name?: string; emailVerified?: boolean }): Promise<SeededUser>; product(owner: SeededUser, opts?: { name?: string; priceInCents?: number; status?: ProductStatus }): Promise<SeededProduct>; cleanup(): Promise<void> }`
  - `createSeedScope(): SeedScope`
- Produces (from `test/seed/vitest.ts`): `useSeedScope(): SeedScope`

- [ ] **Step 1: Write the failing integration test**

`test/seed/scope.test.ts`:

```ts
import { verifyPassword } from 'better-auth/crypto'
import { and, eq, inArray } from 'drizzle-orm'
import { describe, it, expect } from 'vitest'

import { account, user } from '@/lib/server/db/schemas/auth'
import { productsTable } from '@/lib/server/db/schemas/product'
import { purchasesTable } from '@/lib/server/db/schemas/purchase'
import { db } from './db'
import { createSeedScope, SEED_PASSWORD } from './scope'

describe('createSeedScope', () => {
    it('creates a user who can sign in with the seed password', async () => {
        // setup
        const scope = createSeedScope()

        // run
        const seller = await scope.user({ name: 'Seller', emailVerified: true })

        // assertions
        expect(seller.email).toBe(`${scope.tag}-seller-1@example.com`)
        expect(seller.handle).toBe(`${scope.tag}-seller-1`)
        const [row] = await db.select().from(user).where(eq(user.id, seller.id))
        expect(row.emailVerified).toBe(true)
        const [credential] = await db
            .select()
            .from(account)
            .where(and(eq(account.userId, seller.id), eq(account.providerId, 'credential')))
        expect(await verifyPassword({ hash: credential.password!, password: SEED_PASSWORD })).toBe(true)

        await scope.cleanup()
    })

    it('creates a published product with its storefront url', async () => {
        // setup
        const scope = createSeedScope()
        const seller = await scope.user({ name: 'Seller' })

        // run
        const product = await scope.product(seller, { name: 'Field Guide', priceInCents: 1250 })

        // assertions
        expect(product.slug).toBe('field-guide')
        expect(product.url).toBe(`/@${seller.handle}/${product.id}/field-guide`)
        const [row] = await db.select().from(productsTable).where(eq(productsTable.id, product.id))
        expect(row).toMatchObject({ ownerId: seller.id, status: 'published', priceInCents: 1250 })

        await scope.cleanup()
    })

    it('cleanup removes the scope\'s users, their products and their purchases', async () => {
        // setup: a purchase, whose foreign keys restrict deleting either user
        const scope = createSeedScope()
        const other = createSeedScope()
        const seller = await scope.user({ name: 'Seller' })
        const buyer = await scope.user({ name: 'Buyer' })
        const bystander = await other.user({ name: 'Bystander' })
        const product = await scope.product(seller)
        await db.insert(purchasesTable).values({
            orderId: `order-${scope.tag}`,
            buyerId: buyer.id,
            sellerId: seller.id,
            productId: product.id,
            productName: product.name,
            priceInCents: product.priceInCents,
            currency: 'RON',
            status: 'paid',
        })

        // run
        await scope.cleanup()

        // assertions
        const users = await db
            .select({ id: user.id })
            .from(user)
            .where(inArray(user.id, [seller.id, buyer.id, bystander.id]))
        expect(users).toEqual([{ id: bystander.id }])
        expect(await db.select().from(productsTable).where(eq(productsTable.id, product.id))).toEqual([])

        await other.cleanup()
    })
})
```

- [ ] **Step 2: Run it to make sure it fails**

Gabi runs: `npm run test:unit -- run test/seed`
Expected: FAIL — cannot resolve `./db` / `./scope`.

- [ ] **Step 3: Write the guard and client**

`test/seed/db.ts`:

```ts
/**
 * The seed module's own database client.
 *
 * Refuses to load unless TEST_BRANCH is set — only scripts/with-test-branch.ts
 * sets it, alongside a PG_CONNECTION_STRING pointing at the throwaway branch.
 * Without that, PG_CONNECTION_STRING is staging's from .env, and cleanup()
 * deletes rows.
 */
import { drizzle } from 'drizzle-orm/neon-http'

if (!process.env.TEST_BRANCH) {
    throw new Error(
        'test/seed: TEST_BRANCH is not set. Run through `npm run test:unit` or `npm run test:e2e`, ' +
            'which create a throwaway Neon branch — never against PG_CONNECTION_STRING directly.',
    )
}

export const db = drizzle(process.env.PG_CONNECTION_STRING!)
```

- [ ] **Step 4: Write the scope**

`test/seed/scope.ts`:

```ts
/**
 * Factories for the rows a test needs, and their removal.
 *
 * Every user a scope creates — and every user a test creates through the UI
 * with an email built from `scope.tag` — has an email `<tag>-…@example.com`.
 * cleanup() deletes by that pattern, so it also catches users it never saw.
 *
 * Users are inserted directly, not signed up over the API: no server needed
 * (Vitest), no verification email, no rate limiter. The password is hashed by
 * Better Auth's own `hashPassword`, so signing in works as for any account.
 */
import { randomBytes, randomUUID } from 'node:crypto'

import { hashPassword } from 'better-auth/crypto'
import { inArray, like, or } from 'drizzle-orm'

import { account, user } from '@/lib/server/db/schemas/auth'
import { productsTable, type ProductStatus } from '@/lib/server/db/schemas/product'
import { purchasesTable } from '@/lib/server/db/schemas/purchase'
import { slugify } from '@/lib/utils'
import { db } from './db'

export const SEED_PASSWORD = 'correct-horse-battery'

export type SeededUser = { id: string; name: string; email: string; handle: string; password: string }
export type SeededProduct = { id: number; name: string; slug: string; priceInCents: number; url: string }

export type SeedScope = {
    tag: string
    user(opts?: { name?: string; emailVerified?: boolean }): Promise<SeededUser>
    product(
        owner: SeededUser,
        opts?: { name?: string; priceInCents?: number; status?: ProductStatus },
    ): Promise<SeededProduct>
    cleanup(): Promise<void>
}

export function createSeedScope(): SeedScope {
    // Hex only, so it is safe inside a LIKE pattern and a storefront handle.
    const tag = `t${randomBytes(3).toString('hex')}`
    let users = 0
    let products = 0

    return {
        tag,

        async user({ name = 'User', emailVerified = false } = {}) {
            users += 1
            const handle = `${tag}-${slugify(name)}-${users}`
            const email = `${handle}@example.com`
            const id = randomUUID()
            const now = new Date()
            await db.insert(user).values({ id, name, email, handle, emailVerified, createdAt: now, updatedAt: now })
            await db.insert(account).values({
                id: randomUUID(),
                accountId: id,
                providerId: 'credential',
                userId: id,
                password: await hashPassword(SEED_PASSWORD),
                createdAt: now,
                updatedAt: now,
            })
            return { id, name, email, handle, password: SEED_PASSWORD }
        },

        async product(owner, { name, priceInCents = 1250, status = 'published' } = {}) {
            products += 1
            const productName = name ?? `Product ${tag} ${products}`
            const slug = slugify(productName)
            // fileKey stays null: a real file needs UploadThing, and checkout
            // reads only the name and price.
            const [row] = await db
                .insert(productsTable)
                .values({ ownerId: owner.id, name: productName, slug, priceInCents, status })
                .returning({ id: productsTable.id })
            return {
                id: row.id,
                name: productName,
                slug,
                priceInCents,
                url: `/@${owner.handle}/${row.id}/${slug}`,
            }
        },

        async cleanup() {
            const rows = await db
                .select({ id: user.id })
                .from(user)
                .where(like(user.email, `${tag}-%@example.com`))
            if (rows.length === 0) return
            const ids = rows.map((r) => r.id)
            // Purchases restrict deleting either party, so they go first. The
            // user delete then cascades to products, uploads, sessions,
            // accounts, AI generations and OAuth rows.
            await db
                .delete(purchasesTable)
                .where(or(inArray(purchasesTable.buyerId, ids), inArray(purchasesTable.sellerId, ids)))
            await db.delete(user).where(inArray(user.id, ids))
        },
    }
}
```

Check `productStatus`/`ProductStatus` is exported from `lib/server/db/schemas/product.ts` (it is: `export type ProductStatus`).

- [ ] **Step 5: Write the Vitest hook**

`test/seed/vitest.ts`:

```ts
import { afterAll } from 'vitest'

import { createSeedScope, type SeedScope } from './scope'

// One scope per test file, removed after the file's last test. A Vitest file
// runs in a single worker, so per file is safe here — unlike Playwright, see
// e2e/fixtures.ts.
export function useSeedScope(): SeedScope {
    const scope = createSeedScope()
    afterAll(() => scope.cleanup())
    return scope
}
```

- [ ] **Step 6: Run the tests**

Gabi runs: `npm run test:unit -- run`
Expected: all pass, including 3 tests in `test/seed/scope.test.ts`; branch created and deleted.

Also check the guard: `npx vitest run --project server test/seed` (no wrapper) fails with `test/seed: TEST_BRANCH is not set`.

- [ ] **Step 7: Typecheck, lint, commit**

```bash
npx tsc --noEmit && npm run lint
git add test/seed
git commit -m "test: seed factories with tag-based cleanup"
```

---

### Task 4: Playwright on the branch

**Files:**
- Create: `e2e/base-url.ts`, `e2e/fixtures.ts`
- Modify: `playwright.config.ts`, `e2e/login.spec.ts`, `e2e/signup.spec.ts`, `e2e/purchase.spec.ts`

**Interfaces:**
- Consumes (Task 3): `createSeedScope`, `SeedScope`, `SeededUser`.
- Produces: `BASE_URL` from `e2e/base-url.ts` (re-exported by `e2e/fixtures.ts`); `test` (with `seed: SeedScope` fixture) and `expect` from `e2e/fixtures.ts`.

- [ ] **Step 1: Write the base url and the fixture**

Its own module so `playwright.config.ts` can import it without loading `test/seed/` — whose guard would otherwise throw before the config's clearer message.

`e2e/base-url.ts`:

```ts
// The app server playwright.config.ts starts. Not 3000, so a `next dev` started
// by hand — pointed at staging — is never the one under test.
export const BASE_URL = 'http://localhost:3100'
```

`e2e/fixtures.ts`:

```ts
import { test as base, expect } from '@playwright/test'

import { createSeedScope, type SeedScope } from '@/test/seed/scope'

export { BASE_URL } from './base-url'

// Test-scoped, not per file: under fullyParallel one file's tests are spread
// across workers and beforeAll runs once per worker, so a per-file scope would
// be created several times and cleaned up while siblings still use it.
export const test = base.extend<{ seed: SeedScope }>({
    // eslint-disable-next-line no-empty-pattern -- Playwright requires the destructuring
    seed: async ({}, use) => {
        const scope = createSeedScope()
        await use(scope)
        await scope.cleanup()
    },
})

export { expect }
```

- [ ] **Step 2: Update the config**

`playwright.config.ts` — full new content:

```ts
import { loadEnvConfig } from '@next/env'
import { defineConfig, devices } from '@playwright/test'

import { BASE_URL } from './e2e/base-url'
import { FAKE_STRIPE_URL } from './e2e/fake-stripe/url'

// scripts/with-test-branch.ts sets TEST_BRANCH and points PG_CONNECTION_STRING
// at a throwaway Neon branch. Without it the app and the seed fixture would talk
// to staging, and the fixture deletes rows.
if (!process.env.TEST_BRANCH) {
  throw new Error(
    'TEST_BRANCH is not set. Run `npm run test:e2e`, which creates a throwaway Neon branch and points the app at it.',
  )
}

// The rest of .env / .env.local the dev server reads. Variables already in the
// environment win, so the branch's PG_CONNECTION_STRING survives this.
loadEnvConfig(process.cwd(), true)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  // `next dev` compiles a route on its first request, so whichever spec reaches
  // it first — signup is the first to hit /dashboard — waits for the compile.
  // The default 5s is not enough against a freshly started server.
  expect: { timeout: 15_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  // The installed Google Chrome, not Playwright's bundled Chromium.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    // Stands in for api.stripe.com and checkout.stripe.com. See the file.
    {
      command: 'npx tsx e2e/fake-stripe/server.ts',
      url: FAKE_STRIPE_URL,
      reuseExistingServer: !process.env.CI,
    },
    // Always a fresh server on its own port: one reused from a previous run or
    // started by hand would talk to whatever database it started with. Process
    // env wins over .env files, so these override STRIPE_SECRET_KEY and APP_URL
    // there too: no real key is ever sent to the fake, and Better Auth trusts
    // this origin.
    {
      command: `npm run dev -- --port ${new URL(BASE_URL).port}`,
      url: BASE_URL,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        APP_URL: BASE_URL,
        PG_CONNECTION_STRING: process.env.PG_CONNECTION_STRING!,
        STRIPE_API_BASE: FAKE_STRIPE_URL,
        STRIPE_SECRET_KEY: 'sk_test_fake',
      },
    },
  ],
})
```

- [ ] **Step 3: Migrate `login.spec.ts`**

```ts
import { test, expect } from './fixtures'

test('logging in lands on the dashboard', async ({ page, seed }) => {
    // setup: an account to log into, inserted directly so this test does not
    // depend on the signup form
    const seller = await seed.user({ name: 'E2E Seller' })

    // run
    await page.goto('/login')

    await page.getByLabel('Email').fill(seller.email)
    await page.getByLabel('Password').fill(seller.password)
    await page.getByRole('button', { name: 'Sign in' }).click()

    // assertions
    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByText('Confirm your email address')).toBeVisible()
})
```

- [ ] **Step 4: Migrate `signup.spec.ts`**

```ts
import { test, expect } from './fixtures'

test('signing up lands on the dashboard with an unverified email', async ({ page, seed }) => {
    // setup: named from the scope's tag, so the fixture's cleanup removes the
    // account this test creates through the form
    const id = `${seed.tag}-signup`

    // run
    await page.goto('/signup')

    await page.getByLabel('Name').fill('E2E Seller')
    await page.getByLabel('Email').fill(`${id}@example.com`)
    await page.getByLabel('Storefront handle').fill(id)
    await page.getByLabel('Password').fill('correct-horse-battery')
    await page.getByRole('button', { name: 'Create account' }).click()

    // assertions
    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByText('Confirm your email address')).toBeVisible()
})
```

- [ ] **Step 5: Migrate `purchase.spec.ts`**

Replace the imports, the `sql` client, `signUp()` and the setup block; the rest of the test body stays, except the two `localhost:3000` references.

```ts
import { FAKE_STRIPE_URL } from './fake-stripe/url'
import { BASE_URL, test, expect } from './fixtures'

test('buying a product through a mocked Stripe checkout lands it in purchases', async ({
    page,
    request,
    seed,
}) => {
    // setup: a seller with one published product, and a signed-in buyer.
    //
    // The buyer signs in through `page.request`, which shares the page's cookie
    // jar, so `page` starts signed in. The login form itself is login.spec.ts's
    // concern.
    const seller = await seed.user({ name: 'E2E Seller' })
    const buyer = await seed.user({ name: 'E2E Buyer' })
    const product = await seed.product(seller, { name: `E2E Product ${seed.tag}`, priceInCents: 1250 })

    const signIn = await page.request.post('/api/auth/sign-in/email', {
        headers: { Origin: BASE_URL },
        data: { email: buyer.email, password: buyer.password },
    })
    expect(signIn).toBeOK()

    // run: product page → cart → checkout
    await page.goto(product.url)
    await page.getByRole('button', { name: /^Add to cart/ }).click()
    await expect(page.getByRole('button', { name: 'In cart' })).toBeVisible()

    await page.goto('/cart')
    await page.getByRole('button', { name: /^Checkout/ }).click()

    // The redirect target is the proof the mock is wired in. Landing anywhere
    // else means the app called the real Stripe.
    await page.waitForURL((url) => url.origin !== BASE_URL)
```

…then the existing body from `expect(page.url(), …)` onward, with `productName` replaced by `product.name` (three places: the `line_items` matcher and the `/purchases` link assertion). The `expect(page.url(), …)` message's hint about stopping your own `npm run dev` no longer applies; change it to:

```ts
        `checkout went to ${new URL(page.url()).origin}, not the fake Stripe — is STRIPE_API_BASE reaching the app server? (see playwright.config.ts)`,
```

- [ ] **Step 6: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors; `grep -rn "3000\|neon(" e2e` prints nothing.

- [ ] **Step 7: Gabi runs the suite**

```bash
npm run test:e2e
```

Expected: branch created, migrated, 3 specs pass, branch deleted. Then:
- `npx playwright test` alone fails with `TEST_BRANCH is not set`.
- Ctrl-C during `npm run test:e2e` still prints `with-test-branch: deleted test-…`.
- If `next dev` on 3100 refuses to start because another `next dev` is running in this directory, report it — the fix is a separate `distDir` for the test server, out of scope until seen.

- [ ] **Step 8: Commit**

```bash
git add e2e playwright.config.ts
git commit -m "test(e2e): seed through a fixture on the throwaway branch"
```

---

### Task 5: Docs

**Files:**
- Modify: `CLAUDE.md` (new `# Testing` section, between `# Deploy` and `# AI`)
- Modify: `docs/superpowers/specs/2026-10-07-ephemeral-test-branch-design.md`

- [ ] **Step 1: Add the section**

Insert before `# AI` in `CLAUDE.md`:

```markdown
# Testing

`npm run test:unit` (Vitest) and `npm run test:e2e` (Playwright) both run
through `scripts/with-test-branch.ts`: it creates a schema-only Neon branch of
`NEON_PARENT_BRANCH`, runs `drizzle-kit migrate` against it, runs the suite with
`PG_CONNECTION_STRING` pointed at the branch and `TEST_BRANCH` set to its name,
and deletes the branch afterwards — on failure and on Ctrl-C too. Schema-only
on purpose: tests see only rows they seed, and no staging row reaches a test
run. A wrapper rather than a `globalSetup` because Playwright starts its
`webServer` before `globalSetup` runs.

It needs `NEON_PROJECT_ID` and `NEON_PARENT_BRANCH` (`.env.example`), and
`neonctl` credentials: `NEON_API_KEY`, or locally `npx neonctl auth`.
`KEEP_TEST_BRANCH=1` keeps the branch for inspection. Every branch carries a
2-hour expiry, and `npm run test:branches:prune` deletes `test-*` branches older
than three hours.

`TEST_BRANCH` is the guard: `test/seed/` and `playwright.config.ts` both throw
without it, so running `npx playwright test` or `npx vitest` on a seeding test
directly can never seed or delete staging rows.

Playwright's app server runs on port 3100 with `reuseExistingServer: false`, so
a `next dev` started by hand on 3000 is never the one under test.

Tests get data from `createSeedScope()` (`test/seed/scope.ts`): `user()` inserts
a user plus a credential account (password `SEED_PASSWORD`), `product()` a
published product with no file. Every email is `<tag>-…@example.com`, and
`cleanup()` deletes by that pattern — purchases first, since both of their user
foreign keys restrict, then the users, which cascades the rest. A user a test
creates through the UI is cleaned up too if its email starts with `seed.tag`.
In Playwright, import `test` from `e2e/fixtures.ts` and take `seed`: a scope per
test, because `fullyParallel` spreads one file across workers. In Vitest,
`useSeedScope()` (`test/seed/vitest.ts`) gives one scope per file.
```

- [ ] **Step 2: Align the spec with two plan decisions**

In the spec:
- `cleanup()` step 4 (verification rows) — delete it: Better Auth's email verification is a JWT and writes no `verification` row, so nothing would match.
- `purchase.spec.ts` bullet — change "the buyer logged in through the UI" to "the buyer signed in over `/api/auth/sign-in/email` through `page.request`, which shares the page's cookies".

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md docs/superpowers/specs/2026-10-07-ephemeral-test-branch-design.md
git commit -m "docs: testing against a throwaway Neon branch"
```
