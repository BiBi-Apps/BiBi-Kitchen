# BiBiKitchen

Web POC 骨架，基于 [Hono Cloudflare Workers + Vite](https://hono.dev/docs/getting-started/cloudflare-workers-vite) 官方模板。`apps/` 为 Git 与 npm workspace 根目录，应用位于 `web/`，任务由 Turborepo 编排。

在 `apps/` 中运行：

```sh
nvm use
npm install
npm run dev
```

访问 `http://localhost:5173`。

```sh
npm run check
npm run build
```

`check` 根据 Wrangler 配置生成 Worker 类型，并运行 TypeScript 检查。生成类型、构建产物和本地密钥不纳入 Git。

当前仅保留模板首页，尚未实现登录或数据库。开发规划位于仓库外的 `../obsidian/基础设置/开发规划/v0.0.1/开发规划.md`。
