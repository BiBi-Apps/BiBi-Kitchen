import { API_PATHS, MESSAGES, PHONE } from '@bibikitchen/web-constant'
import { Hono } from 'hono'
import {
  clearSessionCookie,
  deleteSession,
  findCurrentUser,
  getCurrentUser,
  getDb,
  loginWithPhone,
  readSessionId,
  setSessionCookie,
} from '@bibikitchen/web-service'
import type { ServiceEnv } from '@bibikitchen/web-service'

type Bindings = ServiceEnv & { ENVIRONMENT: string }

export const api = new Hono<{ Bindings: Bindings }>()

api.post(API_PATHS.LOGIN, async (c) => {
  if (!isSameOrigin(c)) return c.json({ error: MESSAGES.CROSS_SITE_REJECTED }, 403)

  // JSON 可以是 null 或数组，解析成功也不代表是对象
  const body = await c.req.json<{ phone?: string } | null>().catch(() => null)
  const phone = String(body?.phone ?? '').trim()
  if (!PHONE.pattern.test(phone)) return c.json({ error: MESSAGES.PHONE_FORMAT_INVALID }, 400)

  // 传入当前会话 ID：登录成功后先作废旧会话（会话轮换），防止登录前持有的会话继续有效
  const result = await loginWithPhone(c.env, phone, readSessionId(c))
  if (!result.ok) {
    return c.json(
      {
        error:
          result.reason === 'not-registered'
            ? MESSAGES.PHONE_NOT_REGISTERED
            : MESSAGES.PHONE_FORMAT_INVALID,
      },
      result.reason === 'not-registered' ? 401 : 400,
    )
  }

  setSessionCookie(c, result.sessionId, result.expiresAt)
  const user = await findCurrentUser(getDb(c.env.DB), result.sessionId)
  return c.json({ user })
})

api.post(API_PATHS.LOGOUT, async (c) => {
  if (c.env.ENVIRONMENT === 'production') return c.json({ error: 'Not Found' }, 404)
  if (!isSameOrigin(c)) return c.json({ error: MESSAGES.CROSS_SITE_REJECTED }, 403)

  const sessionId = readSessionId(c)
  if (sessionId) await deleteSession(getDb(c.env.DB), sessionId)
  clearSessionCookie(c)
  return c.body(null, 204)
})

api.get(API_PATHS.ME, async (c) => {
  const user = await getCurrentUser(c)
  return c.json({ user }, 200, { 'Cache-Control': 'no-store' })
})

function isSameOrigin(c: { req: { url: string; header: (name: string) => string | undefined } }) {
  const origin = c.req.header('Origin')
  if (!origin) return true

  let originHost: string
  try {
    originHost = new URL(origin).host
  } catch {
    return false
  }

  // 只信 Host：X-Forwarded-Host 由客户端提供，可伪造
  const requestHost = c.req.header('host') ?? new URL(c.req.url).host
  return originHost === requestHost
}
