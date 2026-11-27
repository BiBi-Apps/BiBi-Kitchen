import { createReadStream, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cloudflare } from '@cloudflare/vite-plugin'
import { defineConfig, type Plugin } from 'vite'

/** 部署到别的资源或环境时用这三个变量覆盖；未设或为空则用 wrangler.jsonc 里的值。 */
const kvNamespaceId = process.env.KV_NAMESPACE_ID?.trim()
const d1DatabaseId = process.env.D1_DATABASE_ID?.trim()
const environment = process.env.ENVIRONMENT?.trim()

if (kvNamespaceId && !/^[a-f\d]{32}$/i.test(kvNamespaceId)) {
  throw new Error('KV_NAMESPACE_ID 必须为 32 位十六进制 ID')
}
if (d1DatabaseId && !/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(d1DatabaseId)) {
  throw new Error('D1_DATABASE_ID 必须为 UUID')
}
if (environment && !['development', 'production'].includes(environment)) {
  throw new Error('ENVIRONMENT 只能为 development 或 production')
}

const root = fileURLToPath(new URL('.', import.meta.url))
const assetsDirectory = resolve(root, '../webpage/dist/client')

/** 首屏用的是 webpage 预构建后的哈希资源路径，dev 下需要由 web 自己把这些文件发出去。 */
const CONTENT_TYPES: Record<string, string> = {
  '.css': 'text/css',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.map': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
}

function devAssets(): Plugin {
  return {
    name: 'dev-assets',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = req.url?.split('?')[0] ?? ''
        if (!pathname.startsWith('/') || pathname.startsWith('/api/')) return next()

        const filePath = join(assetsDirectory, decodeURIComponent(pathname))
        if (!filePath.startsWith(assetsDirectory)) return next()

        let isFile = false
        try {
          isFile = statSync(filePath).isFile()
        } catch {
          return next()
        }
        if (!isFile) return next()

        const type = CONTENT_TYPES[filePath.slice(filePath.lastIndexOf('.'))]
        if (type) res.setHeader('Content-Type', type)
        createReadStream(filePath).pipe(res)
      })
    },
  }
}

/**
 * 静态资源由 webpage 自己构建，这里只把资源目录写回产物配置。
 * 没有 client 构建产物时 Cloudflare 插件会把 assets 字段整个删掉，故排在它的 buildApp 之后补回。
 */
function workerAssets(): Plugin {
  return {
    name: 'worker-assets',
    apply: 'build',
    buildApp: {
      order: 'post',
      handler() {
        for (const entry of readdirSync(join(root, 'dist'), { withFileTypes: true })) {
          if (!entry.isDirectory()) continue

          const configPath = join(root, 'dist', entry.name, 'wrangler.json')
          const config = JSON.parse(readFileSync(configPath, 'utf8'))
          config.assets = {
            ...config.assets,
            directory: relative(dirname(configPath), assetsDirectory),
          }
          writeFileSync(configPath, JSON.stringify(config))
        }
        return Promise.resolve()
      },
    },
  }
}

export default defineConfig({
  plugins: [
    cloudflare({
      configPath: './wrangler.jsonc',
      config: (config) => {
        for (const namespace of config.kv_namespaces) {
          if (kvNamespaceId && namespace.binding === 'KV') namespace.id = kvNamespaceId
        }
        for (const database of config.d1_databases) {
          if (d1DatabaseId && database.binding === 'DB') database.database_id = d1DatabaseId
        }
        if (environment) config.vars.ENVIRONMENT = environment
      },
    }),
    workerAssets(),
    devAssets(),
  ],
  server: {
    port: 8787,
    strictPort: true,
  },
})
