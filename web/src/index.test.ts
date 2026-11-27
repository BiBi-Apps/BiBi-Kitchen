import {
  API_PATHS,
  KV_KEYS,
  MESSAGES,
  PAGE_PATHS,
  SESSION,
  STATE_ELEMENT_ID,
} from '@bibikitchen/web-constant'
import { SELF } from 'cloudflare:test'
import { env } from 'cloudflare:workers'
import { beforeEach, describe, expect, it } from 'vitest'

const ORIGIN = 'https://bibikitchen.test'
const ADMIN = '13800000001'
const CHEF = '13800000002'
const BOTH = '13800000003'
const UNKNOWN = '13800000009'

function page(pathname: string, cookie?: string) {
  return SELF.fetch(`${ORIGIN}${pathname}`, { headers: cookie ? { Cookie: cookie } : {} })
}

function login(phone: string, options: { origin?: string | null; cookie?: string } = {}) {
  const { origin = ORIGIN, cookie } = options
  return SELF.fetch(`${ORIGIN}${API_PATHS.LOGIN}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(origin ? { Origin: origin } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify({ phone }),
  })
}

function logout(options: { origin?: string | null; cookie?: string } = {}) {
  const { origin = ORIGIN, cookie } = options
  return SELF.fetch(`${ORIGIN}${API_PATHS.LOGOUT}`, {
    method: 'POST',
    headers: {
      ...(origin ? { Origin: origin } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
  })
}

function me(cookie?: string) {
  return SELF.fetch(`${ORIGIN}${API_PATHS.ME}`, {
    headers: cookie ? { Cookie: cookie } : {},
  })
}

function cookieOf(res: Response) {
  const setCookie = res.headers.get('Set-Cookie') ?? ''
  return (
    setCookie
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${SESSION.cookieName}=`)) ?? ''
  )
}

async function sessionCookie() {
  return cookieOf(await login(ADMIN))
}

async function userCount() {
  const row = await env.DB.prepare('select count(*) as count from users').first<{ count: number }>()
  return row?.count ?? 0
}

beforeEach(async () => {
  // 插件不提供跨用例存储隔离，逐例清空业务表
  await env.DB.batch([
    env.DB.prepare('delete from sessions'),
    env.DB.prepare('delete from user_roles'),
    env.DB.prepare('delete from users'),
  ])

  await env.KV.put(KV_KEYS.ADMIN_PHONES, `${ADMIN},${BOTH}`)
  await env.KV.put(KV_KEYS.CHEF_PHONES, `${CHEF},${BOTH}`)
})

describe('服务端外壳渲染', () => {
  it('页面只返回外壳：head + 空挂载点 + 首屏数据', async () => {
    const res = await page(PAGE_PATHS.HOME)
    const html = await res.text()

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/html')
    expect(html).toContain('羊哆吉厨房')
    expect(html).toContain('<div id="root"></div>')
    expect(html).not.toContain('退出登录')
  })

  it('已登录时把用户放进首屏数据，body 仍为空', async () => {
    const cookie = await sessionCookie()
    const html = await (await page(PAGE_PATHS.HOME, cookie)).text()

    expect(html).toContain(`id="${STATE_ELEMENT_ID}"`)
    expect(html).not.toContain('退出登录')

    const encoded = html.match(/id="__BIBI_STATE__"[^>]*>([^<]*)</)?.[1] ?? ''
    const state = JSON.parse(atob(encoded)) as { user: { phone: string } | null }
    expect(state.user?.phone).toBe(ADMIN)
  })

  it('登录页与退出页同样只是外壳，页面内容由客户端决定', async () => {
    for (const path of [PAGE_PATHS.LOGIN, PAGE_PATHS.LOGOUT]) {
      const html = await (await page(path)).text()

      expect(html).toContain('<div id="root"></div>')
      expect(html).toContain('entry-client')
    }
  })

  it('首屏下发客户端入口，路由在浏览器接管', async () => {
    const html = await (await page(PAGE_PATHS.HOME)).text()

    expect(html).toContain('entry-client')
    expect(html).toContain('/assets/style-')
  })

  it('未知路径返回 404', async () => {
    expect((await page('/nope')).status).toBe(404)
  })
})

describe('GET /api/me', () => {
  it('未登录返回 null', async () => {
    const res = await me()

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ code: 200, data: { user: null } })
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })

  it('携带有效会话返回当前用户', async () => {
    const cookie = await sessionCookie()
    const body = (await (await me(cookie)).json()) as {
      data: { user: { phone: string; roles: string[] } }
    }

    expect(body.data.user.phone).toBe(ADMIN)
    expect(body.data.user.roles).toEqual(['admin'])
  })

  it('伪造会话 ID 不获得身份', async () => {
    const res = await me(`${SESSION.cookieName}=01FAKEFAKEFAKE000000000000`)
    expect(await res.json()).toMatchObject({ code: 200, data: { user: null } })
  })
})

