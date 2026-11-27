# BiBiKitchen

Web POC with four workspaces, deployed as a single Cloudflare Worker:

| Workspace       | Responsibility                                                                                                                                                                                                                           |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `web-constant/` | Shared constants and contracts: app name, page/API paths, roles, phone rules, session, messages, state element id. No dependencies.                                                                                                      |
| `web-service/`  | Shared logic: Drizzle schema, D1 access, session and login rules. No HTTP.                                                                                                                                                               |
| `webpage/`      | Pages: a Hono sub-app that server-renders HTML with React 19, [Tailwind CSS v4](https://tailwindcss.com) and [shadcn/ui](https://ui.shadcn.com) (`new-york`, `neutral`), plus the client hydration entry. Reads data from `web-service`. |
| `web/`          | Wiring only: mounts the API routes and the `webpage` page app, owns the Worker entry, `wrangler.jsonc` and the Vite build.                                                                                                               |

Pages are rendered on the server and hydrated in the browser. Everything is same-origin, so the frontend only calls `/api/*`, there is no CORS, and the session cookie stays `SameSite=Lax`.

[简体中文](docs/readme/README.zh-CN.md)

## Getting started

Run from `apps/`:

```sh
nvm use
npm install
npm run dev
```

One server: `http://localhost:8787` (Vite dev + Worker, with HMR for pages).

```sh
npm run lint         # type-check + oxfmt --check + oxlint, via concurrently
npm run fix          # oxfmt write + oxlint --fix
npm run test         # run tests in every workspace
npm run build        # build client assets and the Worker into webpage/dist
```

Each workspace exposes the same script names: `lint` (aggregates `lint:*`), `lint:type-check`, `lint:formatter`, `lint:oxlint`, `fix`, `fix:formatter`, `fix:oxlint`.

Generated types, build output and local secrets are not committed. `npm install` requires `legacy-peer-deps`, pinned in `apps/.npmrc`.

Formatting is [oxfmt](https://oxc.rs) with `semi: false`, `singleQuote: true`, `printWidth: 100`, configured in `apps/.oxfmtrc.json`; generated files (`worker-configuration.d.ts`, `drizzle/meta`) are ignored.

## Testing

- `web/` — [Vitest](https://vitest.dev) with [`@cloudflare/vitest-plugin`](https://www.npmjs.com/package/@cloudflare/vitest-plugin): runs inside workerd against real D1/KV, no mocks. `test/setup.ts` applies the migrations from `web-service/drizzle`; the tests drive the HTTP API and the server-rendered pages through `SELF`.
- `webpage/` — Vitest with jsdom and Testing Library for page behaviour (form submit, error states, logout).

## Database and KV

Bindings live in `web/wrangler.jsonc`: D1 as `DB`, the single KV namespace `bibi-kitchen-kv` as `KV` (`env.KV`), plus the `ENVIRONMENT` variable. `ADMIN_PHONES` and `CHEF_PHONES` are keys in that namespace; each value is a comma-separated list of phone numbers. Migrations live in `web-service/drizzle`.

The repository contains placeholder IDs. Override either one at build time from `apps/`:

```sh
KV_NAMESPACE_ID=your_kv_id D1_DATABASE_ID=your_d1_id npm run deploy
```

`KV_NAMESPACE_ID` takes the 32-digit hexadecimal namespace ID, `D1_DATABASE_ID` the D1 database UUID. Either may be unset or blank, in which case the build keeps the value from `web/wrangler.jsonc` (`00000000000000000000000000000001` and `00000000-0000-0000-0000-000000000000`). A malformed value fails the build. The override applies to Vite builds, not to standalone Wrangler commands.

Reuse the existing KV namespace ID, or create it with `wrangler kv namespace create bibi-kitchen-kv`; create the D1 database with `wrangler d1 create`.

```sh
npm run db:generate   # generate SQL migrations from web-service schema
npm run db:migrate    # apply migrations to the remote D1 database
```

Local migrations, KV seeding, data reset and other development operations: see [docs/local-development.md](docs/local-development.md).

## Current behavior

API (JSON):

- `POST /api/login` — looks up `users.phone`; when absent, auto-creates the user from KV with the `admin` / `chef` roles. Returns the current user.
- `GET /api/me` — returns the current user or `null` (`Cache-Control: no-store`).
- `POST /api/logout` — 404 when `ENVIRONMENT` is `production`.

The session cookie is `session`, `HttpOnly`, `SameSite=Lax`, `Path=/`, 30 days; it adds `Secure` over HTTPS and omits it for local HTTP.

Pages: `/` server-renders the signed-in user (name, phone, roles) or a login entry; `/login` renders the phone form. Both hydrate in the browser.

## Documentation

- [Local development (Chinese)](docs/local-development.md)
- Roadmap: `../obsidian/基础设置/开发规划/v0.0.1/开发规划.md` (outside this repository)
