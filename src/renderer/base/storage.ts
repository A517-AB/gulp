/// <reference lib="dom" />

export interface StorageOptions {
  expiresIn?: number;
}

interface Entry<T> {
  value: T;
  expires?: number;
}

function makeStorage(store: Storage) {
  return {
    get<T>(key: string): T | null {
      const raw = store.getItem(key);
      if (!raw) return null;
      try {
        const entry = JSON.parse(raw) as Entry<T>;
        if (entry.expires !== undefined && Date.now() > entry.expires) {
          store.removeItem(key);
          return null;
        }
        return entry.value;
      } catch {
        return null;
      }
    },

    set<T>(key: string, value: T, options: StorageOptions = {}): void {
      const entry: Entry<T> = {
        value,
        ...(options.expiresIn !== undefined ? { expires: Date.now() + options.expiresIn } : {}),
      };
      store.setItem(key, JSON.stringify(entry));
    },

    remove(key: string): void {
      store.removeItem(key);
    },

    has(key: string): boolean {
      return this.get(key) !== null;
    },

    clear(): void {
      store.clear();
    },
  };
}

export const local   = makeStorage(localStorage);
export const session = makeStorage(sessionStorage);
