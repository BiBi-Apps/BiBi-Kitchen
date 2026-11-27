# BiBiKitchen

[English](../../README.md)

Web POC 分为四个 workspace，以单个 Cloudflare Worker 部署：

| Workspace       | 职责                                                                                                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `web-constant/` | 共享常量与契约：项目名、页面路径、角色、手机号规则、会话、提示文案、KV Key。无任何依赖。产物 `dist/`（实现与 `.d.ts` 声明）。                                                                                                    |
| `web-service/`  | 共用逻辑：Drizzle schema、D1 数据访问、会话与登录规则。无 HTTP。产物 `dist/`（实现与声明）。                                                                                                                 |
| `webpage/`      | 页面：Hono 子应用，React 19 SSR，样式用 [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)（`new-york`、`neutral`），含登录/退出表单路由。产物 `dist/client`、`dist/server`。 |
| `web/`          | 仅接入：挂载 `webpage` 应用，负责 Worker 入口、`wrangler.jsonc` 与 Worker 构建。产物 `dist/<worker>`。                                                                                             |

每个 workspace 各自构建，下游只消费产物：`web` 不构建页面，`webpage` 不构建 Worker。

服务端不渲染任何页面结构：只发外壳与当前用户的 JSON，路由由 `react-router-dom` 在浏览器渲染。除路由跳转外的请求都走 `/api/*`（JSON，`fetch` 调用）。全站同域，无需 CORS，会话 Cookie 保持 `SameSite=Lax`。

## 快速开始

在 `apps/` 中运行：

```sh
nvm use
npm install
npm run dev
```

仅一个服务：`http://localhost:8787`（Vite dev + Worker）。dev 读取的是已构建的 `webpage/dist`，改页面后需重新构建：

```sh
npm run build --workspace @bibikitchen/webpage
```

页面没有 HMR：外壳来自已构建的 `webpage/dist`，改完要重新构建再刷新。

```sh
npm run lint         # 类型检查 + oxfmt --check + oxlint，由 concurrently 顺序执行
npm run fix          # oxfmt 直接改写 + oxlint --fix
npm run test         # 所有 workspace 都跑测试
npm run build        # 按依赖顺序构建全部 workspace
```

各 workspace 都有 `build`，其余脚本名一致：`lint`（汇总 `lint:*`）、`lint:type-check`、`lint:formatter`、`lint:oxlint`、`fix`、`fix:formatter`、`fix:oxlint`。`test` 与 `lint` 会先构建上游包（turbo `dependsOn: ["^build"]`），因为类型检查读的是各包 `dist` 里的声明。

生成类型、构建产物与本地密钥不纳入 Git。`npm install` 依赖 `legacy-peer-deps`，已固化在 `apps/.npmrc`。

格式化用 [oxfmt](https://oxc.rs)，规则为 `semi: false`、`singleQuote: true`、`printWidth: 100`，配置在 `apps/.oxfmtrc.json`；生成文件（`worker-configuration.d.ts`、`drizzle/meta`）已忽略。

## 测试

- `web/` — [Vitest](https://vitest.dev) + [`@cloudflare/vitest-plugin`](https://www.npmjs.com/package/@cloudflare/vitest-plugin)：在 workerd 内运行，使用真实 D1/KV，不手写 mock。`test/setup.ts` 自动应用 `web-service/drizzle` 中的迁移，测试通过 `SELF` 验证 HTTP API 与 SSR 页面。
- `webpage/` — Vitest 直接断言 `renderPage` 产出的 HTML：表单 `action`、渲染出的用户信息、错误回显，以及不含任何客户端脚本。不用 jsdom 与 Testing Library。

## 数据库与 KV

绑定在 `web/wrangler.jsonc`：D1 为 `DB`，唯一的 KV namespace `bibi-kitchen-kv` 绑定为 `KV`（通过 `env.KV` 访问），另有 `ENVIRONMENT` 变量。`ADMIN_PHONES` 与 `CHEF_PHONES` 是其中两个 Key，值为逗号分隔的手机号清单。迁移放在 `web-service/drizzle`。

仓库内只保留占位 ID。在 `apps/` 构建前可用环境变量覆盖两项：

```sh
KV_NAMESPACE_ID=your_kv_id D1_DATABASE_ID=your_d1_id ENVIRONMENT=production npm run deploy
```

`KV_NAMESPACE_ID` 为 32 位十六进制 namespace ID，`D1_DATABASE_ID` 为 D1 数据库 UUID。两者均可未设置或留空，此时构建沿用 `web/wrangler.jsonc` 中的值（`00000000000000000000000000000001`、`00000000-0000-0000-0000-000000000000`）；格式不对则构建直接报错。此覆盖仅对 Vite 构建生效，单独执行 Wrangler 命令时不生效。

`ENVIRONMENT` 同样支持构建时覆盖（`development` 或 `production`），未设置或留空时沿用配置默认值 `development`。

Cloudflare Workers Builds 的 Root directory 设为 `apps/web`，Build command 为 `npm run build`，Deploy command 为 `npm run deploy`。三个变量均需配置在 **Build variables and secrets** 中，不能仅配置 Worker 运行时变量。部署必须读取生成配置，才能保留覆盖值。

若 KV namespace 已存在，直接用其 ID；否则用 `wrangler kv namespace create bibi-kitchen-kv` 创建。D1 数据库用 `wrangler d1 create` 创建。

```sh
npm run db:generate   # 从 web-service 的 schema 生成 SQL 迁移
npm run db:migrate    # 应用到远端 D1
```

本地迁移、KV 预置号码、数据重置等开发操作，见 [docs/local-development.md](../local-development.md)。

## 当前行为

应用是 SPA。服务端只产出 HTML 外壳：`<head>`、空的 `#root`、以及以 JSON 注入的首屏数据；页面、路由与交互全在浏览器执行。除路由跳转外的请求都走 `/api/*`，返回 JSON。

页面（均在浏览器渲染）：

- `/` — 已登录用户（姓名、手机号、角色），未登录时显示登录入口。
- `/login` — 手机号表单；失败时展示接口返回的提示。
- `/logout` — 提示已退出登录，并提供返回登录页的入口。

接口统一返回体，`code` 与 HTTP 状态码一致：

```json
{ "code": 200, "message": "操作成功", "data": { "user": { "phone": "13800000001" } } }
```

- `POST /api/login` — 先查 `users.phone`；未命中时按 KV 自动注册并写入 `admin` / `chef` 角色。种下会话 Cookie，`data` 为 `{ user }`；失败时 `data` 为 `null`，状态 `400`（手机号非法）或 `401`（未登记）。
- `POST /api/logout` — 删除会话，`data` 为 `null`。
- `GET /api/me` — `data` 为 `{ user }` 或 `{ user: null }`（`Cache-Control: no-store`）。

写接口会拒绝跨站 `Origin`，返回 `403`。

会话 Cookie 为 `session`，`HttpOnly`、`SameSite=Lax`、`Path=/`，有效期 30 天；HTTPS 下带 `Secure`，本地 HTTP 不带。

退出登录始终可用，不再用 `ENVIRONMENT` 隐藏。

## 文档

- [本地开发操作](../local-development.md)
- 开发规划：`../obsidian/基础设置/开发规划/v0.0.1/开发规划.md`（位于本仓库之外）
