import { test as base, expect } from '@playwright/test'

import { createSeedScope, type SeedScope } from '@/test/seed/scope'

export { BASE_URL } from './base-url'

// Test-scoped, not per file: under fullyParallel one file's tests are spread
// across workers and beforeAll runs once per worker, so a per-file scope would
// be created several times and cleaned up while siblings still use it.
//
// With KEEP_TEST_BRANCH=1 a failed test keeps its rows, so the kept branch
// still holds what the test saw; the tag in the log finds them.
export const test = base.extend<{ seed: SeedScope }>({
    seed: async ({}, use, testInfo) => {
        const scope = createSeedScope()
        // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright's fixture `use`, not a React hook
        await use(scope)
        const failed = testInfo.status !== testInfo.expectedStatus
        if (failed && process.env.KEEP_TEST_BRANCH === '1') {
            console.log(
                `seed: kept rows of "${testInfo.title}" — users with email like '${scope.tag}-%@example.com'`,
            )
            return
        }
        await scope.cleanup()
    },
})

export { expect }
