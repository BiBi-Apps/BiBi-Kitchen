import { Route, Routes } from 'react-router-dom'
import { FlagsProvider } from '@/contexts/flags'
import { UserProvider } from '@/contexts/user'
import type { PageState } from '@/lib/page-state'
import { PAGE_ROUTES } from '@/lib/routes'

/** 应用根：首屏由服务端渲染，之后的路由交给客户端。 */
export function App({ state }: { state: PageState }) {
  return (
    <FlagsProvider flags={state.flags}>
      <UserProvider state={state}>
        <Routes>
          {PAGE_ROUTES.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}
        </Routes>
      </UserProvider>
    </FlagsProvider>
  )
}
