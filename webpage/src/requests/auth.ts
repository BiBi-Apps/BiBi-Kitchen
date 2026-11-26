import { API_PATHS, MESSAGES } from '@bibikitchen/web-constant'
import type { CurrentUser } from '@bibikitchen/web-service'

// 本文件运行在浏览器，只发同源相对路径（API_PATHS 为编译期常量），不存在服务端出站请求

export async function login(
  phone: string,
): Promise<{ ok: true; user: CurrentUser } | { ok: false; error: string }> {
  // pi-lens-ignore: ts-ssrf -- 浏览器侧 fetch，URL 来自 web-constant 常量且为同源相对路径
  const res = await fetch(API_PATHS.LOGIN, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  })
  const data = (await res.json().catch(() => ({}))) as { user?: CurrentUser; error?: string }
  if (!res.ok || !data.user) {
    return { ok: false, error: data.error ?? MESSAGES.LOGIN_FAILED_UNKNOWN }
  }
  return { ok: true, user: data.user }
}

export async function logout(): Promise<void> {
  // pi-lens-ignore: ts-ssrf -- 同上：同源相对路径常量，无外部目标
  await fetch(API_PATHS.LOGOUT, { method: 'POST', credentials: 'same-origin' })
}
