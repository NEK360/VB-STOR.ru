import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, RotateCcw } from "lucide-react";
import { seo } from "../store-data/seo";
import ProductCard from "../components/ui/ProductCard";
import { loadProducts, type Product } from "../lib/api";

type SortOption = "default" | "price-asc" | "price-desc" | "rating" | "new";
type FilterType = "all" | "sale";

// ---- helpers to read/write comma-separated array params from the URL ----
function parseListParam(params: URLSearchParams, key: string): string[] {
  const raw = params.get(key);
  if (!raw) return [];
  return raw.split(",").map((v) => decodeURIComponent(v)).filter(Boolean);
}

function serializeList(values: string[]): string | null {
  if (!values.length) return null;
  return values.map((v) => encodeURIComponent(v)).join(",");
}

export default function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  // ---- Filters state, all persisted to URL so browser Back restores them ----
  const [sort, setSort] = useState<SortOption>((searchParams.get("sort") as SortOption) || "default");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => parseListParam(searchParams, "category"));
  const [selectedBrands, setSelectedBrands] = useState<string[]>(() => parseListParam(searchParams, "brand"));
  const [selectedSizes, setSelectedSizes] = useState<string[]>(() => parseListParam(searchParams, "size"));
  const [selectedGender, setSelectedGender] = useState(searchParams.get("gender") || "all");
  const [onlyAvailable, setOnlyAvailable] = useState(searchParams.get("available") === "1");
  const [priceRange, setPriceRange] = useState<[number, number]>(() => {
    const min = searchParams.get("priceMin");
    const max = searchParams.get("priceMax");
    return [min ? Number(min) : 0, max ? Number(max) : 100000];
  });
  const [priceInitialized, setPriceInitialized] = useState(
    Boolean(searchParams.get("priceMin") || searchParams.get("priceMax"))
  );

  const filterParam = (searchParams.get("filter") || "all") as FilterType;

  // Re-sync local state whenever the URL changes externally (e.g. browser Back/Forward)
  useEffect(() => {
    setSelectedCategories(parseListParam(searchParams, "category"));
    setSelectedBrands(parseListParam(searchParams, "brand"));
    setSelectedSizes(parseListParam(searchParams, "size"));
    setSelectedGender(searchParams.get("gender") || "all");
    setOnlyAvailable(searchParams.get("available") === "1");
    setSort((searchParams.get("sort") as SortOption) || "default");
    const min = searchParams.get("priceMin");
    const max = searchParams.get("priceMax");
    if (min || max) {
      setPriceRange([min ? Number(min) : 0, max ? Number(max) : 100000]);
      setPriceInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  useEffect(() => {
    let isActive = true;

    async function fetchData() {
      try {
        const data = await loadProducts();
        if (!isActive) return;
        setProducts(data);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Ошибка загрузки:", e);
      }
    }

    void fetchData();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    document.title = seo.catalog.title;
  }, []);

  const maxPrice = useMemo(() => {
    if (products.length === 0) return 100000;
    return Math.max(...products.map((p) => p.price));
  }, [products]);

  const minPrice = useMemo(() => {
    if (products.length === 0) return 0;
    return Math.min(...products.map((p) => p.price));
  }, [products]);

  // once we know the real min/max, initialize the price range if it wasn't set via URL
  useEffect(() => {
    if (!priceInitialized && products.length > 0) {
      setPriceRange([minPrice, maxPrice]);
      setPriceInitialized(true);
    }
  }, [priceInitialized, products.length, minPrice, maxPrice]);

  const brands = useMemo(() => {
    const values = products
      .map((product) => product.brand)
      .filter(Boolean)
      .map((brand) => brand.trim());
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const sizes = useMemo(() => {
    const values = products
      .flatMap((product) => product.sizes.map((size) => size.value))
      .filter(Boolean)
      .map((size) => size.trim());
    return Array.from(new Set(values)).sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));
  }, [products]);

  const categories = useMemo(() => {
    const values = products
      .map((product) => product.category)
      .filter(Boolean)
      .map((category) => category.trim());
    return Array.from(new Set(values)).sort();
  }, [products]);

  // ---- write current state into the URL (replace, so we don't spam history,
  // but the latest state is always what "Back" from a product page restores) ----
  const syncUrl = useCallback(
    (overrides: Record<string, string | null> = {}) => {
      const next = new URLSearchParams(searchParams);

      const apply = (key: string, value: string | null) => {
        if (value === null || value === "") next.delete(key);
        else next.set(key, value);
      };

      apply("category", serializeList(selectedCategories));
      apply("brand", serializeList(selectedBrands));
      apply("size", serializeList(selectedSizes));
      apply("gender", selectedGender === "all" ? null : selectedGender);
      apply("available", onlyAvailable ? "1" : null);
      apply("sort", sort === "default" ? null : sort);
      apply("priceMin", priceRange[0] === minPrice ? null : String(priceRange[0]));
      apply("priceMax", priceRange[1] === maxPrice ? null : String(priceRange[1]));

      for (const [key, value] of Object.entries(overrides)) {
        apply(key, value);
      }

      setSearchParams(next, { replace: true });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParams, selectedCategories, selectedBrands, selectedSizes, selectedGender, onlyAvailable, sort, priceRange, minPrice, maxPrice]
  );

  // keep URL in sync whenever any filter changes
  useEffect(() => {
    syncUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategories, selectedBrands, selectedSizes, selectedGender, onlyAvailable, sort, priceRange]);

  const toggleInArray = (value: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const filtered = useMemo<Product[]>(() => {
    let list = [...products];

    if (filterParam === "sale") {
      const saleItems = list.filter((p) => p.isSale || (p.discount ?? 0) > 0 || (p.oldPrice ?? 0) > p.price);
      list = saleItems.length > 0 ? saleItems : list;
    }

    const normalize = (value: string) => value.trim().toLowerCase();

    // multi-select category: product matches if its category is any of the selected ones
    if (selectedCategories.length > 0) {
      const normalizedSelected = selectedCategories.map(normalize);
      list = list.filter((p) => normalizedSelected.includes(normalize(p.category)));
    }

    // multi-select brand
    if (selectedBrands.length > 0) {
      const normalizedSelected = selectedBrands.map(normalize);
      list = list.filter((p) => normalizedSelected.includes(normalize(p.brand)));
    }

    // multi-select size: product matches if it has at least one of the selected sizes
    if (selectedSizes.length > 0) {
      const normalizedSelected = selectedSizes.map(normalize);
      list = list.filter((p) => p.sizes.some((size) => normalizedSelected.includes(normalize(size.value))));
    }

    if (selectedGender !== "all") {
      list = list.filter((p) => normalize(p.gender) === normalize(selectedGender));
    }

    if (onlyAvailable) {
      list = list.filter((p) => p.available || p.sizes.some((size) => size.status !== "unavailable"));
    }

    list = list.filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1]);

    switch (sort) {
      case "price-asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        list.sort((a, b) => b.rating - a.rating);
        break;
      case "new":
        list.sort((a, b) => Number(b.isNew) - Number(a.isNew));
        break;
    }

    return list;
  }, [products, filterParam, selectedCategories, selectedBrands, selectedSizes, selectedGender, onlyAvailable, priceRange, sort]);

  const setFilter = (f: FilterType) => {
    const next = new URLSearchParams(searchParams);
    if (f === "all") next.delete("filter");
    else next.set("filter", f);
    setSearchParams(next, { replace: true });
  };

  const resetFilters = () => {
    setSelectedCategories([]);
    setSelectedBrands([]);
    setSelectedSizes([]);
    setSelectedGender("all");
    setOnlyAvailable(false);
    setPriceRange([minPrice, maxPrice]);
    const next = new URLSearchParams(searchParams);
    ["category", "brand", "size", "gender", "available", "priceMin", "priceMax", "filter", "sort"].forEach((k) => next.delete(k));
    setSearchParams(next, { replace: true });
    setSort("default");
  };

  return (
    <main className="min-h-screen pt-20 pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="py-12">
          <p className="text-white/30 text-xs font-medium tracking-[0.3em] uppercase mb-3">VB STORE</p>
          <h1 className="text-white font-black text-4xl md:text-6xl tracking-tight">Каталог</h1>
          <p className="text-white/30 mt-3 text-sm">{filtered.length} товаров</p>
        </motion.div>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`text-sm px-4 py-2 rounded-xl transition-all ${filterParam === "all" ? "bg-white text-black" : "bg-white/6 text-white/50 hover:text-white"}`}
            >
              Все товары
            </button>
            <button
              onClick={() => setFilter("sale")}
              className={`text-sm px-4 py-2 rounded-xl transition-all ${filterParam === "sale" ? "bg-white text-black" : "bg-white/6 text-white/50 hover:text-white"}`}
            >
              Распродажа
            </button>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2 shrink-0">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="bg-black text-white border border-white/10 rounded-xl px-4 py-2 outline-none appearance-none"
              aria-label="Сортировка"
            >
              <option value="default" className="bg-black text-white">По умолчанию</option>
              <option value="price-asc" className="bg-black text-white">Цена ↑</option>
              <option value="price-desc" className="bg-black text-white">Цена ↓</option>
              <option value="rating" className="bg-black text-white">По рейтингу</option>
              <option value="new" className="bg-black text-white">Новинки</option>
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all ${showFilters ? "bg-white text-black" : "bg-white/6 text-white/50 hover:text-white"}`}
              aria-expanded={showFilters}
              aria-label="Фильтры"
            >
              <Filter size={15} />
              Фильтры
              {(selectedCategories.length + selectedBrands.length + selectedSizes.length) > 0 && (
                <span className="ml-1 bg-black/20 text-current text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {selectedCategories.length + selectedBrands.length + selectedSizes.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="glass rounded-2xl p-6 mb-8 border border-white/8 grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4">
                {/* Категории — множественный выбор */}
                <div>
                  <label className="text-white/40 text-xs uppercase tracking-wider mb-3 block">Категория</label>
                  <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                    {categories.map((category) => {
                      const active = selectedCategories.includes(category);
                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() => toggleInArray(category, selectedCategories, setSelectedCategories)}
                          aria-pressed={active}
                          className={`flex items-center gap-2 text-left text-sm px-3 py-2 rounded-lg transition-all ${
                            active ? "bg-white/15 text-white" : "text-white/50 hover:text-white hover:bg-white/8"
                          }`}
                        >
                          <span
                            className={`w-3.5 h-3.5 rounded-[4px] border shrink-0 ${active ? "bg-white border-white" : "border-white/30"}`}
                          />
                          {category}
                        </button>
                      );
                    })}
                    {categories.length === 0 && <p className="text-white/20 text-sm">Нет данных</p>}
                  </div>
                </div>

                {/* Бренды — множественный выбор */}
                <div>
                  <label className="text-white/40 text-xs uppercase tracking-wider mb-3 block">Бренд</label>
                  <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                    {brands.map((brand) => {
                      const active = selectedBrands.includes(brand);
                      return (
                        <button
                          key={brand}
                          type="button"
                          onClick={() => toggleInArray(brand, selectedBrands, setSelectedBrands)}
                          aria-pressed={active}
                          className={`flex items-center gap-2 text-left text-sm px-3 py-2 rounded-lg transition-all ${
                            active ? "bg-white/15 text-white" : "text-white/50 hover:text-white hover:bg-white/8"
                          }`}
                        >
                          <span
                            className={`w-3.5 h-3.5 rounded-[4px] border shrink-0 ${active ? "bg-white border-white" : "border-white/30"}`}
                          />
                          {brand}
                        </button>
                      );
                    })}
                    {brands.length === 0 && <p className="text-white/20 text-sm">Нет данных</p>}
                  </div>
                </div>

                {/* Размеры — множественный выбор */}
                <div>
                  <label className="text-white/40 text-xs uppercase tracking-wider mb-3 block">Размер</label>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map((size) => {
                      const active = selectedSizes.includes(size);
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => toggleInArray(size, selectedSizes, setSelectedSizes)}
                          aria-pressed={active}
                          className={`text-sm px-3 py-1.5 rounded-lg transition-all ${active ? "bg-white text-black" : "bg-white/6 text-white/50 hover:text-white"}`}
                        >
                          {size}
                        </button>
                      );
                    })}
                    {sizes.length === 0 && <p className="text-white/20 text-sm">Нет данных</p>}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-white/40 text-xs uppercase tracking-wider mb-3 block">Пол</label>
                    <div className="flex flex-wrap gap-2">
                      {["all", "Мужской", "Женский", "Унисекс"].map((g) => (
                        <button
                          key={g}
                          onClick={() => setSelectedGender(g)}
                          className={`text-sm px-3 py-1.5 rounded-lg transition-all ${selectedGender === g ? "bg-white text-black" : "bg-white/6 text-white/50 hover:text-white"}`}
                        >
                          {g === "all" ? "Все" : g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-white/60">
                    <input type="checkbox" checked={onlyAvailable} onChange={() => setOnlyAvailable((value) => !value)} className="accent-white" />
                    Только в наличии
                  </label>

                  <div>
                    <label className="text-white/40 text-xs uppercase tracking-wider mb-3 block">
                      Цена: {priceRange[0].toLocaleString("ru-RU")} ₽ — {priceRange[1].toLocaleString("ru-RU")} ₽
                    </label>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <input
                        type="number"
                        min={minPrice}
                        max={maxPrice}
                        value={priceRange[0]}
                        onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                        className="bg-white/6 border border-white/10 text-white text-sm px-3 py-2 rounded-lg outline-none"
                        aria-label="Минимальная цена"
                      />
                      <input
                        type="number"
                        min={minPrice}
                        max={maxPrice}
                        value={priceRange[1]}
                        onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                        className="bg-white/6 border border-white/10 text-white text-sm px-3 py-2 rounded-lg outline-none"
                        aria-label="Максимальная цена"
                      />
                    </div>
                    <input
                      type="range"
                      min={minPrice}
                      max={maxPrice}
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                      className="w-full accent-white"
                      aria-label="Максимальная цена"
                    />
                  </div>

                  <button onClick={resetFilters} className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors">
                    <RotateCcw size={14} />
                    Сбросить фильтры
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24">
            <p className="text-white/20 text-6xl mb-6">🔍</p>
            <p className="text-white/40 text-lg">Товары не найдены</p>
            <p className="text-white/20 text-sm mt-2">Попробуйте изменить фильтры</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mt-8">
            {filtered.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
