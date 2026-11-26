import { APP_NAME, STATE_ELEMENT_ID } from '@bibikitchen/web-constant'
import type { ReactNode } from 'react'
import { Link, ReactRefresh, Script, ViteClient } from 'vite-ssr-components/react'
import { encodePageState, type PageState } from '@/lib/page-state'

/** 整页 HTML 骨架：head、首屏状态脚本与客户端入口。 */
export function Root({ state, children }: { state: PageState; children: ReactNode }) {
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
        <div id="root">{children}</div>
        <script type="application/json" id={STATE_ELEMENT_ID}>
          {encodePageState(state)}
        </script>
        <Script src="/src/entry-client.tsx" />
      </body>
    </html>
  )
}
