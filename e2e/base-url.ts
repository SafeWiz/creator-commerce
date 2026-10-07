// The app server playwright.config.ts starts. Not 3000, so a `next dev` started
// by hand — pointed at staging — is never the one under test.
export const BASE_URL = 'http://localhost:3100'
