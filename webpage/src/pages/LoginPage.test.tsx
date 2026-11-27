import { MESSAGES } from '@bibikitchen/web-constant'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { UserProvider } from '@/contexts/user'
import { LoginPage } from '@/pages/LoginPage'

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <UserProvider state={{ user: null, flags: {} }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<p>已跳转到首页</p>} />
        </Routes>
      </UserProvider>
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  it('渲染手机号输入框与登录按钮', () => {
    renderLogin()

    expect(screen.getByLabelText('手机号码')).toBeTruthy()
    expect(screen.getByRole('button', { name: '登录' })).toBeTruthy()
  })

  it('登录成功后跳转首页', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        code: 200,
        message: '操作成功',
        data: { user: { id: 'u1', phone: '13800000001', name: null, roles: ['admin'] } },
      }),
    )
    renderLogin()

    await userEvent.type(screen.getByLabelText('手机号码'), '13800000001')
    await userEvent.click(screen.getByRole('button', { name: '登录' }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ phone: '13800000001' }),
      }),
    )
    expect(await screen.findByText('已跳转到首页')).toBeTruthy()
  })

  it('接口拒绝时展示返回的错误并保留输入', async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        { code: 401, message: MESSAGES.PHONE_NOT_REGISTERED, data: null },
        { status: 401 },
      ),
    )
    renderLogin()

    await userEvent.type(screen.getByLabelText('手机号码'), '13800000009')
    await userEvent.click(screen.getByRole('button', { name: '登录' }))

    expect(await screen.findByText(MESSAGES.PHONE_NOT_REGISTERED)).toBeTruthy()
    expect((screen.getByLabelText('手机号码') as HTMLInputElement).value).toBe('13800000009')
    expect(screen.queryByText('已跳转到首页')).toBeNull()
  })

  it('响应非 JSON 时回退到通用错误提示', async () => {
    fetchMock.mockResolvedValue(new Response('bad gateway', { status: 502 }))
    renderLogin()

    await userEvent.type(screen.getByLabelText('手机号码'), '13800000001')
    await userEvent.click(screen.getByRole('button', { name: '登录' }))

    expect(await screen.findByText(MESSAGES.LOGIN_FAILED_UNKNOWN)).toBeTruthy()
  })

  it('网络异常时复位按钮并提示失败', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    renderLogin()

    await userEvent.type(screen.getByLabelText('手机号码'), '13800000001')
    await userEvent.click(screen.getByRole('button', { name: '登录' }))

    expect(await screen.findByText(MESSAGES.LOGIN_FAILED_UNKNOWN)).toBeTruthy()
    expect((screen.getByRole('button', { name: '登录' }) as HTMLButtonElement).disabled).toBe(false)
  })
})
