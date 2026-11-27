import type { ReactElement } from 'react'
import { PAGE_PATHS } from '@bibikitchen/web-constant'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { LogoutPage } from '@/pages/LogoutPage'

/** 路径 → 页面的唯一映射：首屏 SSR 与客户端路由都从这里取，新增页面只改这一处。 */
export const PAGE_ROUTES: readonly { path: string; element: ReactElement }[] = [
  { path: PAGE_PATHS.HOME, element: <HomePage /> },
  { path: PAGE_PATHS.LOGIN, element: <LoginPage /> },
  { path: PAGE_PATHS.LOGOUT, element: <LogoutPage /> },
]

export function isPagePath(pathname: string): boolean {
  return PAGE_ROUTES.some((route) => route.path === pathname)
}
