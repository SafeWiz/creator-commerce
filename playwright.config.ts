import { loadEnvConfig } from '@next/env'
import { defineConfig, devices } from '@playwright/test'

import { BASE_URL } from './e2e/base-url'
import { FAKE_STRIPE_URL } from './e2e/fake-stripe/url'

// scripts/with-test-branch.ts sets both TEST_BRANCH and PG_CONNECTION_STRING
// together, pointed at a throwaway Neon branch. Requiring both here (not just
// TEST_BRANCH) catches a stale TEST_BRANCH left in the shell's environment
// with no matching PG_CONNECTION_STRING, which would otherwise point the app
// and the seed fixture at staging — and the fixture deletes rows.
if (!process.env.TEST_BRANCH || !process.env.PG_CONNECTION_STRING) {
  throw new Error(
    'TEST_BRANCH and PG_CONNECTION_STRING are not both set. Run `npm run test:e2e`, which creates a throwaway Neon branch and points the app at it.',
  )
}

// The rest of .env / .env.local the dev server reads. Variables already in the
// environment win, so the branch's PG_CONNECTION_STRING survives this.
loadEnvConfig(process.cwd(), true)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  // `next dev` compiles a route on its first request, so whichever spec reaches
  // it first — signup is the first to hit /dashboard — waits for the compile.
  // The default 5s is not enough against a freshly started server.
  expect: { timeout: 15_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  // The installed Google Chrome, not Playwright's bundled Chromium.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    // Stands in for api.stripe.com and checkout.stripe.com. See the file.
    {
      command: 'npx tsx e2e/fake-stripe/server.ts',
      url: FAKE_STRIPE_URL,
      reuseExistingServer: !process.env.CI,
    },
    // Always a fresh server on its own port: one reused from a previous run or
    // started by hand would talk to whatever database it started with. Process
    // env wins over .env files, so these override STRIPE_SECRET_KEY and APP_URL
    // there too: no real key is ever sent to the fake, and Better Auth trusts
    // this origin. NEXT_DIST_DIR gives it its own build directory, separate
    // from a hand-started `next dev`'s .next — Next 16 allows only one `next
    // dev` per build directory, and the two would otherwise fight over the
    // same lockfile even on different ports.
    {
      command: `npm run dev -- --port ${new URL(BASE_URL).port}`,
      url: BASE_URL,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        APP_URL: BASE_URL,
        PG_CONNECTION_STRING: process.env.PG_CONNECTION_STRING!,
        STRIPE_API_BASE: FAKE_STRIPE_URL,
        STRIPE_SECRET_KEY: 'sk_test_fake',
        NEXT_DIST_DIR: '.next-e2e',
        // No real mail or analytics from a test run: absent SMTP credentials
        // fall back to nodemailer's jsonTransport (see CLAUDE.md "# Email"),
        // and an absent PostHog key means the SDK never initialises.
        SMTP_USER: '',
        SMTP_PASS: '',
        NEXT_PUBLIC_POSTHOG_KEY: '',
      },
    },
  ],
})
