import { PAGE_PATHS } from '@bibikitchen/web-constant'
import { Hono } from 'hono'
import { getCurrentUser } from '@bibikitchen/web-service'
import type { ServiceEnv } from '@bibikitchen/web-service'
import type { AppFlags } from './contexts/flags'
import type { PageState } from './lib/page-state'
import { renderPage } from './entry-server'

/** 页面子应用：只负责 HTML 渲染，数据通过 web-service 获取。 */
export const webpage = new Hono<{ Bindings: ServiceEnv }>()

async function render(c: Parameters<typeof getCurrentUser>[0], pathname: string) {
  const user = await getCurrentUser(c)
  const environment = (c.env as ServiceEnv & { ENVIRONMENT?: string }).ENVIRONMENT
  // 环境开关在服务端算好随首屏下发，浏览器不重新判断
  const flags: AppFlags = { showLogout: environment !== 'production' }
  const state: PageState = { user, flags }
  const html = renderPage(pathname, state)
  c.header('Cache-Control', 'no-store')
  return html ? c.html(html) : c.notFound()
}

webpage.get(PAGE_PATHS.HOME, (c) => render(c, PAGE_PATHS.HOME))
webpage.get(PAGE_PATHS.LOGIN, (c) => render(c, PAGE_PATHS.LOGIN))
