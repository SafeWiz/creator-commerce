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
