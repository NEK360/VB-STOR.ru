import { useCallback } from "react";
import { createStore, persistStore, readJSON, useStore } from "../lib/store";

const STORAGE_KEY = "vb_store_favorites";

function parseFavorites(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  // убираем дубли и пустые значения, сохраняя порядок
  return [...new Set(raw.map((id) => String(id)).filter(Boolean))];
}

/**
 * Единый стор избранного. Формат хранения в localStorage не менялся
 * (массив строковых id под ключом vb_store_favorites), поэтому уже сохранённое
 * избранное пользователей остаётся на месте.
 *
 * В отличие от прежней версии хука, состояние ОБЩЕЕ для всех компонентов:
 * счётчик в шапке и нижней навигации обновляется сразу.
 */
const favoritesStore = createStore<string[]>(parseFavorites(readJSON(STORAGE_KEY)));
persistStore(favoritesStore, STORAGE_KEY, parseFavorites);

// ---------------------------------------------------------------------------
// Функции для использования вне React-компонентов (например, из корзины)
// ---------------------------------------------------------------------------

export function isFavoriteId(id: string): boolean {
  return favoritesStore.get().includes(String(id));
}

/** Добавляет товар в избранное. Возвращает false, если он там уже был (дубль не создаётся). */
export function addFavorite(id: string): boolean {
  const key = String(id);
  if (!key || favoritesStore.get().includes(key)) return false;
  favoritesStore.set((prev) => [...prev, key]);
  return true;
}

export function removeFavorite(id: string): void {
  const key = String(id);
  favoritesStore.set((prev) => (prev.includes(key) ? prev.filter((f) => f !== key) : prev));
}

export function toggleFavorite(id: string): void {
  const key = String(id);
  favoritesStore.set((prev) =>
    prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
  );
}

// ---------------------------------------------------------------------------
// Хук — прежний публичный API сохранён: { favorites, toggle, isFavorite, count }
// ---------------------------------------------------------------------------

export function useFavorites() {
  const favorites = useStore(favoritesStore);

  const toggle = useCallback((id: string) => toggleFavorite(id), []);
  const add = useCallback((id: string) => addFavorite(id), []);
  const remove = useCallback((id: string) => removeFavorite(id), []);
  const isFavorite = useCallback(
    (id: string) => favorites.includes(String(id)),
    [favorites]
  );

  return { favorites, toggle, add, remove, isFavorite, count: favorites.length };
}