describe('POST /api/login', () => {
  it('管理员号码首次登录自动注册，签发会话并返回用户', async () => {
    const res = await login(ADMIN)
    expect(res.status).toBe(200)

    const body = (await res.json()) as { data: { user: { phone: string; roles: string[] } } }
    expect(body.data.user.phone).toBe(ADMIN)
    expect(body.data.user.roles).toEqual(['admin'])

    const setCookie = res.headers.get('Set-Cookie') ?? ''
    expect(setCookie).toContain(`${SESSION.cookieName}=`)
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain('SameSite=Lax')
    expect(await userCount()).toBe(1)
  })

  it('同时出现在两个 Key 的号码获得两个角色', async () => {
    const body = (await (await login(BOTH)).json()) as { data: { user: { roles: string[] } } }
    expect(body.data.user.roles).toEqual(['admin', 'chef'])
  })

  it('厨师号码获得 chef 角色', async () => {
    const body = (await (await login(CHEF)).json()) as { data: { user: { roles: string[] } } }
    expect(body.data.user.roles).toEqual(['chef'])
  })

  it('已存在用户重复登录不再新建用户', async () => {
    await login(ADMIN)
    await login(ADMIN)

    expect(await userCount()).toBe(1)
  })

  it('未登记号码返回 401 且不写入数据', async () => {
    const res = await login(UNKNOWN)

    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({
      code: 401,
      message: MESSAGES.PHONE_NOT_REGISTERED,
      data: null,
    })
    expect(res.headers.get('Set-Cookie')).toBeNull()
    expect(await userCount()).toBe(0)
  })

  it('手机号格式非法返回 400', async () => {
    const res = await login('12')

    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({
      code: 400,
      message: MESSAGES.PHONE_FORMAT_INVALID,
      data: null,
    })
    expect(await userCount()).toBe(0)
  })

  it('跨站 Origin 被拒绝', async () => {
    const res = await login(ADMIN, { origin: 'https://evil.example' })

    expect(res.status).toBe(403)
    expect(await userCount()).toBe(0)
  })

  it('不带 Origin 的请求被允许', async () => {
    expect((await login(ADMIN, { origin: null })).status).toBe(200)
  })

  it('登录前持有的会话被作废（会话轮换）', async () => {
    const oldCookie = await sessionCookie()
    const newCookie = cookieOf(await login(ADMIN, { cookie: oldCookie }))

    expect(newCookie).toBeTruthy()
    expect(newCookie).not.toBe(oldCookie)
    expect(await (await me(oldCookie)).json()).toMatchObject({ data: { user: null } })
    expect(
      ((await (await me(newCookie)).json()) as { data: { user: unknown } }).data.user,
    ).not.toBeNull()
  })

  it('请求体是 JSON null 时按格式错误处理，不返回 500', async () => {
    const res = await SELF.fetch(`${ORIGIN}${API_PATHS.LOGIN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
      body: 'null',
    })

    expect(res.status).toBe(400)
    expect(await userCount()).toBe(0)
  })
})

describe('POST /api/logout', () => {
  it('删除会话后不再能读到用户', async () => {
    const cookie = await sessionCookie()

    const res = await logout({ cookie })

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ code: 200, data: null })
    expect(await (await me(cookie)).json()).toMatchObject({ data: { user: null } })
  })

  it('跨站调用被拒绝', async () => {
    const cookie = await sessionCookie()

    const res = await logout({ origin: 'https://evil.example', cookie })

    expect(res.status).toBe(403)
    expect(
      ((await (await me(cookie)).json()) as { data: { user: unknown } }).data.user,
    ).not.toBeNull()
  })
})

describe('安全响应头', () => {
  it('页面与接口都带默认安全头与 CSP', async () => {
    for (const path of [PAGE_PATHS.HOME, API_PATHS.ME]) {
      const res = await page(path)

      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(res.headers.get('X-Frame-Options')).toBe('DENY')
      expect(res.headers.get('Strict-Transport-Security')).toBeTruthy()

      const csp = res.headers.get('Content-Security-Policy') ?? ''
      expect(csp).toContain("default-src 'self'")
      expect(csp).toContain("script-src 'self'")
      expect(csp).toContain("object-src 'none'")
      expect(csp).toContain("base-uri 'none'")
      expect(csp).toContain("frame-ancestors 'none'")
    }
  })
})
