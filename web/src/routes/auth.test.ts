import { KV_KEYS, SESSION } from '@bibikitchen/web-constant'
import { SELF } from 'cloudflare:test'
import { env } from 'cloudflare:workers'
import { beforeEach, describe, expect, it } from 'vitest'

const ADMIN = '13800000001'
const CHEF = '13800000002'
const BOTH = '13800000003'
const UNKNOWN = '13800000009'
const ORIGIN = 'https://bibikitchen.test'

function login(phone: string, origin: string | null = ORIGIN, cookie?: string) {
  return SELF.fetch(`${ORIGIN}/api/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(origin ? { Origin: origin } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify({ phone }),
  })
}

function me(cookie?: string) {
  return SELF.fetch(`${ORIGIN}/api/me`, {
    headers: cookie ? { Cookie: cookie } : {},
  })
}

function sessionCookie(res: Response) {
  const setCookie = res.headers.get('Set-Cookie') ?? ''
  return setCookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION.cookieName}=`))
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

describe('POST /api/login', () => {
  it('管理员号码首次登录时自动注册并签发会话', async () => {
    const res = await login(ADMIN)
    expect(res.status).toBe(200)

    const body = (await res.json()) as { user: { phone: string; roles: string[] } }
    expect(body.user.phone).toBe(ADMIN)
    expect(body.user.roles).toEqual(['admin'])

    const setCookie = res.headers.get('Set-Cookie') ?? ''
    expect(setCookie).toContain(`${SESSION.cookieName}=`)
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain('SameSite=Lax')
    expect(await userCount()).toBe(1)
  })

  it('同时出现在两个 Key 的号码获得两个角色', async () => {
    const res = await login(BOTH)
    expect(res.status).toBe(200)

    const body = (await res.json()) as { user: { roles: string[] } }
    expect(body.user.roles).toEqual(['admin', 'chef'])
  })

  it('厨师号码获得 chef 角色', async () => {
    const res = await login(CHEF)
    const body = (await res.json()) as { user: { roles: string[] } }
    expect(body.user.roles).toEqual(['chef'])
  })

  it('逗号清单允许空白和空项，并按完整手机号匹配', async () => {
    await env.KV.put(KV_KEYS.ADMIN_PHONES, ` , ${ADMIN} , , ${BOTH},`)
    await env.KV.put(KV_KEYS.CHEF_PHONES, `${UNKNOWN}0`)

    expect((await login(ADMIN)).status).toBe(200)
    expect((await login(UNKNOWN)).status).toBe(401)
  })

  it('Key 缺失或清单为空时不授予角色', async () => {
    await env.KV.delete(KV_KEYS.ADMIN_PHONES)
    await env.KV.put(KV_KEYS.CHEF_PHONES, '')

    expect((await login(ADMIN)).status).toBe(401)
    expect((await login(CHEF)).status).toBe(401)
    expect(await userCount()).toBe(0)
  })

  it('已存在用户重复登录不再新建用户', async () => {
    await login(ADMIN)
    const second = await login(ADMIN)

    expect(second.status).toBe(200)
    expect(await userCount()).toBe(1)
  })

  it('登录前持有的会话被作废（会话轮换）', async () => {
    const oldCookie = sessionCookie(await login(ADMIN))
    const newCookie = sessionCookie(await login(ADMIN, ORIGIN, oldCookie))

    expect(newCookie).toBeTruthy()
    expect(newCookie).not.toBe(oldCookie)
    expect(await (await me(oldCookie)).json()).toEqual({ user: null })
    expect(((await (await me(newCookie)).json()) as { user: unknown }).user).not.toBeNull()
  })

  it('未登记号码返回 401 且不写入任何数据', async () => {
    const res = await login(UNKNOWN)

    expect(res.status).toBe(401)
    expect((await res.json()) as { error: string }).toMatchObject({ error: expect.any(String) })
    expect(res.headers.get('Set-Cookie')).toBeNull()
    expect(await userCount()).toBe(0)
  })

  it('手机号格式非法返回 400', async () => {
    const res = await login('12')

    expect(res.status).toBe(400)
    expect(await userCount()).toBe(0)
  })

  it('跨站 Origin 被拒绝', async () => {
    const res = await login(ADMIN, 'https://evil.example')

    expect(res.status).toBe(403)
    expect(await userCount()).toBe(0)
  })

  it('不带 Origin 的请求被允许', async () => {
    const res = await login(ADMIN, null)
    expect(res.status).toBe(200)
  })

  it('仅伪造 X-Forwarded-Host 无法绕过跨站校验', async () => {
    const res = await SELF.fetch(`${ORIGIN}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://evil.example',
        'X-Forwarded-Host': 'evil.example',
      },
      body: JSON.stringify({ phone: ADMIN }),
    })

    expect(res.status).toBe(403)
    expect(await userCount()).toBe(0)
  })

  it('请求体是 JSON null 时按格式错误处理，不返回 500', async () => {
    const res = await SELF.fetch(`${ORIGIN}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
      body: 'null',
    })

    expect(res.status).toBe(400)
    expect(await userCount()).toBe(0)
  })
})

describe('GET /api/me', () => {
  it('未登录返回 null', async () => {
    const res = await me()

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ user: null })
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })

  it('携带有效会话返回当前用户', async () => {
    const cookie = sessionCookie(await login(BOTH))
    const res = await me(cookie)

    const body = (await res.json()) as { user: { phone: string; roles: string[] } }
    expect(body.user.phone).toBe(BOTH)
    expect(body.user.roles).toEqual(['admin', 'chef'])
  })

  it('伪造会话 ID 不获得身份', async () => {
    const res = await me(`${SESSION.cookieName}=01FAKEFAKEFAKE000000000000`)
    expect(await res.json()).toEqual({ user: null })
  })

  it('已过期会话按未登录处理', async () => {
    const cookie = sessionCookie(await login(ADMIN))
    const sessionId = cookie?.split('=')[1] ?? ''
    await env.DB.prepare('update sessions set expires_at = ? where id = ?')
      .bind(Date.now() - 1000, sessionId)
      .run()

    expect(await (await me(cookie)).json()).toEqual({ user: null })
  })
})

describe('POST /api/logout', () => {
  it('删除会话后不再能读到用户', async () => {
    const cookie = sessionCookie(await login(ADMIN))

    const res = await SELF.fetch(`${ORIGIN}/api/logout`, {
      method: 'POST',
      headers: { Origin: ORIGIN, Cookie: cookie ?? '' },
    })

    expect(res.status).toBe(204)
    expect(await (await me(cookie)).json()).toEqual({ user: null })
  })

  it('跨站调用被拒绝', async () => {
    const cookie = sessionCookie(await login(ADMIN))

    const res = await SELF.fetch(`${ORIGIN}/api/logout`, {
      method: 'POST',
      headers: { Origin: 'https://evil.example', Cookie: cookie ?? '' },
    })

    expect(res.status).toBe(403)
    expect((await (await me(cookie)).json()) as { user: unknown }).toMatchObject({
      user: expect.anything(),
    })
  })
})
