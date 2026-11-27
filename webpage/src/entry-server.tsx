import { renderToString } from 'react-dom/server'
import { Shell } from '@/components/Shell'
import type { PageState } from '@/lib/page-state'

/**
 * 服务端只输出 HTML 外壳与首屏数据，页面结构交给客户端渲染。
 * 这样服务端不需要跑页面组件，也不必为两套渲染保持一致而操心。
 */
export function renderShell(state: PageState): string {
  return `<!doctype html>${renderToString(<Shell state={state} />)}`
}
