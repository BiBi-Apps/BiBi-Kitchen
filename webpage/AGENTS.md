# webpage 开发规范

适用于 `webpage/src/` 下的页面与组件文件。

## 文件与组件命名

- 一个文件只放一个组件：`components/`（`ui/` 除外）与 `pages/` 都遵守。
- 文件名与组件名同名，两者都用 PascalCase：`pages/LoginPage.tsx` 导出 `LoginPage`，`components/Root.tsx` 导出 `Root`。
- 测试文件与源文件同名，追加 `.test`：`pages/LoginPage.test.tsx`。
- `components/ui/` 是 shadcn CLI 生成的基础组件，保留其原有小写文件名与多导出形态，不要按上面的规则改名。

## 新增页面

- 页面组件放 `pages/`，命名同上；路径→页面映射只在 `lib/routes.tsx` 的 `PAGE_ROUTES` 注册一处，首屏 SSR 与客户端路由共用。
- 页面是 SPA 的一部分：服务端只给外壳与首屏数据，页面与路由都在浏览器；跳转用 `react-router-dom` 的 `Link`/`useNavigate`，不要用整页跳转。
- 用户数据用 `contexts/user.tsx` 的 `useUser()`；写操作走 `web/src/routes/` 的 `/api/*` 接口。
