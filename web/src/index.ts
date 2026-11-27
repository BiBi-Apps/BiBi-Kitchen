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
      // 首屏由服务端渲染，之后由客户端 bundle 接管路由；样式来自构建产物与内联样式属性
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
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
