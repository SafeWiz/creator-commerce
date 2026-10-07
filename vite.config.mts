// vitest.config.mts
import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        extends: true,
        resolve: { conditions: ['react-server'] },
        test: {
          name: 'server',
          environment: 'node',
          include: ['lib/**/*.test.ts', 'scripts/**/*.test.ts', 'test/**/*.test.ts'],
          exclude: ['lib/client/**'],
        },
      },
      {
        extends: true,
        test: {
          name: 'client',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          },
          include: ['components/**/*.test.tsx', 'lib/client/**/*.test.ts'],
        },
      },
    ],
  },
})