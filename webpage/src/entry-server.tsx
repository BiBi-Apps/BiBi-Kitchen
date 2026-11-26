import { renderToString } from 'react-dom/server'
import { Root } from '@/components/root'
import { FlagsProvider } from '@/contexts/flags'
import type { PageState } from '@/lib/page-state'
import { createPage } from '@/lib/routes'

/** 按路径渲染整页 HTML；无匹配页面时返回 null，由调用方决定 404。 */
export function renderPage(pathname: string, state: PageState): string | null {
  const page = createPage(pathname, state)
  if (!page) return null

  return `<!doctype html>${renderToString(
    <Root state={state}>
      <FlagsProvider flags={state.flags}>{page}</FlagsProvider>
    </Root>,
  )}`
}
