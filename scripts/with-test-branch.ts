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

// The child currently running under runCommand, if any — read by main()'s
// SIGTERM handler so it can forward the signal to whichever step (migrate or
// the test command) is in flight. Steps with no child (creating the branch,
// reading the connection string, deleting it) leave this null; a signal
// arriving then has nothing to forward to and is only recorded on `interrupted`.
let currentChild: ReturnType<typeof spawn> | null = null

function runCommand(command: string, args: string[], env: NodeJS.ProcessEnv): Promise<number> {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, { stdio: 'inherit', env })
        currentChild = child
        child.on('error', (error) => {
            currentChild = null
            reject(error)
        })
        child.on('exit', (code, signal) => {
            currentChild = null
            resolve(code ?? (signal ? 1 : 0))
        })
    })
}

async function main() {
    const [command, ...args] = process.argv.slice(2)
    if (!command) throw new Error('usage: tsx scripts/with-test-branch.ts <command> [args...]')

    // Installed for the whole of main(), not just while a child is running, so
    // a signal arriving between steps (while creating the branch, reading the
    // connection string, or after migrate) is caught too instead of killing
    // the process before the branch is deleted. SIGINT: a terminal Ctrl-C
    // reaches the child on its own, so this only records the signal. SIGTERM
    // (CI cancelling) only reaches this process, so it is forwarded to
    // whichever child is currently running. Either way `interrupted` is read
    // between steps below to stop before starting the next one, and doubles
    // as the exit code (130/143) for that case. Removed only after the branch
    // delete in the finally below completes, so a second signal during the
    // delete can't kill the process before it finishes.
    let interrupted: 130 | 143 | null = null
    const onInt = () => {
        interrupted ??= 130
    }
    const onTerm = () => {
        interrupted ??= 143
        currentChild?.kill('SIGTERM')
    }
    process.on('SIGINT', onInt)
    process.on('SIGTERM', onTerm)

    try {
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

        // A signal can arrive while the branch is being created, above, before
        // its id is known — `interrupted` is still set by then, and the steps
        // below all check it before doing anything with a child, so the only
        // thing left to run is the delete in the finally.
        async function runSteps(): Promise<number> {
            if (interrupted !== null) return interrupted

            const url = await step('reading connection string', () =>
                neonctl(['connection-string', branch.id, ...project]),
            )
            const env = { ...process.env, PG_CONNECTION_STRING: url, TEST_BRANCH: branch.name }

            if (interrupted !== null) return interrupted

            const migrated = await step('migrating', () =>
                runCommand('npx', ['drizzle-kit', 'migrate'], env),
            )
            if (migrated !== 0) throw new Error(`with-test-branch: migrating failed (exit ${migrated})`)

            if (interrupted !== null) return interrupted

            return step(`running ${command}`, () => runCommand(command, args, env))
        }

        let exitCode = 1
        try {
            exitCode = await runSteps()
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
    } finally {
        process.off('SIGINT', onInt)
        process.off('SIGTERM', onTerm)
    }
}

main().catch((error) => {
    console.error((error as Error).message)
    process.exitCode = 1
})
