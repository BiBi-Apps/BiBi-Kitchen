export { getDb } from './db/client'
export type { Db } from './db/client'
export { sessions, userRoles, users } from './db/schema'
export type { ServiceEnv } from './env'
export { type LoginResult, loginWithPhone } from './auth'
export {
  clearSessionCookie,
  createSession,
  type CurrentUser,
  deleteSession,
  findCurrentUser,
  getCurrentUser,
  readSessionId,
  setSessionCookie,
  type UserRole,
} from './session'
