import { PAGE_PATHS } from '@bibikitchen/web-constant'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { LogoutPage } from '@/pages/LogoutPage'

describe('LogoutPage', () => {
  it('提示已退出并提供回登录页的入口', () => {
    render(
      <MemoryRouter initialEntries={[PAGE_PATHS.LOGOUT]}>
        <LogoutPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('您已退出登录')).toBeTruthy()
    expect(screen.getByRole('link', { name: '返回登录页面' }).getAttribute('href')).toBe(
      PAGE_PATHS.LOGIN,
    )
  })
})
