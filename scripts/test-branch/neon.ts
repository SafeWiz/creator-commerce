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
