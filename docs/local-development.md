# 本地开发操作

仅供本地调试使用；远端资源创建与生产部署不在此列，见 [README](../README.md)。

## 准备工作

```sh
cd apps
nvm use
npm install
```

`npm run dev` 只启动一个服务：

| 服务                       | 地址                    | 说明                                                                    |
| -------------------------- | ----------------------- | ----------------------------------------------------------------------- |
| `web`（Vite dev + Worker） | `http://localhost:8787` | 页面 SSR、`/api/*` 与 HMR 同源；本地 D1/KV 状态在 `web/.wrangler/state` |

四个 workspace 职责：`web-constant` 共享常量与契约、`web-service` 共用逻辑、`webpage` 页面与 SSR、`web` 接入与构建。

## 本地 D1

迁移文件在 `web-service/drizzle`，绑定配置与本地状态在 `web/`：

```sh
cd apps/web
npx wrangler d1 migrations apply DB --local
```

查看本地数据：

```sh
cd apps/web
npx wrangler d1 execute DB --local --command "select id, phone from users; select user_id, role from user_roles;"
```

Vite root 是 `webpage/`，因此 `apps/web/vite.config.ts` 用 `persistState` 把本地状态固定在 `web/.wrangler/state`，不要改成默认值，否则会读到空库。

## 本地 KV 预置号码

只用一个 namespace：`bibi-kitchen-kv`，在 `wrangler.jsonc` 中绑定为 `KV`，代码通过 `env.KV` 访问。手机号清单按逗号分隔，分别写在 Key `ADMIN_PHONES`、`CHEF_PHONES` 中；号码只在该手机号首次登录时生效，用于自动注册。

```sh
cd apps/web
npx wrangler kv key put ADMIN_PHONES '13800000001,13800000003' --binding KV --local   # 管理员 → user_roles.role = admin
npx wrangler kv key put CHEF_PHONES '13800000002,13800000003' --binding KV --local    # 厨师   → user_roles.role = chef
```

查看与删除：

```sh
npx wrangler kv key list --binding KV --local
npx wrangler kv key delete CHEF_PHONES --binding KV --local
```

## 测试

```sh
cd apps
npm test                                         # 四个 workspace 全跑
npm run test:watch --workspace @bibikitchen/web  # 只跑集成测试，监听改动
npm run test:watch --workspace @bibikitchen/webpage
```

- 集成测试在 workerd 中运行，D1 用真实本地库，迁移由 `web/test/setup.ts` 从 `web-service/drizzle` 自动应用。
- 插件**不提供跨用例存储隔离**，所以每个用例前会显式清空 `sessions`、`user_roles`、`users`。新增依赖这些表的用例时沿用该约定。
- KV 预置号码在 `web/src/routes/auth.test.ts` 的 `beforeEach` 中写入，不依赖本地 `.wrangler` 状态。
- 页面测试用 jsdom + Testing Library，`fetch` 用 `vi.stubGlobal` 模拟，`window.location.assign` 用桩函数；不需要启后端。
- KV/D1 ID 构建注入的检查不在 Vitest 内：改过 `web/vite.config.ts` 的注入逻辑后跑 `node web/test/kv-build-id.mjs`（内部调 `npm run build`，留在 `web/test/`）。

文件位置约定：

| 类型                 | 位置                                            |
| -------------------- | ----------------------------------------------- |
| 测试文件             | 与源文件同目录，命名 `*.test.ts` / `*.test.tsx` |
| setup 与测试类型声明 | 各 workspace 的 `test/` 目录                    |

## 代码检查与格式化

四个 workspace 共用同一套工具与同名脚本，配置在 `apps/` 根目录，工作区运行时自动向上查找：

| 脚本              | 作用                                                   |
| ----------------- | ------------------------------------------------------ |
| `lint`            | `concurrently -m 1 --timings npm:lint:*`，汇总下面三项 |
| `lint:type-check` | `tsc --noEmit`；`web` 会先跑 `cf-typegen`              |
| `lint:formatter`  | `oxfmt --check`                                        |
| `lint:oxlint`     | `oxlint`                                               |
| `fix`             | 汇总下面两项                                           |
| `fix:formatter`   | `oxfmt`，直接改写                                      |
| `fix:oxlint`      | `oxlint --fix`                                         |

- `correctness` 为 error，`suspicious` 为 warning；生成文件（`worker-configuration.d.ts`、`drizzle/meta`）已排除。
- 工具依赖（`typescript`、`oxfmt`、`oxlint`、`concurrently`）只在 `apps/package.json` 声明一份，各工作区不再重复。
- 格式化规则：无分号、单引号、行宽 100。
- 单工作区运行时：`npm run lint --workspace @bibikitchen/webpage`（其余同理）。

## 共享常量

共享值集中在 `web-constant/src/index.ts`，被引用两处以上才移入，避免过度抽象：

| 常量                                      | 用途                               |
| ----------------------------------------- | ---------------------------------- |
| `APP_NAME`                                | 页面标题与卡片标题                 |
| `PAGE_PATHS` / `API_PATHS`                | 页面路由、站内链接与 `/api/*` 请求 |
| `USER_ROLES` / `UserRole` / `ROLE_LABELS` | 数据库枚举、会话返回体与界面文案   |
| `PHONE`                                   | 服务端格式校验与输入框 `maxlength` |
| `SESSION`                                 | Cookie 名与 30 天有效期            |
| `MESSAGES`                                | 服务端与浏览器共用提示文案         |
| `STATE_ELEMENT_ID`                        | SSR 初始状态的元素 id              |

## 添加 shadcn 组件

配置在 `webpage/components.json`（`new-york`、`neutral`、CSS 变量、`@/` 别名）。新增组件用 CLI 写入 `webpage/src/components/ui/`：

```sh
cd apps/webpage
npx shadcn@latest add dialog
```

组件可直接使用 Radix 交互能力：页面已是「服务端渲染 + 客户端水合」，无需另搭水合桥。

## 跨站校验

API 的写接口会校验 `Origin` 是否与请求主机一致，防跨站伪造；比对顺序为 `X-Forwarded-Host` → `Host` → 请求 URL 主机，因此套代理也不会误判。

不带 `Origin` 的请求（如 `curl`）会通过校验，所以测跨站限制时 **必须手动带 `Origin`**：

```sh
curl -i -X POST http://localhost:8787/api/login \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://evil.example' \
  -d '{"phone":"13800000001"}'   # 预期 403
```

## 验证生产形态

构建会同时产出客户端资源与 Worker：

```sh
cd apps
npm run build   # 输出到 webpage/dist/client 与 webpage/dist/bibi_kitchen
cd web
npx wrangler deploy --dry-run   # 检查将上传的内容与绑定
```

## 重置本地数据

```sh
cd apps/web
rm -rf .wrangler
npx wrangler d1 migrations apply DB --local
```

清空后已签发的会话一并失效；浏览器端需清掉 `session` Cookie 或等待重新登录。
