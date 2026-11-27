# BiBiKitchen

[English](../../README.md)

Web POC 分为四个 workspace，以单个 Cloudflare Worker 部署：

| Workspace       | 职责                                                                                                                                                                                                |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `web-constant/` | 共享常量与契约：项目名、页面/API 路径、角色、手机号规则、会话、提示文案、初始状态元素 id。无任何依赖。                                                                                              |
| `web-service/`  | 共用逻辑：Drizzle schema、D1 数据访问、会话与登录规则。无 HTTP。                                                                                                                                    |
| `webpage/`      | 页面：Hono 子应用，React 19 SSR，样式用 [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)（`new-york`、`neutral`），并包含客户端水合入口。数据由 `web-service` 获取。 |
| `web/`          | 仅接入：挂载 API 路由与 `webpage` 页面应用，负责 Worker 入口、`wrangler.jsonc` 与 Vite 统一构建。                                                                                                   |

页面在服务端渲染，浏览器再水合。全站同域：前端只请求 `/api/*`，无需 CORS，会话 Cookie 保持 `SameSite=Lax`。

## 快速开始

在 `apps/` 中运行：

```sh
nvm use
npm install
npm run dev
```

仅一个服务：`http://localhost:8787`（Vite dev + Worker，页面支持 HMR）。

```sh
npm run lint         # 类型检查 + oxfmt --check + oxlint，由 concurrently 顺序执行
npm run fix          # oxfmt 直接改写 + oxlint --fix
npm run test         # 所有 workspace 都跑测试
npm run build        # 将客户端资源与 Worker 构建到 webpage/dist
```

各 workspace 脚本名一致：`lint`（汇总 `lint:*`）、`lint:type-check`、`lint:formatter`、`lint:oxlint`、`fix`、`fix:formatter`、`fix:oxlint`。

生成类型、构建产物与本地密钥不纳入 Git。`npm install` 依赖 `legacy-peer-deps`，已固化在 `apps/.npmrc`。

格式化用 [oxfmt](https://oxc.rs)，规则为 `semi: false`、`singleQuote: true`、`printWidth: 100`，配置在 `apps/.oxfmtrc.json`；生成文件（`worker-configuration.d.ts`、`drizzle/meta`）已忽略。

## 测试

- `web/` — [Vitest](https://vitest.dev) + [`@cloudflare/vitest-plugin`](https://www.npmjs.com/package/@cloudflare/vitest-plugin)：在 workerd 内运行，使用真实 D1/KV，不手写 mock。`test/setup.ts` 自动应用 `web-service/drizzle` 中的迁移，测试通过 `SELF` 验证 HTTP API 与 SSR 页面。
- `webpage/` — Vitest + jsdom + Testing Library，覆盖页面行为（表单提交、错误态、退出）。

## 数据库与 KV

绑定在 `web/wrangler.jsonc`：D1 为 `DB`，唯一的 KV namespace `bibi-kitchen-kv` 绑定为 `KV`（通过 `env.KV` 访问），另有 `ENVIRONMENT` 变量。`ADMIN_PHONES` 与 `CHEF_PHONES` 是其中两个 Key，值为逗号分隔的手机号清单。迁移放在 `web-service/drizzle`。

仓库内只保留占位 ID。在 `apps/` 构建前可用环境变量覆盖两项：

```sh
KV_NAMESPACE_ID=your_kv_id D1_DATABASE_ID=your_d1_id npm run deploy
```

`KV_NAMESPACE_ID` 为 32 位十六进制 namespace ID，`D1_DATABASE_ID` 为 D1 数据库 UUID。两者均可未设置或留空，此时构建沿用 `web/wrangler.jsonc` 中的值（`00000000000000000000000000000001`、`00000000-0000-0000-0000-000000000000`）；格式不对则构建直接报错。此覆盖仅对 Vite 构建生效，单独执行 Wrangler 命令时不生效。

若 KV namespace 已存在，直接用其 ID；否则用 `wrangler kv namespace create bibi-kitchen-kv` 创建。D1 数据库用 `wrangler d1 create` 创建。

```sh
npm run db:generate   # 从 web-service 的 schema 生成 SQL 迁移
npm run db:migrate    # 应用到远端 D1
```

本地迁移、KV 预置号码、数据重置等开发操作，见 [docs/local-development.md](../local-development.md)。

## 当前行为

API（JSON）：

- `POST /api/login` — 先查 `users.phone`；未命中时按 KV 自动注册并写入 `admin` / `chef` 角色，返回当前用户。
- `GET /api/me` — 返回当前用户或 `null`（`Cache-Control: no-store`）。
- `POST /api/logout` — `ENVIRONMENT` 为 `production` 时返回 404。

会话 Cookie 为 `session`，`HttpOnly`、`SameSite=Lax`、`Path=/`，有效期 30 天；HTTPS 下带 `Secure`，本地 HTTP 不带。

页面：`/` 服务端直接渲染姓名、手机号与角色，未登录时显示登录入口；`/login` 渲染手机号表单。浏览器对两页进行水合。

## 文档

- [本地开发操作](../local-development.md)
- 开发规划：`../obsidian/基础设置/开发规划/v0.0.1/开发规划.md`（位于本仓库之外）
