import { useContext } from 'react'
import { type AppFlags, FlagsContext } from '@/contexts/flags'

/** 缺失 Provider 时直接报错，而不是静默当成全 false。 */
export function useFlags(): AppFlags {
  const flags = useContext(FlagsContext)
  if (!flags) throw new Error('缺少 FlagsProvider')
  return flags
}
