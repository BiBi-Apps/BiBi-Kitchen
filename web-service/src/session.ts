import { SESSION, USER_ROLES } from '@bibikitchen/web-constant'
import { and, eq, gt } from 'drizzle-orm'
import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { ulid } from 'ulidx'
import type { Db } from './db/client'
import { getDb } from './db/client'
import { sessions, userRoles, users } from './db/schema'
import type { ServiceEnv } from './env'

export type UserRole = USER_ROLES

export type CurrentUser = {
  id: string
  phone: string
  name: string | null
  roles: UserRole[]
}

export async function createSession(db: Db, userId: string) {
  const id = ulid()
  const now = Date.now()
  const expiresAt = now + SESSION.ttlMs
  await db.insert(sessions).values({ id, userId, expiresAt, createdAt: now })
  return { id, expiresAt }
}

export async function deleteSession(db: Db, sessionId: string) {
  await db.delete(sessions).where(eq(sessions.id, sessionId))
}

export async function findCurrentUser(db: Db, sessionId: string): Promise<CurrentUser | null> {
  const rows = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, Date.now())))
    .limit(1)
  const userId = rows[0]?.userId
  if (!userId) return null

  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  const user = userRows[0]
  if (!user) return null

  const roleRows = await db
    .select({ role: userRoles.role })
    .from(userRoles)
    .where(eq(userRoles.userId, userId))
    .orderBy(userRoles.role)

  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    roles: roleRows.map((row: { role: USER_ROLES }) => row.role),
  }
}

/** 从请求 Cookie 恢复当前用户；页面与接口共用。允许调用方在 ServiceEnv 上叠加自有绑定。 */
export async function getCurrentUser<E extends ServiceEnv>(
  c: Context<{ Bindings: E }>,
): Promise<CurrentUser | null> {
  const sessionId = readSessionId(c)
  if (!sessionId) return null
  return findCurrentUser(getDb(c.env.DB), sessionId)
}

export function setSessionCookie(c: Context, sessionId: string, expiresAt: number) {
  setCookie(c, SESSION.cookieName, sessionId, {
    httpOnly: true,
    secure: isHttps(c),
    sameSite: 'Lax',
    path: '/',
    maxAge: Math.floor((expiresAt - Date.now()) / 1000),
  })
}

export function clearSessionCookie(c: Context) {
  deleteCookie(c, SESSION.cookieName, { path: '/', secure: isHttps(c), sameSite: 'Lax' })
}

export function readSessionId(c: Context) {
  return getCookie(c, SESSION.cookieName)
}

function isHttps(c: Context) {
  return new URL(c.req.url).protocol === 'https:'
}
