import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import ssrPlugin from 'vite-ssr-components/plugin'

export default defineConfig({
  root: new URL('../webpage', import.meta.url).pathname,
  plugins: [
    cloudflare({
      configPath: '../web/wrangler.jsonc',
      // 本地 D1/KV 状态沿用 web/.wrangler/state，不随 Vite root 变化
      persistState: { path: '../web/.wrangler/state' },
    }),
    react(),
    tailwindcss(),
    ssrPlugin(),
  ],
  resolve: {
    alias: {
      '@': new URL('../webpage/src', import.meta.url).pathname,
    },
  },
  server: {
    port: 8787,
    strictPort: true,
  },
})
