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
