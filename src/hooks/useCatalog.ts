import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadProducts, refreshProducts, type Product } from "../lib/api";

/**
 * Каталог для корзины и оформления заказа.
 *  - fresh: true — гарантированно актуальные цены и остатки (см. refreshProducts);
 *  - catalog === null, пока данные не получены (или каталог недоступен) —
 *    в этом случае ничего не помечаем как «закончилось», показываем сохранённое.
 */
export function useCatalog(options: { fresh?: boolean } = {}) {
  const fresh = options.fresh ?? false;
  const [products, setProducts] = useState<Product[] | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(
    async (force = false) => {
      setLoading(true);
      try {
        const list = fresh || force ? await refreshProducts({ force }) : await loadProducts();
        if (mounted.current) setProducts(list);
        return list;
      } catch {
        if (mounted.current) setProducts([]);
        return [];
      } finally {
        if (mounted.current) setLoading(false);
      }
    },
    [fresh]
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const catalog = useMemo<ReadonlyMap<string, Product> | null>(() => {
    if (!products || products.length === 0) return null;
    return new Map(products.map((p) => [String(p.id), p]));
  }, [products]);

  /** Принудительно перезапрашивает каталог у сервера и возвращает свежий список. */
  const reload = useCallback(() => load(true), [load]);

  return { products, catalog, loading, reload };
}
