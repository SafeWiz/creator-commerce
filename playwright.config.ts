import { loadEnvConfig } from '@next/env'
import { defineConfig, devices } from '@playwright/test'

import { FAKE_STRIPE_URL } from './e2e/fake-stripe/url'

// The same .env / .env.local the dev server reads, so a spec that seeds rows
// directly (e2e/purchase.spec.ts) talks to the database the app is using.
loadEnvConfig(process.cwd(), true)

const baseURL = 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
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
    // Reuses a `next dev` that is already running locally; starts one otherwise.
    //
    // `env` only reaches a server this config starts. A `next dev` you started
    // yourself keeps talking to real Stripe, and e2e/purchase.spec.ts says so
    // and fails — stop it first, or start it with the same two variables.
    // Process env wins over .env files, so these override STRIPE_SECRET_KEY
    // there too: no real key is ever sent to the fake.
    {
      command: 'npm run dev',
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        STRIPE_API_BASE: FAKE_STRIPE_URL,
        STRIPE_SECRET_KEY: 'sk_test_fake',
      },
    },
  ],
})
