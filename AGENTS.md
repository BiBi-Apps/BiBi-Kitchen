# BiBiKitchen 代码仓库

`apps/` 为 Git 与 npm workspace 根目录，含四个 workspace。上层 `../AGENTS.md` 的沟通原则、Git 工作流与编码原则同样适用。

| Workspace       | 职责与产物                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------- |
| `web-constant/` | 共享常量与契约：项目名、页面路径、角色、手机号规则、会话、提示文案、KV Key。无任何依赖。产物 `dist/`（实现与 `.d.ts` 声明）。                   |
| `web-service/`  | 共用逻辑：Drizzle schema、D1 访问、会话与登录规则。产物 `dist/`（实现与声明）。                                         |
| `webpage/`      | 页面：Hono 子应用 + React SSR + shadcn 组件 + Tailwind 样式；含登录/退出表单路由。产物 `dist/client`、`dist/server`。 |
| `web/`          | 接入：Worker 入口、`wrangler.jsonc`、Worker 构建与集成测试。产物 `dist/<worker>`。                             |

- 每个包只产出自己的 `dist`，下游只引用产物：`web` 不构建页面，`webpage` 不构建 Worker。
- 页面是 SPA：服务端只渲染 HTML 外壳（`<head>`、空 `#root`、首屏数据 JSON），页面结构与路由全在浏览器（`react-router-dom`）执行。
- 页面跳转之外的数据与写操作一律走 `web/src/routes/` 的 `/api/*` 接口（JSON），页面用 `fetch` 调用。
- 业务规则写进 `web-service/`，不要在页面或路由里重复实现；页面只调用它。
- 同一个值被两个以上 workspace 引用（路径、角色、文案、Cookie 名、手机号规则等）就放 `web-constant/`，不要各处再写字面量；只在一个包内使用的值留在该包。
- `web-constant/` 只放纯常量与类型，不放函数、不引入依赖，尤其不得引用其他 workspace。
- 页面、组件与样式只放 `webpage/src/`；API 路由只放 `web/src/routes/`。
- `webpage/src/` 分层：`pages/` 页面、`components/` 组件（`ui/` 为 shadcn 基础组件，`Root.tsx` 为整页 HTML 骨架）、`contexts/` 上下文与 Provider、`hooks/` 自定义 hook、`utils/` 纯函数、`lib/` 跨层共享类型与映射（页面渲染状态、`routes.tsx` 的路径→页面映射）。新增文件按职责归位，不随意新建目录。
- 新增页面只改 `webpage/src/lib/routes.tsx` 一处，并在 `webpage/src/server.tsx` 挂上对应 GET 路径；写操作另在 `web/src/routes/` 注册。
- 依赖方向单向：`web` → `webpage` → `web-service` → `web-constant`；反向依赖一律禁止。
- 只有服务端代码能访问 D1、KV、R2 或 DO；浏览器只请求同源 `/api/*`。
- 首屏数据由服务端算好随外壳下发，客户端挂载时直接使用，不重复拉取；之后每次客户端跳转由 `contexts/user.tsx` 的 `UserProvider` 调 `/api/me` 复核。
- 退出登录不随环境隐藏：调试与生产都可用，`ENVIRONMENT` 变量留作其他环境判断。
- 依赖服务端环境的渲染开关统一由 `webpage/src/contexts/flags.tsx` 的 `FlagsProvider` 提供，组件用 `hooks/use-flags` 的 `useFlags()` 读取；当前无开关项，新增时同时改 `AppFlags` 类型与 `server.tsx` 的 `flagsOf()`。

## 提交前

```sh
npm run lint && npm test
```

- `test` 与 `lint` 会自动先构建上游包（turbo `dependsOn: ["^build"]`），类型检查读的是各包 `dist/` 里的声明文件；改了导出签名先确认上游产物是新的。
- `lint` 已经在每个 workspace 内跑类型检查、`oxfmt --check` 与 `oxlint`；不要再单独加 `check` / `format:check`。
- 需自动修复时用 `npm run fix`（`oxfmt` + `oxlint --fix`），提交前再跑一次 `lint` 确认。
- 四个 workspace 共用 `apps/.oxlintrc.json` 与 `apps/.oxfmtrc.json`，不要在各工作区另建配置；`typescript`、`oxfmt`、`oxlint`、`concurrently` 只在 `apps/package.json` 声明。
- 测试文件与源文件同目录（`*.test.ts` / `*.test.tsx`）；测试类型声明放在各工作区的 `test/`。页面测试直接断言 `renderPage` 产出的 HTML 字符串。
- `pages/` 与 `components/`（`ui/` 除外）一文件一组件，文件名与组件名同名的 PascalCase，详见 `webpage/AGENTS.md`。

## 文档归档

- 本地开发操作统一归档到 `docs/`，不要写进 `README.md`。
- 属于本地操作的范围：本地数据库迁移与查询、本地 KV/对象存储预置、本地数据重置、本地环境变量、本地调试与验证技巧。
- `README.md` 只保留：项目说明与结构、通用命令（`dev`、`check`、`build`）、远端或生产相关操作，以及指向 `docs/` 的链接。
- 新增一类本地操作时，追加或新建对应的 `docs/*.md`，并在 README 加一条链接；不把命令散落在 README 正文里。

## 语言

- `README.md` 默认为英文。
- 简体中文版放在 `docs/readme/README.zh-CN.md`，两份互相提供语言切换链接；只改结构或命令时两边同步。
