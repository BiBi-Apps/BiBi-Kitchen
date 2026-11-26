import { USER_ROLES } from '@bibikitchen/web-constant'
import { sql } from 'drizzle-orm'
import { check, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

const timestamps = {
  createdAt: integer('created_at').notNull(),
}

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  phone: text('phone').notNull().unique(),
  name: text('name'),
  ...timestamps,
})

export const userRoles = sqliteTable(
  'user_roles',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    role: text('role', {
      enum: Object.values(USER_ROLES) as [USER_ROLES, ...USER_ROLES[]],
    }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.role] }),
    // Drizzle 的 enum 只在 TypeScript 层生效，数据库需要 CHECK 才能拦住误写
    check('user_roles_role_check', sql`${table.role} in ('admin', 'chef')`),
  ],
)

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  expiresAt: integer('expires_at').notNull(),
  ...timestamps,
})
