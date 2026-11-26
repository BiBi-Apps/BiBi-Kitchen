import type { ReactElement } from 'react'
import { PAGE_PATHS } from '@bibikitchen/web-constant'
import type { PageState } from '@/lib/page-state'
import { HomePage } from '@/pages/home'
import { LoginPage } from '@/pages/login'

/**
 * 路径 → 页面的唯一映射：服务端渲染与客户端水合都走这里。
 * 新增页面只改这一处，避免两侧各写一遍导致路由漂移。
 */
export function createPage(pathname: string, state: PageState): ReactElement | null {
  if (pathname === PAGE_PATHS.HOME) return <HomePage user={state.user} />
  if (pathname === PAGE_PATHS.LOGIN) return <LoginPage />
  return null
}
