import { http, HttpResponse } from 'msw'

export const handlers = [
  http.post('/api/sessions.list', () => {
    console.log('[msw] intercepted sessions.list')
    return HttpResponse.json({ sessions: [] })
  }),
]
