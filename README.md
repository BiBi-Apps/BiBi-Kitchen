# BiBiKitchen

Web POC with four workspaces, deployed as a single Cloudflare Worker:

| Workspace       | Responsibility                                                                                                                                                                                                                                       |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `web-constant/` | Shared constants and contracts: app name, page paths, roles, phone rules, session, messages, KV keys. No dependencies. Outputs `dist/` (implementation plus `.d.ts`).                                                                                |
| `web-service/`  | Shared logic: Drizzle schema, D1 access, session and login rules. No HTTP. Outputs `dist/` via `tsc`.                                                                                                                                                |
| `webpage/`      | Pages: a Hono sub-app that server-renders HTML with React 19, [Tailwind CSS v4](https://tailwindcss.com) and [shadcn/ui](https://ui.shadcn.com) (`new-york`, `neutral`), plus the login/logout form routes. Outputs `dist/client` and `dist/server`. |
| `web/`          | Wiring only: mounts the `webpage` app, owns the Worker entry, `wrangler.jsonc` and the Worker build. Outputs `dist/<worker>`.                                                                                                                        |

Each workspace builds itself and downstream workspaces consume its output only: `web` never builds pages, and `webpage` never builds the Worker.

The server never renders page markup: it ships the shell plus the current user as JSON, and `react-router-dom` renders every route in the browser. Anything other than a route change goes through `/api/*` as JSON (`fetch`). Everything is same-origin, so the session cookie stays `SameSite=Lax` and there is no CORS.

[简体中文](docs/readme/README.zh-CN.md)

## Getting started

Run from `apps/`:

```sh
nvm use
npm install
npm run dev
```

One server: `http://localhost:8787` (Vite dev + Worker). The dev server serves the prebuilt `webpage/dist`, so rebuild pages after changing them:

```sh
npm run build --workspace @bibikitchen/webpage
```

There is no page HMR: the shell is served from the built `webpage/dist`, so rebuild and refresh to see page changes.

```sh
npm run lint         # type-check + oxfmt --check + oxlint, via concurrently
npm run fix          # oxfmt write + oxlint --fix
npm run test         # run tests in every workspace
npm run build        # build every workspace in dependency order
```

Each workspace exposes `build` plus the same lint script names: `lint` (aggregates `lint:*`), `lint:type-check`, `lint:formatter`, `lint:oxlint`, `fix`, `fix:formatter`, `fix:oxlint`. `test` and `lint` build upstream packages first (turbo `dependsOn: ["^build"]`), because type-checking reads the declarations in each `dist`.

Generated types, build output and local secrets are not committed. `npm install` requires `legacy-peer-deps`, pinned in `apps/.npmrc`.

Formatting is [oxfmt](https://oxc.rs) with `semi: false`, `singleQuote: true`, `printWidth: 100`, configured in `apps/.oxfmtrc.json`; generated files (`worker-configuration.d.ts`, `drizzle/meta`) are ignored.

## Testing

- `web/` — [Vitest](https://vitest.dev) with [`@cloudflare/vitest-plugin`](https://www.npmjs.com/package/@cloudflare/vitest-plugin): runs inside workerd against real D1/KV, no mocks. `test/setup.ts` applies the migrations from `web-service/drizzle`; the tests drive the HTTP API and the server-rendered pages through `SELF`.
- `webpage/` — Vitest asserting the HTML produced by `renderPage`: form actions, rendered user data, error echo, and the absence of client scripts. No jsdom, no Testing Library.

## Database and KV

Bindings live in `web/wrangler.jsonc`: D1 as `DB`, the single KV namespace `bibi-kitchen-kv` as `KV` (`env.KV`), plus the `ENVIRONMENT` variable. `ADMIN_PHONES` and `CHEF_PHONES` are keys in that namespace; each value is a comma-separated list of phone numbers. Migrations live in `web-service/drizzle`.

The repository contains placeholder IDs. Override either one at build time from `apps/`:

```sh
KV_NAMESPACE_ID=your_kv_id D1_DATABASE_ID=your_d1_id ENVIRONMENT=production npm run deploy
```

`KV_NAMESPACE_ID` takes the 32-digit hexadecimal namespace ID, `D1_DATABASE_ID` the D1 database UUID. Either may be unset or blank, in which case the build keeps the value from `web/wrangler.jsonc` (`00000000000000000000000000000001` and `00000000-0000-0000-0000-000000000000`). A malformed value fails the build. The override applies to Vite builds, not to standalone Wrangler commands.

`ENVIRONMENT` also supports a build-time override (`development` or `production`); unset or blank keeps the configured default `development`.

For Cloudflare Workers Builds, set the root directory to `apps/web`, build command to `npm run build`, and deploy command to `npm run deploy`. Set all three variables under **Build variables and secrets**, not only Worker runtime variables. Deployment must use the generated config to retain these overrides.

Reuse the existing KV namespace ID, or create it with `wrangler kv namespace create bibi-kitchen-kv`; create the D1 database with `wrangler d1 create`.

```sh
npm run db:generate   # generate SQL migrations from web-service schema
npm run db:migrate    # apply migrations to the remote D1 database
```

Local migrations, KV seeding, data reset and other development operations: see [docs/local-development.md](docs/local-development.md).

## Current behavior

The app is a SPA. The server renders only the HTML shell: `<head>`, an empty `#root`, and the initial data as JSON. Pages, routing and interactions all run in the browser, and everything other than route changes goes through `/api/*` as JSON.

Pages (all rendered in the browser):

- `/` — the signed-in user (name, phone, roles) or a login entry.
- `/login` — the phone form; failures show the message returned by the API.
- `/logout` — confirms the sign-out and links back to the login page.

API — every endpoint answers with the same envelope, `code` mirroring the HTTP status:

```json
{ "code": 200, "message": "操作成功", "data": { "user": { "phone": "13800000001" } } }
```

- `POST /api/login` — looks up `users.phone`; when absent, auto-creates the user from KV with the `admin` / `chef` roles. Sets the session cookie, `data` is `{ user }`; failures return `data: null` with `400` (bad phone) or `401` (unregistered).
- `POST /api/logout` — deletes the session, `data: null`.
- `GET /api/me` — `data` is `{ user }` or `{ user: null }` (`Cache-Control: no-store`).

Writes reject cross-site `Origin` with `403`.

The session cookie is `session`, `HttpOnly`, `SameSite=Lax`, `Path=/`, 30 days; it adds `Secure` over HTTPS and omits it for local HTTP.

Logout is always available; `ENVIRONMENT` is no longer used to hide it.

## Documentation

- [Local development (Chinese)](docs/local-development.md)
- Roadmap: `../obsidian/基础设置/开发规划/v0.0.1/开发规划.md` (outside this repository)
