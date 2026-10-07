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
