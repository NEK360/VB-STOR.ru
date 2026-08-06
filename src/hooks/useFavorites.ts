import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "vb_store_favorites";

function readStoredFavorites(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.map((id) => String(id)) : [];
  } catch {
    return [];
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(() => readStoredFavorites());

  // keep in sync with localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      // ignore quota / privacy errors
    }
  }, [favorites]);

  // keep in sync across tabs / after reload
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setFavorites(readStoredFavorites());
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const toggle = useCallback((id: string) => {
    const key = String(id);
    setFavorites((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
    );
  }, []);

  const isFavorite = useCallback((id: string) => favorites.includes(String(id)), [favorites]);

  const count = favorites.length;

  return { favorites, toggle, isFavorite, count };
}
