import { KV_KEYS, SESSION } from '@bibikitchen/web-constant'
import { SELF } from 'cloudflare:test'
import { env } from 'cloudflare:workers'
import { beforeEach, describe, expect, it } from 'vitest'
import { decodePageState } from '@/lib/page-state'

const ORIGIN = 'https://bibikitchen.test'
const ADMIN = '13800000001'

function login(phone: string) {
  return SELF.fetch(`${ORIGIN}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
    body: JSON.stringify({ phone }),
  })
}

function page(pathname: string, cookie?: string) {
  return SELF.fetch(`${ORIGIN}${pathname}`, { headers: cookie ? { Cookie: cookie } : {} })
}

async function sessionCookie() {
  const res = await login(ADMIN)
  const setCookie = res.headers.get('Set-Cookie') ?? ''
  const cookie = setCookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION.cookieName}=`))
  return cookie ?? ''
}

type State = { user: { phone: string } | null; flags: { showLogout: boolean } }

/** 复用浏览器端的解码实现，断言的就是水合时真正拿到的那份状态。 */
function readState(html: string): State {
  const encoded = html.match(/id="__BIBI_STATE__"[^>]*>([^<]*)</)?.[1] ?? ''
  return decodePageState(encoded) as State
}

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare('delete from sessions'),
    env.DB.prepare('delete from user_roles'),
    env.DB.prepare('delete from users'),
  ])
  await env.KV.put(KV_KEYS.ADMIN_PHONES, ADMIN)
})

describe('服务端渲染', () => {
  it('未登录访问首页时直接返回已渲染的用户界面', async () => {
    const res = await page('/')
    const html = await res.text()

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/html')
    expect(html).toContain('羊哆吉厨房')
    expect(html).toContain('href="/login"')
    expect(html).not.toContain('退出登录')
  })

  it('登录页返回手机号表单的完整 HTML', async () => {
    const html = await (await page('/login')).text()

    expect(html).toContain('id="phone"')
    expect(html).toContain('输入已登记的手机号码登录')
  })

  it('已登录访问首页时服务端直接渲染用户信息', async () => {
    const cookie = await sessionCookie()
    const html = await (await page('/', cookie)).text()

    expect(html).toContain(ADMIN)
    expect(html).toContain('管理员')
    expect(html).toContain('退出登录')
  })

  it('HTML 内嵌初始状态供客户端水合，且不含可执行的原始 JSON', async () => {
    const cookie = await sessionCookie()
    const html = await (await page('/', cookie)).text()

    expect(html).toContain('id="__BIBI_STATE__"')
    expect(html).toContain('type="application/json"')
    expect(html).not.toContain('__BIBI_STATE__={')
  })

  it('初始状态带着用户与环境开关，供水合还原 Props 与 Provider', async () => {
    const cookie = await sessionCookie()
    const state = readState(await (await page('/', cookie)).text())

    expect(state.user?.phone).toBe(ADMIN)
    expect(state.flags.showLogout).toBe(true)
  })

  it('未登录时开关随首屏下发，用户为 null', async () => {
    const state = readState(await (await page('/')).text())

    expect(state.user).toBeNull()
    expect(state.flags.showLogout).toBe(true)
  })
})

describe('安全响应头', () => {
  it('页面与接口都带默认安全头与 CSP', async () => {
    for (const path of ['/', '/api/me']) {
      const res = await page(path)

      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(res.headers.get('X-Frame-Options')).toBe('DENY')
      expect(res.headers.get('Strict-Transport-Security')).toBeTruthy()

      const csp = res.headers.get('Content-Security-Policy') ?? ''
      expect(csp).toContain("default-src 'self'")
      expect(csp).toContain("object-src 'none'")
      expect(csp).toContain("base-uri 'none'")
      expect(csp).toContain("frame-ancestors 'none'")
    }
  })
})
