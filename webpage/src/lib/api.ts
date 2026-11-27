import { API_CODES, MESSAGES } from '@bibikitchen/web-constant'
import type { ApiResponse } from '@bibikitchen/web-constant'

/** 客户端拿到的接口结果：`ok` 由 code 与 HTTP 状态共同决定，`message` 可直接展示。 */
export type ApiResult<T> = {
  ok: boolean
  message: string
  data: T | null
}

/** 解析统一返回体；响应不是 JSON（如网关错误页）时退化成通用失败。 */
export async function readApiResponse<T>(res: Response): Promise<ApiResult<T>> {
  try {
    const body = (await res.json()) as ApiResponse<T>
    return {
      ok: res.ok && body.code === API_CODES.OK,
      message: body.message || MESSAGES.LOGIN_FAILED_UNKNOWN,
      data: body.data ?? null,
    }
  } catch {
    return { ok: false, message: MESSAGES.LOGIN_FAILED_UNKNOWN, data: null }
  }
}
