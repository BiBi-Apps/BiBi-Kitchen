import { API_CODES, API_PATHS, MESSAGES, PHONE } from '@bibikitchen/web-constant'
import type { ApiResponse } from '@bibikitchen/web-constant'
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

type Bindings = ServiceEnv

/** 数据与写操作接口：页面跳转之外的请求都走这里，返回体统一为 ApiResponse。 */
export const api = new Hono<{ Bindings: Bindings }>()

/** 成功返回：code 与 HTTP 状态码一致。 */
function ok<T>(data: T, message: string = MESSAGES.SUCCESS) {
  return { code: API_CODES.OK, message, data } satisfies ApiResponse<T>
}

/** 失败返回：HTTP 状态码取同一个 code，`data` 固定为 null。 */
function fail(code: API_CODES, message: string, status: 400 | 401 | 403) {
  const body = { code, message, data: null } satisfies ApiResponse<null>
  return { body, status }
}

api.get(API_PATHS.ME, async (c) => {
  const user = await getCurrentUser(c)
  return c.json(ok({ user }), 200, { 'Cache-Control': 'no-store' })
})

api.post(API_PATHS.LOGIN, async (c) => {
  if (!isSameOrigin(c)) {
    const { body, status } = fail(
      API_CODES.FORBIDDEN,
      MESSAGES.CROSS_SITE_REJECTED,
      API_CODES.FORBIDDEN,
    )
    return c.json(body, status)
  }

  // JSON 可以是 null 或数组，解析成功也不代表是对象
  const parsed = await c.req.json<{ phone?: string } | null>().catch(() => null)
  const phone = String(parsed?.phone ?? '').trim()
  if (!PHONE.pattern.test(phone)) {
    const { body, status } = fail(
      API_CODES.BAD_REQUEST,
      MESSAGES.PHONE_FORMAT_INVALID,
      API_CODES.BAD_REQUEST,
    )
    return c.json(body, status)
  }

  // 传入当前会话 ID：登录成功后先作废旧会话（会话轮换），防止登录前持有的会话继续有效
  const result = await loginWithPhone(c.env, phone, readSessionId(c))
  if (!result.ok) {
    const notRegistered = result.reason === 'not-registered'
    const { body, status } = fail(
      notRegistered ? API_CODES.UNAUTHORIZED : API_CODES.BAD_REQUEST,
      notRegistered ? MESSAGES.PHONE_NOT_REGISTERED : MESSAGES.PHONE_FORMAT_INVALID,
      notRegistered ? API_CODES.UNAUTHORIZED : API_CODES.BAD_REQUEST,
    )
    return c.json(body, status)
  }

  setSessionCookie(c, result.sessionId, result.expiresAt)
  const user = await findCurrentUser(getDb(c.env.DB), result.sessionId)
  return c.json(ok({ user }))
})

api.post(API_PATHS.LOGOUT, async (c) => {
  if (!isSameOrigin(c)) {
    const { body, status } = fail(
      API_CODES.FORBIDDEN,
      MESSAGES.CROSS_SITE_REJECTED,
      API_CODES.FORBIDDEN,
    )
    return c.json(body, status)
  }

  const sessionId = readSessionId(c)
  if (sessionId) await deleteSession(getDb(c.env.DB), sessionId)
  clearSessionCookie(c)
  return c.json(ok(null))
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
