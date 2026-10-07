/**
 * The neonctl calls behind scripts/with-test-branch.ts and
 * scripts/prune-test-branches.ts, and the pure decisions around them.
 *
 * neonctl authenticates itself: NEON_API_KEY if set, else the session
 * `neonctl auth` stored. Nothing here reads the key.
 */
import { spawn } from 'node:child_process'
import path from 'node:path'

// Resolved relative to this file rather than left to PATH: `npm run` adds
// node_modules/.bin to PATH, but a plain `tsx scripts/...` invocation (and
// this module loaded from elsewhere) does not.
const NEONCTL_BIN = path.resolve(import.meta.dirname ?? __dirname, '../../node_modules/.bin/neonctl')

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

export function parseCreatedBranch(json: string): { id: string; name: string; connectionUri: string } {
    const parsed = JSON.parse(json) as {
        branch?: { id?: string; name?: string }
        connection_uris?: { connection_uri?: string }[]
    }
    const id = parsed.branch?.id
    if (!id) throw new Error(`no branch id in neonctl output: ${json.slice(0, 200)}`)
    const connectionUri = parsed.connection_uris?.[0]?.connection_uri
    if (!connectionUri) throw new Error(`no connection uri in neonctl output: ${json.slice(0, 200)}`)
    return { id, name: parsed.branch?.name ?? id, connectionUri }
}

export function isStaleTestBranch(
    branch: { name: string; created_at: string },
    now: Date,
    maxAgeMs: number,
): boolean {
    if (!branch.name.startsWith(TEST_BRANCH_PREFIX)) return false
    return now.getTime() - new Date(branch.created_at).getTime() > maxAgeMs
}

// Runs neonctl in its own process group (detached: true), so a terminal
// Ctrl-C — which signals the whole foreground process group — does not also
// kill neonctl out from under an in-flight `branches create` or `branches
// delete`. Not unref()'d: with-test-branch.ts awaits this.
export function neonctl(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
        const child = spawn(NEONCTL_BIN, [...args, '--no-color', '--no-analytics'], {
            detached: true,
            stdio: ['ignore', 'pipe', 'pipe'],
        })
        let stdout = ''
        let stderr = ''
        child.stdout.on('data', (chunk) => { stdout += chunk })
        child.stderr.on('data', (chunk) => { stderr += chunk })
        child.on('error', reject)
        child.on('exit', (code) => {
            if (code === 0) resolve(stdout.trim())
            else reject(new Error(stderr.trim() || `neonctl exited with code ${code}`))
        })
    })
}
