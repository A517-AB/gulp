const BASE = 'https://jules.googleapis.com/v1alpha'
const API_KEY = import.meta.env['JULES_API_KEY'] as string | undefined

async function req<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${BASE}${path}`
    const headers = new Headers(init?.headers)
    if (API_KEY) headers.set('X-Goog-Api-Key', API_KEY)
    const res = await fetch(url, {...init, headers})
    if (!res.ok) throw new Error(`Jules ${res.status}: ${path}`)
    return res.json() as Promise<T>
}

export const julesHttp = {
    get: <T>(path: string) => req<T>(path),
    post: <T>(path: string, body: unknown) =>
        req<T>(path, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)}),
}
