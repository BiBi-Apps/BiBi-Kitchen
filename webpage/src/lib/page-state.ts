import type { CurrentUser } from '@bibikitchen/web-service'
import type { AppFlags } from '@/contexts/flags'

/** 由服务端计算、随 HTML 一并发给浏览器，服务端渲染与首屏水合共用。 */
export type PageState = {
  user: CurrentUser | null
  flags: AppFlags
}

/**
 * 首屏状态的编解码：服务端写进 HTML 的 JSON 脚本，浏览器读出来水合。
 * 两端的格式必须完全一致，因此成对放在同一文件，改一处即改两端。
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
