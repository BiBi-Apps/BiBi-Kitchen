import { env } from 'cloudflare:workers'
import { beforeEach, describe, expect, it } from 'vitest'

/** Drizzle 的 enum 只在 TypeScript 层生效，这里验证数据库层的 CHECK 真的拦得住。 */
beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare('delete from user_roles'),
    env.DB.prepare('delete from users'),
  ])
  await env.DB.prepare('insert into users (id, phone, created_at) values (?, ?, ?)')
    .bind('u1', '13800000001', Date.now())
    .run()
})

describe('user_roles.role 约束', () => {
  it('拒绝枚举外的角色值', async () => {
    await expect(
      env.DB.prepare('insert into user_roles (user_id, role) values (?, ?)')
        .bind('u1', 'owner')
        .run(),
    ).rejects.toThrow()
  })

  it('接受 admin 与 chef', async () => {
    await env.DB.batch([
      env.DB.prepare('insert into user_roles (user_id, role) values (?, ?)').bind('u1', 'admin'),
      env.DB.prepare('insert into user_roles (user_id, role) values (?, ?)').bind('u1', 'chef'),
    ])

    const row = await env.DB.prepare('select count(*) as count from user_roles').first<{
      count: number
    }>()
    expect(row?.count).toBe(2)
  })
})
