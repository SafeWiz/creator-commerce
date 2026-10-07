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
