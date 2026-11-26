import type { CurrentUser } from '@bibikitchen/web-service'
import { APP_NAME, PAGE_PATHS, ROLE_LABELS } from '@bibikitchen/web-constant'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { logout } from '@/requests/auth'
import { useFlags } from '@/hooks/use-flags'

async function handleLogout() {
  await logout()
  window.location.assign(PAGE_PATHS.HOME)
}

export function HomePage({ user }: { user: CurrentUser | null }) {
  const { showLogout } = useFlags()

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
              {showLogout ? (
                <Button type="button" variant="outline" className="w-full" onClick={handleLogout}>
                  退出登录（仅开发环境）
                </Button>
              ) : null}
            </div>
          ) : (
            <Button className="w-full">
              <a href={PAGE_PATHS.LOGIN}>登录</a>
            </Button>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
