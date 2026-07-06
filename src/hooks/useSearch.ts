import { useState, useMemo } from "react";
import { products, type Product } from "../store-data/products";

export function useSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const results = useMemo<Product[]>(() => {
    if (query.trim().length < 2) return [];
    const q = query.toLowerCase().trim();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [query]);

  const open = () => setIsOpen(true);
  const close = () => { setIsOpen(false); setQuery(""); };

  return { query, setQuery, results, isOpen, open, close };
}
