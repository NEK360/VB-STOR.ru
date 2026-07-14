import { useState, useMemo, useEffect } from "react";
import { loadProducts, type Product } from "../lib/api";

export function useSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let isActive = true;

    async function load() {
      const data = await loadProducts();

      if (!isActive) return;

      setProducts(data);
    }

    void load();

    return () => {
      isActive = false;
    };
  }, []);

  const results = useMemo(() => {
    if (query.trim().length < 2) return [];

    const q = query.toLowerCase();

    return products.filter((p: Product) => {
      const searchable = [
        p.name,
        p.brand,
        p.category,
        p.article,
        p.description,
        ...p.tags,
      ].filter(Boolean).join(" ").toLowerCase();

      return searchable.includes(q);
    });
  }, [query, products]);

  return {
    query,
    setQuery,
    results,
    isOpen,
    open: () => setIsOpen(true),
    close: () => {
      setIsOpen(false);
      setQuery("");
    },
  };
}