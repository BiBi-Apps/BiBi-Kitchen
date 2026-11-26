import type { CurrentUser } from '@bibikitchen/web-service'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FlagsProvider } from '@/contexts/flags'
import { HomePage } from '@/pages/home'

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

/** 环境开关由 Provider 提供，user 仍走 props。 */
function renderHome(user: CurrentUser | null, showLogout: boolean) {
  return render(
    <FlagsProvider flags={{ showLogout }}>
      <HomePage user={user} />
    </FlagsProvider>,
  )
}

describe('HomePage', () => {
  it('未登录时显示登录入口', () => {
    renderHome(null, false)

    expect(screen.getByRole('link', { name: '登录' })).toBeTruthy()
  })

  it('已登录时显示手机号与全部角色', () => {
    renderHome({ id: 'u1', phone: '13800000003', name: null, roles: ['admin', 'chef'] }, true)

    expect(screen.getByText('13800000003')).toBeTruthy()
    expect(screen.getByText('未命名')).toBeTruthy()
    expect(screen.getByText('管理员、厨师')).toBeTruthy()
  })

  it('无用户级角色时显示占位文案', () => {
    renderHome({ id: 'u1', phone: '13800000008', name: '张三', roles: [] }, false)

    expect(screen.getByText('张三')).toBeTruthy()
    expect(screen.getByText('无用户级角色')).toBeTruthy()
  })

  it('非退出环境不显示退出按钮', () => {
    renderHome({ id: 'u1', phone: '13800000001', name: null, roles: ['admin'] }, false)

    expect(screen.queryByRole('button', { name: /退出登录/ })).toBeNull()
  })

  it('点击退出后调用接口并回到首页', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    renderHome({ id: 'u1', phone: '13800000001', name: null, roles: ['admin'] }, true)

    await userEvent.click(screen.getByRole('button', { name: '退出登录（仅开发环境）' }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/logout',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(assign).toHaveBeenCalledWith('/')
  })
})
