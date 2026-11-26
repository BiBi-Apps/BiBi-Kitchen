import { webpage } from '@bibikitchen/webpage/server'
import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'
import { api } from './routes/auth'

const app = new Hono<{ Bindings: CloudflareBindings }>()

app.use(
  '*',
  secureHeaders({
    // 与 CSP 的 frame-ancestors 'none' 保持一致：不允许被任何页面嵌入
    xFrameOptions: 'DENY',
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      // 开发态 Vite 会注入 react-refresh 内联脚本、内联样式，HMR 走同源 WebSocket；
      // 生产构建无内联脚本，后续收紧为 script-src 'self' 时需先确认无内联注入。
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", 'ws:', 'wss:'],
      objectSrc: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
    },
  }),
)

app.route('/', api)
app.route('/', webpage)

export default app
