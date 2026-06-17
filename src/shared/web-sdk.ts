/* eslint-disable */
import type { SdkIpc } from '../jules'
import type { Activity, ActivitySummary, SessionConfig, SessionResource, Source } from '../jules'
// not for now
const BASE = 'http://127.0.0.1:3939'
const WS   = 'ws://127.0.0.1:3939'

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init)
  if (!res.ok) throw new Error(`[sidecar] ${res.status} ${res.statusText} — ${path}`)
  return res.json() as Promise<T>
}

function post<T>(path: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method: 'POST', headers: { 'Content-Type': 'application/json' } }
  if (body !== undefined) init.body = JSON.stringify(body)
  return api<T>(path, init)
}

function wsStream(
  url: string,
  msgType: string,
  onItem: (item: Activity) => void,
  onDone?: () => void,
): () => void {
  const ws = new WebSocket(url)
  let cancelled = false

  ws.onmessage = (e) => {
    if (cancelled) return
    const msg = JSON.parse(e.data as string) as { type: string; activity?: Activity }
    if (msg.type === msgType && msg.activity) onItem(msg.activity)
    if (msg.type === 'done' || msg.type === 'error') {
      onDone?.()
      ws.close()
    }
  }
  ws.onclose = () => { if (!cancelled) onDone?.() }
  ws.onerror = () => { onDone?.(); ws.close() }

  return () => { cancelled = true; ws.close() }
}

export const webSdk: SdkIpc = {
  client: {
    sessions: async (options) => {
      const params = new URLSearchParams()
      if (options?.limit) params.set('limit', String(options.limit))
      if (options?.filter) params.set('filter', options.filter)
      const { sessions } = await api<{ sessions: SessionResource[] }>(`/sessions?${params}`)
      return sessions
    },
    streamSessions: (_onItem, _onDone) => () => {},
    sync: () => post('/sync'),
    onSyncProgress: (_cb) => () => {},
    select: async () => [],
    getSessionResource: (id) => api(`/sessions/${id}`),
    run: (config) => post('/run', config),
    with: async () => {},
    all: (configs) => post('/batch', { configs }),
  },

  session: {
    create: (config: SessionConfig) => post('/sessions', config),
    send: async (id, prompt) => { await post(`/sessions/${id}/messages`, { prompt }) },
    ask: (id, prompt) => post(`/sessions/${id}/ask`, { prompt }),
    approve: async (id) => { await post(`/sessions/${id}/approve`) },
    info: (id) => api(`/sessions/${id}`),
    result: (id) => api(`/sessions/${id}/result`),
    waitFor: async (id, state) => { await post(`/sessions/${id}/waitFor`, { state }) },
    snapshot: (id) => api(`/sessions/${id}/snapshot`),
    archive: async (id) => { await post(`/sessions/${id}/archive`) },
    unarchive: async (id) => { await post(`/sessions/${id}/unarchive`) },
    select: async (id, options) => {
      const { activities } = await post<{ activities: Activity[] }>(`/sessions/${id}/select`, options ?? {})
      return activities
    },
    applyPatch: async () => ({ success: false, error: 'not supported in web mode' }),
    stream:  (id, onItem, onDone) => wsStream(`${WS}/ws/sessions/${id}/stream`,  'activity', onItem, onDone),
    history: (id, onItem, onDone) => wsStream(`${WS}/ws/sessions/${id}/stream`,  'activity', onItem, onDone),
    updates: (id, onItem, onDone) => wsStream(`${WS}/ws/sessions/${id}/updates`, 'update',   onItem, onDone),
  },

  activities: {
    hydrate: async (id) => {
      const { activities } = await api<{ activities: Activity[] }>(`/sessions/${id}/activities`)
      return activities.length
    },
    select: async (id, options) => {
      const { activities } = await post<{ activities: Activity[] }>(`/sessions/${id}/select`, options ?? {})
      return activities
    },
    list: async (id, options) => {
      const params = new URLSearchParams()
      if (options?.pageSize) params.set('limit', String(options.pageSize))
      const { activities } = await api<{ activities: Activity[] }>(`/sessions/${id}/activities?${params}`)
      return { activities }
    },
    get: (id, activityId) => api(`/sessions/${id}/activities/${activityId}`),
    history: (id, onItem, onDone) => wsStream(`${WS}/ws/sessions/${id}/stream`,  'activity', onItem, onDone),
    updates: (id, onItem, onDone) => wsStream(`${WS}/ws/sessions/${id}/updates`, 'update',   onItem, onDone),
    stream:  (id, onItem, onDone) => wsStream(`${WS}/ws/sessions/${id}/stream`,  'activity', onItem, onDone),
  },

  sources: {
    list: async () => {
      const { sources } = await api<{ sources: Source[] }>('/sources')
      return sources
    },
    get: async ({ github }) => {
      const [owner, repo] = github.split('/')
      const source = await api<Source | null>(`/sources/${owner}/${repo}`)
      return source ?? undefined
    },
    resolve: async () => ({ github: null, baseBranch: 'main' }),
  },

  artifact: {
    save: async (_data, filepath) => filepath,
    parseUnidiff: async (patch) => {
      if (!patch) return []
      return post('/utils/parse-diff', { patch })
    },
    parseUnidiffWithContent: async (patch) => {
      if (!patch) return []
      return post('/utils/parse-diff-with-content', { patch })
    },
  },

  util: {
    toSummary: async (activity: Activity): Promise<ActivitySummary> => ({
      id: activity.id,
      type: activity.type,
      summary: '',
      createTime: (activity as { createTime?: string }).createTime ?? '',
    }),
    toSummaries: async (activities: Activity[]): Promise<ActivitySummary[]> =>
      activities.map(a => ({
        id: a.id,
        type: a.type,
        summary: '',
        createTime: (a as { createTime?: string }).createTime ?? '',
      })),
  },

  query: {
    validate: async () => ({ valid: true, errors: [], warnings: [] }),
    format: async () => '',
    schema: async (domain) => ({ domain, description: '', fields: [], examples: [] }),
    schemas: async () => ({
      sessions:   { domain: 'sessions'   as const, description: '', fields: [], examples: [] },
      activities: { domain: 'activities' as const, description: '', fields: [], examples: [] },
    }),
    typeDef: async () => '',
    markdownDocs: async () => '',
  },
}
