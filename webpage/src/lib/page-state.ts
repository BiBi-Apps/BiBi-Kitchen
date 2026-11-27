import type { CurrentUser } from '@bibikitchen/web-service'
import type { AppFlags } from '@/contexts/flags'

/** 首屏数据：服务端算好后随 HTML 下发，水合时直接复用，不重复请求接口。 */
export type PageState = {
  user: CurrentUser | null
  /** 依赖服务端环境的渲染开关，当前没有开关项。 */
  flags: AppFlags
}

/**
 * 首屏状态的编解码：服务端写进 HTML 的 JSON 脚本，浏览器读出来水合。
 * 两端格式必须完全一致，因此成对放在同一文件。
 */
export function encodePageState(state: PageState): string {
  const bytes = new TextEncoder().encode(JSON.stringify(state))
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

export function decodePageState(encoded: string): PageState {
  const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes)) as PageState
}
