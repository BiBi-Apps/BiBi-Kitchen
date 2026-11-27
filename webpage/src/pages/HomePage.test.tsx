import type { CurrentUser } from '@bibikitchen/web-service'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UserProvider } from '@/contexts/user'
import { HomePage } from '@/pages/HomePage'

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

/** 页面依赖 UserProvider 提供当前用户，路由由 MemoryRouter 提供。 */
function renderHome(user: CurrentUser | null) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <UserProvider state={{ user, flags: {} }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/logout" element={<p>已跳转到退出页</p>} />
        </Routes>
      </UserProvider>
    </MemoryRouter>,
  )
}

describe('HomePage', () => {
  it('未登录时显示登录入口', () => {
    renderHome(null)

    expect(screen.getByRole('link', { name: '登录' })).toBeTruthy()
  })

  it('已登录时显示手机号与全部角色', () => {
    renderHome({ id: 'u1', phone: '13800000003', name: null, roles: ['admin', 'chef'] })

    expect(screen.getByText('13800000003')).toBeTruthy()
    expect(screen.getByText('未命名')).toBeTruthy()
    expect(screen.getByText('管理员、厨师')).toBeTruthy()
  })

  it('无用户级角色时显示占位文案', () => {
    renderHome({ id: 'u1', phone: '13800000008', name: '张三', roles: [] })

    expect(screen.getByText('无用户级角色')).toBeTruthy()
  })

  it('退出登录调用接口并跳转退出页', async () => {
    fetchMock.mockResolvedValue(Response.json({ code: 200, message: '操作成功', data: null }))
    renderHome({ id: 'u1', phone: '13800000001', name: null, roles: ['admin'] })

    await userEvent.click(screen.getByRole('button', { name: '退出登录' }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/logout',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(await screen.findByText('已跳转到退出页')).toBeTruthy()
  })
})
