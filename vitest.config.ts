import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/integration/**', 'tests/e2e/**', 'node_modules/**'],
    setupFiles: ['./vitest.setup.ts'],
  },
  envDir: '.',
})
