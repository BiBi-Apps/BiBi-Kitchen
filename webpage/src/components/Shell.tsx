import { APP_NAME, STATE_ELEMENT_ID } from '@bibikitchen/web-constant'
import { Link, ReactRefresh, Script, ViteClient } from 'vite-ssr-components/react'
import { encodePageState, type PageState } from '@/lib/page-state'

/**
 * 整页外壳：服务端只渲染 `<head>`、空的挂载点与首屏数据。
 * 页面内容一律由客户端渲染，因此这里不含任何页面结构。
 */
export function Shell({ state }: { state: PageState }) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <title>{APP_NAME}</title>
        <ViteClient />
        <ReactRefresh />
        <Link href="/src/style.css" rel="stylesheet" />
      </head>
      <body>
        <div id="root" />
        <script type="application/json" id={STATE_ELEMENT_ID}>
          {encodePageState(state)}
        </script>
        <Script src="/src/entry-client.tsx" />
      </body>
    </html>
  )
}
