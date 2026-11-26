/** 本服务只依赖这三项绑定，不耦合 Worker 的全局类型。 */
export type ServiceEnv = {
  DB: D1Database
  ADMIN_PHONES: KVNamespace
  CHEF_PHONES: KVNamespace
}
