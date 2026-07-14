import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ArrowRight } from "lucide-react";
import { formatPrice } from "../../lib/utils";

interface SearchModalProps {
  search: {
    query: string;
    setQuery: (q: string) => void;
    results: import("../../lib/api").Product[];
    isOpen: boolean;
    open: () => void;
    close: () => void;
  };
}

export default function SearchModal({ search }: SearchModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (search.isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [search.isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") search.close();
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        search.isOpen ? search.close() : search.open();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [search]);

  return (
    <AnimatePresence>
      {search.isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4"
          onClick={search.close}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />

          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative w-full max-w-xl glass rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/8">
              <Search size={18} className="text-white/40 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={search.query}
                onChange={(e) => search.setQuery(e.target.value)}
                placeholder="Поиск товаров..."
                className="flex-1 bg-transparent text-white placeholder-white/30 text-sm outline-none"
                aria-label="Поиск"
              />
              {search.query && (
                <button onClick={() => search.setQuery("")} className="text-white/30 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              )}
              <kbd className="hidden sm:block text-[10px] text-white/20 border border-white/10 rounded px-1.5 py-0.5">ESC</kbd>
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto scrollbar-none">
              {search.query.length >= 2 && search.results.length === 0 && (
                <div className="px-5 py-8 text-center text-white/30 text-sm">
                  Ничего не найдено по «{search.query}»
                </div>
              )}
              {search.results.map((product) => (
                <Link
                  key={product.id}
                  to={`/catalog/${product.id}`}
                  onClick={search.close}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-white/5 transition-colors group"
                >
                  {product.images[0] && (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-12 h-12 rounded-lg object-cover bg-white/5"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{product.name}</p>
                    <p className="text-white/40 text-xs">{product.category}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-white text-sm font-bold">{formatPrice(product.price)}</span>
                    <ArrowRight size={14} className="text-white/20 group-hover:text-white/60 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>

            {search.query.length < 2 && (
              <div className="px-5 py-4 text-xs text-white/20">
                Введите минимум 2 символа для поиска
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
