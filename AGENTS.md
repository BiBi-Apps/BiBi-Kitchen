# BiBiKitchen 代码仓库

`apps/` 为 Git 与 npm workspace 根目录，含四个 workspace。上层 `../AGENTS.md` 的沟通原则、Git 工作流与编码原则同样适用。

| Workspace       | 职责                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| `web-constant/` | 共享常量与契约：项目名、页面/API 路径、角色、手机号规则、会话、提示文案、初始状态元素 id。无任何依赖。 |
| `web-service/`  | 共用逻辑：Drizzle schema、D1 访问、会话与登录规则。不依赖 HTTP 框架的路由。                            |
| `webpage/`      | 页面：Hono 子应用 + React SSR + 客户端水合 + shadcn 组件 + Tailwind 样式。                             |
| `web/`          | 接入：Worker 入口、API 路由、`wrangler.jsonc`、Vite 构建与集成测试。                                   |

- 业务规则写进 `web-service/`，不要在页面或接口里重复实现；页面与接口都只调用它。
- 同一个值被两个以上 workspace 引用（路径、角色、文案、Cookie 名、手机号规则等）就放 `web-constant/`，不要各处再写字面量；只在一个包内使用的值留在该包。
- `web-constant/` 只放纯常量与类型，不放函数、不引入依赖，尤其不得引用其他 workspace。
- 页面、组件与样式只放 `webpage/src/`；API 路由只放 `web/src/routes/`。
- `webpage/src/` 分层：`pages/` 页面、`components/` 组件（`ui/` 为 shadcn 基础组件，`root.tsx` 为整页 HTML 骨架）、`contexts/` 上下文与 Provider、`hooks/` 自定义 hook、`requests/` 浏览器端请求、`utils/` 纯函数、`lib/` 跨层共享类型与映射（首屏状态编解码、`routes.tsx` 的路径→页面映射）。新增文件按职责归位，不随意新建目录。
- 新增页面只改 `webpage/src/lib/routes.tsx` 一处；服务端渲染与客户端水合都从它取页面，不要各写一遍。
- 依赖方向单向：`web` → `webpage` → `web-service` → `web-constant`；反向依赖一律禁止。
- 浏览器代码只能请求 `/api/*`，不得直接访问 D1、KV、R2 或 DO。
- 页面走 SSR + 水合：首屏数据由服务端放进 HTML，客户端不要重复拉取同一份数据。
- 依赖环境的开关（如仅开发环境的退出按钮）由 `webpage/src/contexts/flags.tsx` 的 `FlagsProvider` 提供，组件用 `hooks/use-flags` 的 `useFlags()` 读取；不要塞进页面 props，也不在浏览器重新判断环境。

## 提交前

```sh
npm run lint && npm test
```

- `lint` 已经在每个 workspace 内跑类型检查、`oxfmt --check` 与 `oxlint`；不要再单独加 `check` / `format:check`。
- 需自动修复时用 `npm run fix`（`oxfmt` + `oxlint --fix`），提交前再跑一次 `lint` 确认。
- 四个 workspace 共用 `apps/.oxlintrc.json` 与 `apps/.oxfmtrc.json`，不要在各工作区另建配置；`typescript`、`oxfmt`、`oxlint`、`concurrently` 只在 `apps/package.json` 声明。
- 测试文件与源文件同目录（`*.test.ts` / `*.test.tsx`）；setup 与测试类型声明放在各工作区的 `test/`。

## 文档归档

- 本地开发操作统一归档到 `docs/`，不要写进 `README.md`。
- 属于本地操作的范围：本地数据库迁移与查询、本地 KV/对象存储预置、本地数据重置、本地环境变量、本地调试与验证技巧。
- `README.md` 只保留：项目说明与结构、通用命令（`dev`、`check`、`build`）、远端或生产相关操作，以及指向 `docs/` 的链接。
- 新增一类本地操作时，追加或新建对应的 `docs/*.md`，并在 README 加一条链接；不把命令散落在 README 正文里。

## 语言

- `README.md` 默认为英文。
- 简体中文版放在 `docs/readme/README.zh-CN.md`，两份互相提供语言切换链接；只改结构或命令时两边同步。
