import { API_PATHS } from '@bibikitchen/web-constant'
import type { CurrentUser } from '@bibikitchen/web-service'
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { readApiResponse } from '@/lib/api'
import type { PageState } from '@/lib/page-state'

type UserContextValue = {
  user: CurrentUser | null
  setUser: (user: CurrentUser | null) => void
}

const UserContext = createContext<UserContextValue | null>(null)

async function fetchCurrentUser(): Promise<CurrentUser | null> {
  // pi-lens-ignore: ts-ssrf -- 同源相对路径常量，无外部目标
  const res = await fetch(API_PATHS.ME, { credentials: 'same-origin' })
  const result = await readApiResponse<{ user: CurrentUser | null }>(res)
  return result.ok ? (result.data?.user ?? null) : null
}

/** 当前用户：首屏用服务端下发的数据，之后每次客户端跳转再向接口核一次。 */
export function UserProvider({ state, children }: { state: PageState; children: ReactNode }) {
  const [user, setUser] = useState(state.user)
  const location = useLocation()
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    let alive = true
    fetchCurrentUser()
      .then((next) => {
        if (alive) setUser(next)
      })
      .catch(() => {})

    return () => {
      alive = false
    }
  }, [location.pathname])

  return <UserContext value={{ user, setUser }}>{children}</UserContext>
}

/** 缺失 Provider 时直接报错，而不是静默当成未登录。 */
export function useUser(): UserContextValue {
  const value = useContext(UserContext)
  if (!value) throw new Error('缺少 UserProvider')
  return value
}
