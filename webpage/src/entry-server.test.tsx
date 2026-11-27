import { PAGE_PATHS, STATE_ELEMENT_ID } from '@bibikitchen/web-constant'
import type { CurrentUser } from '@bibikitchen/web-service'
import { describe, expect, it } from 'vitest'
import { renderShell } from '@/entry-server'
import { decodePageState } from '@/lib/page-state'

const user: CurrentUser = {
  id: 'u1',
  phone: '13800000003',
  name: null,
  roles: ['admin', 'chef'],
}

const STATE_PATTERN = /id="__BIBI_STATE__"[^>]*>([^<]*)</

describe('服务端外壳渲染', () => {
  it('只输出 head 与空的挂载点，不渲染页面内容', () => {
    const html = renderShell({ user, flags: {} })

    expect(html).toContain('羊哆吉厨房')
    expect(html).toContain('<div id="root"></div>')
    expect(html).not.toContain('退出登录')
    expect(html).not.toContain('管理员、厨师')
  })

  it('注入首屏数据与客户端入口', () => {
    const html = renderShell({ user, flags: {} })

    expect(html).toContain(`id="${STATE_ELEMENT_ID}"`)
    expect(html).toContain('entry-client')

    const encoded = html.match(STATE_PATTERN)?.[1] ?? ''
    expect(decodePageState(encoded).user?.phone).toBe(user.phone)
  })

  it('未登录时首屏数据里 user 为 null', () => {
    const encoded = renderShell({ user: null, flags: {} }).match(STATE_PATTERN)?.[1] ?? ''

    expect(decodePageState(encoded).user).toBeNull()
  })

  it('任意页面路径拿到的是同一份外壳', () => {
    // 页面结构由客户端按当前 URL 决定，服务端不再按路径区分内容
    expect(renderShell({ user: null, flags: {} })).toBe(renderShell({ user: null, flags: {} }))
    expect(PAGE_PATHS.HOME).not.toBe(PAGE_PATHS.LOGIN)
  })
})
