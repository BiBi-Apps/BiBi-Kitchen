import { API_PATHS, MESSAGES, PAGE_PATHS, PHONE } from '@bibikitchen/web-constant'
import type { CurrentUser } from '@bibikitchen/web-service'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { APP_NAME } from '@bibikitchen/web-constant'
import { useUser } from '@/contexts/user'
import { readApiResponse } from '@/lib/api'

/** 登录页：表单提交走后端接口，成功后由客户端路由跳到首页。 */
export function LoginPage() {
  const { setUser } = useUser()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(undefined)

    try {
      // pi-lens-ignore: ts-ssrf -- 同源相对路径常量，无外部目标
      const res = await fetch(API_PATHS.LOGIN, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      })
      const result = await readApiResponse<{ user: CurrentUser | null }>(res)
      if (!result.ok || !result.data?.user) {
        setError(result.message)
        return
      }
      setUser(result.data.user)
      navigate(PAGE_PATHS.HOME)
    } catch {
      // fetch 本身失败（离线、断网）不会走到上面的返回值分支
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
              <p className="text-sm text-destructive">{error ?? ''}</p>
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
