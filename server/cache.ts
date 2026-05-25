interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

const responseCache = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

export const CACHE_TTL_MS = 10_000;

export const SESSIONS_DEFAULT_LIMIT = 20;
export const SESSIONS_MAX_LIMIT = 50;
export const ACTIVITIES_DEFAULT_LIMIT = 50;
export const ACTIVITIES_MAX_LIMIT = 200;

export function cacheKey(parts: unknown[]): string {
  return parts.map((part) => String(part ?? '')).join(':');
}

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const entry = responseCache.get(key) as CacheEntry<T> | undefined;
  if (entry && entry.expiresAt > now) return entry.value;

  const pending = inFlight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const promise = load()
    .then((value) => {
      responseCache.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

export function clearCache(): void {
  responseCache.clear();
}
