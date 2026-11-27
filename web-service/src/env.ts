/** 本服务只依赖这两项绑定，不耦合 Worker 的全局类型。 */
export type ServiceEnv = {
  DB: D1Database
  KV: KVNamespace
}
