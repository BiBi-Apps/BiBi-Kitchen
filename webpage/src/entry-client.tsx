import { STATE_ELEMENT_ID } from '@bibikitchen/web-constant'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from '@/components/App'
import { decodePageState } from '@/lib/page-state'

const root = document.getElementById('root')
if (!root) throw new Error('缺少 #root 挂载点')

const state = decodePageState(document.getElementById(STATE_ELEMENT_ID)?.textContent ?? '')

// 服务端只给外壳与数据，页面结构全部在浏览器渲染，因此用 createRoot 而非 hydrateRoot
createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <App state={state} />
    </BrowserRouter>
  </StrictMode>,
)
