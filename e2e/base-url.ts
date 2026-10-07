// The app server playwright.config.ts starts. Not 3000, and built into its
// own NEXT_DIST_DIR (.next-e2e) rather than the default .next — so a `next
// dev` started by hand on 3000, pointed at staging, can keep running
// alongside a test run without either server fighting the other for a
// lockfile or being mistaken for the one under test.
export const BASE_URL = 'http://localhost:3100'
