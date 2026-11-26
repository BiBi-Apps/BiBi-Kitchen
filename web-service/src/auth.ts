import { PHONE, USER_ROLES } from '@bibikitchen/web-constant'
import { eq } from 'drizzle-orm'
import { ulid } from 'ulidx'
import { getDb } from './db/client'
import { userRoles, users } from './db/schema'
import type { ServiceEnv } from './env'
import { createSession, deleteSession } from './session'

export type LoginResult =
  | { ok: true; userId: string; sessionId: string; expiresAt: number }
  | { ok: false; reason: 'invalid-phone' | 'not-registered' }

/**
 * 手机号登录：已存在则直接建会话；不存在时按 KV 预置号码自动注册并授予角色。
 * KV 只在首次注册时生效，已有用户以其数据库角色为准。
 * 传入 currentSessionId 时先将其作废（会话轮换），避免登录前持有的旧会话继续有效。
 */
export async function loginWithPhone(
  env: ServiceEnv,
  rawPhone: string,
  currentSessionId?: string,
): Promise<LoginResult> {
  const phone = rawPhone.trim()
  if (!PHONE.pattern.test(phone)) return { ok: false, reason: 'invalid-phone' }

  const db = getDb(env.DB)
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1)

  let userId = existing[0]?.id
  if (!userId) {
    const roles = await resolveRolesFromKv(env, phone)
    if (roles.length === 0) return { ok: false, reason: 'not-registered' }

    const id = ulid()
    try {
      await db.batch([
        db.insert(users).values({ id, phone, createdAt: Date.now() }),
        ...roles.map((role) => db.insert(userRoles).values({ userId: id, role })),
      ])
      userId = id
    } catch {
      // 并发注册时以先写入者为准
      const retry = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.phone, phone))
        .limit(1)
      if (!retry[0]) throw new Error(`注册手机号 ${phone} 失败`)
      userId = retry[0].id
    }
  }

  if (currentSessionId) await deleteSession(db, currentSessionId)

  const session = await createSession(db, userId)
  return { ok: true, userId, sessionId: session.id, expiresAt: session.expiresAt }
}

/** 同一号码同时出现在两个 KV 时返回两个角色。 */
async function resolveRolesFromKv(env: ServiceEnv, phone: string): Promise<USER_ROLES[]> {
  const roles: USER_ROLES[] = []
  if (await env.ADMIN_PHONES.get(phone)) roles.push(USER_ROLES.ADMIN)
  if (await env.CHEF_PHONES.get(phone)) roles.push(USER_ROLES.CHEF)
  return roles
}
