import { applyD1Migrations } from 'cloudflare:test'
import { env } from 'cloudflare:workers'
import { beforeAll } from 'vitest'

const files = import.meta.glob('../../web-service/drizzle/*.sql', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

beforeAll(async () => {
  const migrations = Object.keys(files)
    .toSorted()
    .map((path) => ({
      name: path.split('/').pop() ?? path,
      queries: files[path]
        .split('--> statement-breakpoint')
        .map((query) => query.trim())
        .filter(Boolean),
    }))

  await applyD1Migrations(env.DB, migrations)
})
