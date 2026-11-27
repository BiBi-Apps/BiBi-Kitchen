import { API_PATHS, APP_NAME, PAGE_PATHS, ROLE_LABELS } from '@bibikitchen/web-constant'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useUser } from '@/contexts/user'

/** 首页：已登录时展示用户信息并可退出，未登录时给出登录入口。 */
export function HomePage() {
  const { user, setUser } = useUser()
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)

  async function handleLogout() {
    setPending(true)
    try {
      // pi-lens-ignore: ts-ssrf -- 同源相对路径常量，无外部目标
      await fetch(API_PATHS.LOGOUT, { method: 'POST', credentials: 'same-origin' })
      setUser(null)
      navigate(PAGE_PATHS.LOGOUT)
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{APP_NAME}</CardTitle>
        </CardHeader>
        <CardContent>
          {user ? (
            <div className="grid gap-3">
              <p className="text-sm">{user.name ?? '未命名'}</p>
              <p className="text-sm">{user.phone}</p>
              <p className="text-sm text-muted-foreground">
                {user.roles.map((role) => ROLE_LABELS[role]).join('、') || '无用户级角色'}
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleLogout}
                disabled={pending}
              >
                退出登录
              </Button>
            </div>
          ) : (
            <Button className="w-full">
              <Link to={PAGE_PATHS.LOGIN}>登录</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
