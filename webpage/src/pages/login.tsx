import { APP_NAME, MESSAGES, PAGE_PATHS, PHONE } from '@bibikitchen/web-constant'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { login } from '@/requests/auth'

export function LoginPage() {
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(undefined)
    try {
      const result = await login(phone.trim())
      if (!result.ok) {
        setError(result.error)
        return
      }
      // 首页数据由服务端渲染，整页跳转以获取最新会话
      window.location.assign(PAGE_PATHS.HOME)
    } catch {
      // fetch 本身失败（离线、断网）不会走到 login 的返回值分支
      setError(MESSAGES.LOGIN_FAILED_UNKNOWN)
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{APP_NAME}</CardTitle>
          <CardDescription>输入已登记的手机号码登录</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="phone" className="text-sm font-medium">
                手机号码
              </label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                inputMode="numeric"
                autoComplete="tel"
                maxLength={PHONE.length}
                required
                aria-invalid={error ? true : undefined}
              />
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? '登录中…' : '登录'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
