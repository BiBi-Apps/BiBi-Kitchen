import { STATE_ELEMENT_ID } from '@bibikitchen/web-constant'
import { StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { FlagsProvider } from '@/contexts/flags'
import { decodePageState } from '@/lib/page-state'
import { createPage } from '@/lib/routes'

const root = document.getElementById('root')
if (!root) throw new Error('缺少 #root 挂载点')

const state = decodePageState(document.getElementById(STATE_ELEMENT_ID)?.textContent ?? '')
const page = createPage(window.location.pathname, state)

if (page) {
  hydrateRoot(
    root,
    <StrictMode>
      <FlagsProvider flags={state.flags}>{page}</FlagsProvider>
    </StrictMode>,
  )
}
