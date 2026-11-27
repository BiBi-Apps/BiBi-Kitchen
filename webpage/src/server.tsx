import { PAGE_PATHS } from '@bibikitchen/web-constant'
import { Hono } from 'hono'
import { getCurrentUser } from '@bibikitchen/web-service'
import type { ServiceEnv } from '@bibikitchen/web-service'
import type { AppFlags } from './contexts/flags'
import { renderShell } from './entry-server'
import type { PageState } from './lib/page-state'
import { isPagePath } from './lib/routes'

type Bindings = ServiceEnv

/** 页面子应用：只输出 HTML 外壳与首屏数据，页面渲染与路由都在客户端。 */
export const webpage = new Hono<{ Bindings: Bindings }>()

/** 依赖环境的渲染开关：目前没有开关项，需要时在这里按 c.env 计算。 */
function flagsOf(): AppFlags {
  return {}
}

async function shell(c: Parameters<typeof getCurrentUser>[0], pathname: string) {
  if (!isPagePath(pathname)) return c.notFound()

  const state: PageState = { user: await getCurrentUser(c), flags: flagsOf() }
  c.header('Cache-Control', 'no-store')
  return c.html(renderShell(state))
}

webpage.get(PAGE_PATHS.HOME, (c) => shell(c, PAGE_PATHS.HOME))
webpage.get(PAGE_PATHS.LOGIN, (c) => shell(c, PAGE_PATHS.LOGIN))
webpage.get(PAGE_PATHS.LOGOUT, (c) => shell(c, PAGE_PATHS.LOGOUT))

export default webpage
