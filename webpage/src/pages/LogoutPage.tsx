import { APP_NAME, PAGE_PATHS } from '@bibikitchen/web-constant'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/** 退出登录结果页：会话已作废，只提示并给出回登录页的入口。 */
export function LogoutPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{APP_NAME}</CardTitle>
          <CardDescription>您已退出登录</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full">
            <Link to={PAGE_PATHS.LOGIN}>返回登录页面</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
