import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const cwd = new URL('../../', import.meta.url)
const output = new URL('../../web/dist/bibi_kitchen/wrangler.json', import.meta.url)

const DEFAULT_KV_ID = '00000000000000000000000000000001'
const DEFAULT_D1_ID = '00000000-0000-0000-0000-000000000000'
const KV_ID = '1234567890abcdef1234567890abcdef'
const D1_ID = '11111111-2222-3333-4444-555555555555'
const ASSETS = '../../../webpage/dist/client'

const build = (env) =>
  execFileSync('npm', ['run', 'build'], {
    cwd,
    env: { ...process.env, KV_NAMESPACE_ID: '', D1_DATABASE_ID: '', ENVIRONMENT: '', ...env },
    stdio: 'pipe',
    timeout: 60_000,
  })

/** 构建后从产物配置里读出绑定，顺带确认绑定没被重复写入。 */
function resolveBindings(env) {
  build(env)
  const config = JSON.parse(readFileSync(output, 'utf8'))
  assert.equal(config.name, 'bibi-kitchen')
  return {
    KV: config.kv_namespaces[0].id,
    DB: config.d1_databases[0].database_id,
    ENVIRONMENT: config.vars.ENVIRONMENT,
    // 静态资源由 webpage 构建，web 只把目录写回产物配置
    assets: config.assets.directory,
    kvCount: config.kv_namespaces.length,
    d1Count: config.d1_databases.length,
  }
}

const rejects = (env, message) =>
  assert.throws(
    () => build(env),
    (error) => error.stdout.toString().includes(message),
  )

rejects({ KV_NAMESPACE_ID: 'invalid' }, 'KV_NAMESPACE_ID 必须为 32 位十六进制 ID')
rejects({ D1_DATABASE_ID: 'invalid' }, 'D1_DATABASE_ID 必须为 UUID')
rejects({ ENVIRONMENT: 'invalid' }, 'ENVIRONMENT 只能为 development 或 production')

assert.deepEqual(
  resolveBindings({ KV_NAMESPACE_ID: KV_ID, D1_DATABASE_ID: D1_ID, ENVIRONMENT: 'production' }),
  { KV: KV_ID, DB: D1_ID, ENVIRONMENT: 'production', assets: ASSETS, kvCount: 1, d1Count: 1 },
)

const fallback = {
  KV: DEFAULT_KV_ID,
  DB: DEFAULT_D1_ID,
  ENVIRONMENT: 'development',
  assets: ASSETS,
  kvCount: 1,
  d1Count: 1,
}
assert.deepEqual(
  resolveBindings({ KV_NAMESPACE_ID: ' ', D1_DATABASE_ID: '', ENVIRONMENT: ' ' }),
  fallback,
)
assert.deepEqual(resolveBindings({}), fallback)

console.log('KV/D1/ENVIRONMENT：覆盖、空白、默认值与非法值验证通过')
