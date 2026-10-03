// A small keyed store saved in this browser's localStorage, shared by the custom
// headshot and helmet painters. Components subscribe with `use(key)`.

import { useSyncExternalStore } from "react";

export function createBrowserStore<T>(storageKey: string) {
  type Store = Record<string, T>;
  let cache: Store | null = null;
  const listeners = new Set<() => void>();

  function load(): Store {
    if (cache) return cache;
    try {
      const raw = localStorage.getItem(storageKey);
      cache = raw ? (JSON.parse(raw) as Store) : {};
    } catch {
      cache = {};
    }
    return cache;
  }

  function save(next: Store) {
    cache = next;
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* storage unavailable or full — keep it in memory for this session */
    }
    listeners.forEach((l) => l());
  }

  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  };

  return {
    get: (key: string): T | null => load()[key] ?? null,
    set: (key: string, value: T) => save({ ...load(), [key]: value }),
    clear: (key: string) => {
      const { [key]: _, ...rest } = load();
      save(rest);
    },
    /** The value for `key`, re-rendering when it changes. */
    use: (key: string): T | null =>
      useSyncExternalStore(
        subscribe,
        () => load()[key] ?? null,
        () => null,
      ),
    /** The whole store, re-rendering when anything changes. */
    useAll: (): Store => useSyncExternalStore(subscribe, load, () => EMPTY as Store),
  };
}

const EMPTY = {};
