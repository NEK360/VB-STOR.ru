import { useSyncExternalStore } from "react";

/**
 * Минимальный глобальный стор (без внешних зависимостей).
 *
 * Зачем: раньше каждый вызов useFavorites() держал СВОЁ состояние, из-за чего
 * счётчики в Header / MobileNav не обновлялись в той же вкладке. Корзина,
 * избранное и сессия пользователя теперь живут в общих сторах, и все
 * компоненты видят изменения мгновенно.
 */
export interface Store<T> {
  get: () => T;
  set: (next: T | ((prev: T) => T)) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createStore<T>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<() => void>();

  return {
    get: () => state,
    set: (next) => {
      const value =
        typeof next === "function" ? (next as (prev: T) => T)(state) : next;
      if (Object.is(value, state)) return;
      state = value;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

/**
 * Подписка на часть состояния. Селектор должен возвращать примитив
 * (число, строку, boolean) либо стабильную ссылку — иначе будут лишние рендеры.
 */
export function useStoreSelector<T, S>(store: Store<T>, selector: (state: T) => S): S {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.get()),
    () => selector(store.get())
  );
}

// ---------------------------------------------------------------------------
// Безопасная работа с localStorage / sessionStorage (приватный режим, квота)
// ---------------------------------------------------------------------------

function getStorage(kind: "local" | "session"): Storage | null {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readJSON(key: string, kind: "local" | "session" = "local"): unknown {
  try {
    const raw = getStorage(kind)?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeJSON(
  key: string,
  value: unknown,
  kind: "local" | "session" = "local"
): void {
  try {
    const storage = getStorage(kind);
    if (!storage) return;
    const serialized = JSON.stringify(value);
    if (storage.getItem(key) !== serialized) {
      storage.setItem(key, serialized);
    }
  } catch {
    // квота / приватный режим — состояние остаётся в памяти до перезагрузки
  }
}

export function removeKey(key: string, kind: "local" | "session" = "local"): void {
  try {
    getStorage(kind)?.removeItem(key);
  } catch {
    // ignore
  }
}

/**
 * Привязывает стор к хранилищу браузера:
 *  - каждое изменение сохраняется;
 *  - изменения из других вкладок (событие `storage`) подтягиваются обратно.
 */
export function persistStore<T>(
  store: Store<T>,
  key: string,
  parse: (raw: unknown) => T,
  kind: "local" | "session" = "local"
): void {
  store.subscribe(() => {
    const value = store.get();
    if (value === null || value === undefined) removeKey(key, kind);
    else writeJSON(key, value, kind);
  });

  if (kind === "local" && typeof window !== "undefined") {
    window.addEventListener("storage", (event) => {
      if (event.key !== key) return;
      try {
        store.set(parse(event.newValue ? JSON.parse(event.newValue) : null));
      } catch {
        store.set(parse(null));
      }
    });
  }
}
