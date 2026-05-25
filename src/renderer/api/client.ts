import createClient from 'openapi-fetch'
import type { paths } from './jules-api'

export const SERVER_URL = (import.meta.env['VITE_JULES_SERVER_URL'] as string | undefined) ?? 'http://127.0.0.1:3939'

export type JulesApi = ReturnType<typeof createClient<paths>>

export const api: JulesApi = createClient<paths>({ baseUrl: SERVER_URL })
