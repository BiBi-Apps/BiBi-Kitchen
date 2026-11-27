import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import ssrPlugin from 'vite-ssr-components/plugin'

/** 部署到别的资源时用这两个变量覆盖；未设或为空则用 wrangler.jsonc 里的 ID。 */
const kvNamespaceId = process.env.KV_NAMESPACE_ID?.trim()
const d1DatabaseId = process.env.D1_DATABASE_ID?.trim()

if (kvNamespaceId && !/^[a-f\d]{32}$/i.test(kvNamespaceId)) {
  throw new Error('KV_NAMESPACE_ID 必须为 32 位十六进制 ID')
}
if (d1DatabaseId && !/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(d1DatabaseId)) {
  throw new Error('D1_DATABASE_ID 必须为 UUID')
}

export default defineConfig({
  root: new URL('../webpage', import.meta.url).pathname,
  plugins: [
    cloudflare({
      configPath: '../web/wrangler.jsonc',
      // 本地 D1/KV 状态沿用 web/.wrangler/state，不随 Vite root 变化
      persistState: { path: '../web/.wrangler/state' },
      config: (config) => {
        for (const namespace of config.kv_namespaces) {
          if (kvNamespaceId && namespace.binding === 'KV') namespace.id = kvNamespaceId
        }
        for (const database of config.d1_databases) {
          if (d1DatabaseId && database.binding === 'DB') database.database_id = d1DatabaseId
        }
      },
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
