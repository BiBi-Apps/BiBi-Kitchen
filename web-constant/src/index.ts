/** 跨 workspace 共享的常量与契约；本包不依赖任何 workspace，只放会被两处以上引用的值。 */

export const APP_NAME = '羊哆吉厨房'

/** 页面路径：既可取值（PAGE_PATHS.HOME），也可作为类型使用（Record<PAGE_PATHS, T>）。 */
export const PAGE_PATHS = {
  HOME: '/',
  LOGIN: '/login',
  LOGOUT: '/logout',
} as const
export type PAGE_PATHS = (typeof PAGE_PATHS)[keyof typeof PAGE_PATHS]

/** 接口路径：页面跳转之外的数据请求都走这里，客户端与测试共用。 */
export const API_PATHS = {
  LOGIN: '/api/login',
  LOGOUT: '/api/logout',
  ME: '/api/me',
} as const
export type API_PATHS = (typeof API_PATHS)[keyof typeof API_PATHS]

/** 用户级角色：数据库枚举、会话返回体与界面显示共用。 */
export const USER_ROLES = {
  ADMIN: 'admin',
  CHEF: 'chef',
} as const
export type USER_ROLES = (typeof USER_ROLES)[keyof typeof USER_ROLES]

export const ROLE_LABELS: Record<USER_ROLES, string> = {
  [USER_ROLES.ADMIN]: '管理员',
  [USER_ROLES.CHEF]: '厨师',
}

/** 中国大陆 11 位手机号：服务端格式校验与输入框 maxlength 共用。 */
export const PHONE = {
  length: 11,
  pattern: /^1[3-9]\d{9}$/,
} as const

/** KV 中存放预置手机号清单的 Key：服务端读取与测试预置共用。 */
export const KV_KEYS = {
  ADMIN_PHONES: 'ADMIN_PHONES',
  CHEF_PHONES: 'CHEF_PHONES',
} as const

/** 会话 Cookie 是对外契约，值不随实现变化。 */
export const SESSION = {
  cookieName: 'session',
  ttlMs: 30 * 24 * 60 * 60 * 1000,
} as const

/** 页面文案：服务端渲染与接口返回共用。 */
export const MESSAGES = {
  SUCCESS: '操作成功',
  PHONE_FORMAT_INVALID: '请输入 11 位手机号码',
  PHONE_NOT_REGISTERED: '该手机号码未登记，无法登录',
  CROSS_SITE_REJECTED: '跨站请求被拒绝',
  LOGIN_FAILED_UNKNOWN: '登录失败，请稍后重试',
} as const

/**
 * 接口统一返回体：`code` 与 HTTP 状态码一致，`message` 供页面直接展示，
 * `data` 为业务数据，无数据时用 `null`。
 */
export type ApiResponse<T> = {
  code: number
  message: string
  data: T
}

/** 接口返回码：取值与 HTTP 状态码一致，避免两套编号。 */
export const API_CODES = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  INTERNAL_ERROR: 500,
} as const
export type API_CODES = (typeof API_CODES)[keyof typeof API_CODES]

/** 服务端渲染时承载首屏数据的元素 id，水合时按此读取。 */
export const STATE_ELEMENT_ID = '__BIBI_STATE__'
