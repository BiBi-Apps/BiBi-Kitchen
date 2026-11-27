import { createContext, type ReactNode } from 'react'

/**
 * 由服务端环境决定、渲染期只读的开关；客户端不重新计算，避免水合结果不一致。
 * 当前没有开关项，新增时在这里加字段，并在 `webpage/src/server.tsx` 里按环境算好。
 */
export type AppFlags = Record<string, never>

export const FlagsContext = createContext<AppFlags | null>(null)

/** React 19 允许把 Context 本身当作 Provider 使用。 */
export function FlagsProvider({ flags, children }: { flags: AppFlags; children: ReactNode }) {
  return <FlagsContext value={flags}>{children}</FlagsContext>
}
