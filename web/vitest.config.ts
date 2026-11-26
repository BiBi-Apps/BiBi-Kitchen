import { cloudflareTest } from '@cloudflare/vitest-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    react(),
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
    }),
  ],
  resolve: {
    alias: {
      '@': new URL('../webpage/src', import.meta.url).pathname,
    },
  },
  test: {
    setupFiles: ['./test/setup.ts'],
  },
})
