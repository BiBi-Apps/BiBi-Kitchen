import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginPage } from '@/pages/login'

const assign = vi.fn()

beforeEach(() => {
  assign.mockReset()
  Object.defineProperty(window, 'location', {
    value: { assign },
    writable: true,
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function mockFetch(handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  const fetchMock = vi.fn(handler)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('LoginPage', () => {
  it('渲染手机号输入框与登录按钮', () => {
    render(<LoginPage />)

    expect(screen.getByLabelText('手机号码')).toBeTruthy()
    expect(screen.getByRole('button', { name: '登录' })).toBeTruthy()
  })

  it('登录成功后整页跳转到首页', async () => {
    const fetchMock = mockFetch(async () =>
      Response.json({ user: { id: 'u1', phone: '13800000001', name: null, roles: ['admin'] } }),
    )
    render(<LoginPage />)

    await userEvent.type(screen.getByLabelText('手机号码'), '13800000001')
    await userEvent.click(screen.getByRole('button', { name: '登录' }))

    expect(assign).toHaveBeenCalledWith('/')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/login',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ phone: '13800000001' }) }),
    )
  })

  it('服务端拒绝时展示错误并保留输入', async () => {
    mockFetch(async () => Response.json({ error: '该手机号码未登记，无法登录' }, { status: 401 }))
    render(<LoginPage />)

    await userEvent.type(screen.getByLabelText('手机号码'), '13800000009')
    await userEvent.click(screen.getByRole('button', { name: '登录' }))

    expect(await screen.findByText('该手机号码未登记，无法登录')).toBeTruthy()
    expect((screen.getByLabelText('手机号码') as HTMLInputElement).value).toBe('13800000009')
    expect(assign).not.toHaveBeenCalled()
  })

  it('响应非 JSON 时回退到通用错误提示', async () => {
    mockFetch(async () => new Response('bad gateway', { status: 502 }))
    render(<LoginPage />)

    await userEvent.type(screen.getByLabelText('手机号码'), '13800000001')
    await userEvent.click(screen.getByRole('button', { name: '登录' }))

    expect(await screen.findByText('登录失败，请稍后重试')).toBeTruthy()
  })

  it('网络异常时复位按钮并提示失败，不卡在登录中', async () => {
    mockFetch(async () => {
      throw new TypeError('Failed to fetch')
    })
    render(<LoginPage />)

    await userEvent.type(screen.getByLabelText('手机号码'), '13800000001')
    await userEvent.click(screen.getByRole('button', { name: '登录' }))

    expect(await screen.findByText('登录失败，请稍后重试')).toBeTruthy()
    const button = screen.getByRole('button', { name: '登录' }) as HTMLButtonElement
    expect(button.disabled).toBe(false)
    expect(assign).not.toHaveBeenCalled()
  })
})
