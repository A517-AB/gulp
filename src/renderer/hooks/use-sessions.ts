import { useQuery, useQueryClient } from '@tanstack/react-query'
import { sdkIpc } from '@shared/bridge'
import { api } from '@api/client'

export const sessionKeys = {
  all:  () => ['sessions'] as const,
  list: (limit = 50) => ['sessions', 'list', limit] as const,
}

export function useSessions(limit = 50) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: sessionKeys.list(limit),
    queryFn: async () => {
      if (sdkIpc) return sdkIpc.client.sessions({ limit })
      const { data, error } = await api.GET('/sessions', { params: { query: { limit } } })
      if (error) throw error
      return data.sessions
    },
  })

  return {
    sessions: query.data ?? [],
    loading:  query.isFetching,
    error:    query.error,
    refresh:  () => qc.invalidateQueries({ queryKey: sessionKeys.all() }),
  }
}
