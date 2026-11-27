import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import ssrPlugin from 'vite-ssr-components/plugin'

/**
 * 页面自身构建：客户端资源出到 dist/client，SSR 模块出到 dist/server。
 * 客户端入口与样式由 root.tsx 中的 Script/Link 自动识别，无需在这里列。
 */
export default defineConfig({
  plugins: [react(), tailwindcss(), ssrPlugin()],
  build: {
    outDir: 'dist/client',
  },
  environments: {
    client: {
      build: {
        manifest: true,
      },
    },
    ssr: {
      resolve: {
        // manifest 在 SSR 构建时由插件内联进产物，需要让该包被处理而不是外部化
        noExternal: ['vite-ssr-components'],
      },
      build: {
        outDir: 'dist/server',
        // 服务端入口导出 Hono 子应用，由 web 直接引入
        ssr: './src/server.tsx',
        copyPublicDir: false,
      },
    },
  },
})
