import { test as base, expect } from '@playwright/test'

import { createSeedScope, type SeedScope } from '@/test/seed/scope'

export { BASE_URL } from './base-url'

// Test-scoped, not per file: under fullyParallel one file's tests are spread
// across workers and beforeAll runs once per worker, so a per-file scope would
// be created several times and cleaned up while siblings still use it.
export const test = base.extend<{ seed: SeedScope }>({
    seed: async ({}, use) => {
        const scope = createSeedScope()
        // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright's fixture `use`, not a React hook
        await use(scope)
        await scope.cleanup()
    },
})

export { expect }
