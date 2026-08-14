import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, RotateCcw } from "lucide-react";
import { seo } from "../store-data/seo";
import ProductCard from "../components/ui/ProductCard";
import { loadProducts, type Product } from "../lib/api";

type SortOption = "default" | "price-asc" | "price-desc" | "rating" | "new";

const SCROLL_KEY = "catalog_scroll_pos";

// Варианты пола для фильтра (задача 2)
const GENDER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "Мужской", label: "Мужской" },
  { value: "Женский", label: "Женский" },
  { value: "Унисекс", label: "Унисекс" },
  { value: "Мальчики", label: "Мальчики" },
  { value: "Девочки", label: "Девочки" },
];

function parseListParam(params: URLSearchParams, key: string): string[] {
  const raw = params.get(key);
  if (!raw) return [];
  return raw
    .split(",")
    .map((v) => decodeURIComponent(v))
    .filter(Boolean);
}

function serializeList(values: string[]): string | null {
  if (!values.length) return null;
  return values.map((v) => encodeURIComponent(v)).join(",");
}

export default function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [showFilters, setShowFilters] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);

  // =========================
  // FILTERS — инициализация из URL
  // =========================

  const [sort, setSort] = useState<SortOption>(
    (searchParams.get("sort") as SortOption) || "default"
  );

  const [selectedCategories, setSelectedCategories] = useState<string[]>(() =>
    parseListParam(searchParams, "category")
  );

  const [selectedBrands, setSelectedBrands] = useState<string[]>(() =>
    parseListParam(searchParams, "brand")
  );

  const [selectedSizes, setSelectedSizes] = useState<string[]>(() =>
    parseListParam(searchParams, "size")
  );

  const [selectedGender, setSelectedGender] = useState(
    searchParams.get("gender") || "all"
  );

  const [onlyAvailable, setOnlyAvailable] = useState(
    searchParams.get("available") === "1"
  );

  // Цена: локальные значения ползунка (не синхронизируются с URL мгновенно)
  const [priceRange, setPriceRange] = useState<[number, number]>(() => {
    const min = searchParams.get("priceMin");
    const max = searchParams.get("priceMax");
    return [min ? Number(min) : 0, max ? Number(max) : 100000];
  });

  const [priceInitialized, setPriceInitialized] = useState(
    Boolean(searchParams.get("priceMin") || searchParams.get("priceMax"))
  );

  // =========================
  // SCROLL RESTORATION
  // =========================

  const shouldRestoreScroll = useRef(false);
  const scrollRestoredRef = useRef(false);

  useEffect(() => {
    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved !== null) {
      shouldRestoreScroll.current = true;
    }
  }, []);

  // =========================
  // SYNC STATE FROM URL (при внешней навигации)
  // =========================

  // Используем ref, чтобы знать, было ли изменение URL из нашего syncUrl или извне
  const isSyncingUrl = useRef(false);

  useEffect(() => {
    if (isSyncingUrl.current) return;

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

  // =========================
  // LOAD PRODUCTS
  // =========================

  useEffect(() => {
    let isActive = true;

    async function fetchData() {
      try {
        const data = await loadProducts();
        if (!isActive) return;
        setProducts(data);
        setProductsLoaded(true);
      } catch (error) {
        console.error("Ошибка загрузки:", error);
        if (isActive) setProductsLoaded(true);
      }
    }

    void fetchData();
    return () => { isActive = false; };
  }, []);

  // =========================
  // SEO
  // =========================

  useEffect(() => {
    document.title = seo.catalog.title;
  }, []);

  // =========================
  // PRICE LIMITS
  // =========================

  const maxPrice = useMemo(() => {
    if (products.length === 0) return 100000;
    return Math.max(...products.map((p) => p.price));
  }, [products]);

  const minPrice = useMemo(() => {
    if (products.length === 0) return 0;
    return Math.min(...products.map((p) => p.price));
  }, [products]);

  useEffect(() => {
    if (!priceInitialized && products.length > 0) {
      setPriceRange([minPrice, maxPrice]);
      setPriceInitialized(true);
    }
  }, [priceInitialized, products.length, minPrice, maxPrice]);

  // =========================
  // RESTORE SCROLL
  // =========================

  useEffect(() => {
    if (!productsLoaded) return;
    if (!shouldRestoreScroll.current) return;
    if (scrollRestoredRef.current) return;

    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved === null) return;

    const targetY = Number(saved);
    scrollRestoredRef.current = true;
    sessionStorage.removeItem(SCROLL_KEY);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: targetY, behavior: "instant" as ScrollBehavior });
      });
    });
  }, [productsLoaded]);

  // =========================
  // SAVE SCROLL BEFORE PRODUCT
  // =========================

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement).closest("a[href]");
      if (!target) return;
      const href = (target as HTMLAnchorElement).getAttribute("href");
      if (!href) return;
      const isProductLink = href.includes("/catalog/") || href.startsWith("#/catalog/");
      if (isProductLink) {
        sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
      }
    };

    const handleHashChange = (event: HashChangeEvent) => {
      const newHash = new URL(event.newURL).hash;
      const oldHash = new URL(event.oldURL).hash;
      const fromCatalogList = oldHash === "#/catalog" || oldHash.startsWith("#/catalog?");
      const toProductPage =
        newHash.startsWith("#/catalog/") &&
        newHash.slice("#/catalog/".length).length > 0 &&
        !newHash.slice("#/catalog/".length).startsWith("?");

      if (fromCatalogList && toProductPage) {
        if (!sessionStorage.getItem(SCROLL_KEY)) {
          sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
        }
      }
    };

    document.addEventListener("click", handleClick, true);
    window.addEventListener("hashchange", handleHashChange);
    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  // =========================
  // FILTER OPTIONS
  // =========================

  const brands = useMemo(() => {
    const values = products
      .map((p) => p.brand)
      .filter(Boolean)
      .map((b) => b.trim());
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const sizes = useMemo(() => {
    const values = products
      .flatMap((p) => p.sizes.map((s) => s.value))
      .filter(Boolean)
      .map((s) => s.trim());
    return Array.from(new Set(values)).sort(
      (a, b) => Number(a) - Number(b) || a.localeCompare(b)
    );
  }, [products]);

  const categories = useMemo(() => {
    const values = products
      .map((p) => p.category)
      .filter(Boolean)
      .map((c) => c.trim());
    return Array.from(new Set(values)).sort();
  }, [products]);

  // =========================
  // URL SYNC (задача 7 — не ломать существующую систему)
  // =========================

  const syncUrl = useCallback(() => {
    isSyncingUrl.current = true;

    const next = new URLSearchParams(searchParams);

    const apply = (key: string, value: string | null) => {
      if (value === null || value === "") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    };

    apply("category", serializeList(selectedCategories));
    apply("brand", serializeList(selectedBrands));
    apply("size", serializeList(selectedSizes));
    apply("gender", selectedGender === "all" ? null : selectedGender);
    apply("available", onlyAvailable ? "1" : null);
    apply("sort", sort === "default" ? null : sort);
    apply("priceMin", priceRange[0] === minPrice ? null : String(priceRange[0]));
    apply("priceMax", priceRange[1] === maxPrice ? null : String(priceRange[1]));

    setSearchParams(next, { replace: true });

    // Сброс флага после обновления URL
    requestAnimationFrame(() => {
      isSyncingUrl.current = false;
    });
  }, [
    searchParams,
    selectedCategories,
    selectedBrands,
    selectedSizes,
    selectedGender,
    onlyAvailable,
    sort,
    priceRange,
    minPrice,
    maxPrice,
    setSearchParams,
  ]);

  useEffect(() => {
    if (!priceInitialized) return;
    syncUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedCategories,
    selectedBrands,
    selectedSizes,
    selectedGender,
    onlyAvailable,
    sort,
    priceRange,
    priceInitialized,
  ]);

  // =========================
  // ARRAY FILTER HELPER
  // =========================

  const toggleInArray = (
    value: string,
    list: string[],
    setList: (v: string[]) => void
  ) => {
    setList(
      list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
    );
  };

  // =========================
  // FILTER + SORT (задача 9 — rating, new)
  // =========================

  const filtered = useMemo<Product[]>(() => {
    let list = [...products];
    const normalize = (s: string) => s.trim().toLowerCase();

    if (selectedCategories.length > 0) {
      const sel = selectedCategories.map(normalize);
      list = list.filter((p) => sel.includes(normalize(p.category)));
    }

    if (selectedBrands.length > 0) {
      const sel = selectedBrands.map(normalize);
      list = list.filter((p) => sel.includes(normalize(p.brand)));
    }

    if (selectedSizes.length > 0) {
      const sel = selectedSizes.map(normalize);
      list = list.filter((p) => p.sizes.some((s) => sel.includes(normalize(s.value))));
    }

    if (selectedGender !== "all") {
      list = list.filter((p) => normalize(p.gender) === normalize(selectedGender));
    }

    if (onlyAvailable) {
      list = list.filter(
        (p) => p.available || p.sizes.some((s) => s.status !== "unavailable")
      );
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
        list.sort((a, b) => {
          const rA = typeof a.rating === "number" && !Number.isNaN(a.rating) ? a.rating : 0;
          const rB = typeof b.rating === "number" && !Number.isNaN(b.rating) ? b.rating : 0;
          return rB - rA;
        });
        break;
      case "new":
        list.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
        break;
      case "default":
      default:
        break;
    }

    return list;
  }, [
    products,
    selectedCategories,
    selectedBrands,
    selectedSizes,
    selectedGender,
    onlyAvailable,
    priceRange,
    sort,
  ]);

  // =========================
  // RESET
  // =========================

  const resetFilters = () => {
    setSelectedCategories([]);
    setSelectedBrands([]);
    setSelectedSizes([]);
    setSelectedGender("all");
    setOnlyAvailable(false);
    setPriceRange([minPrice, maxPrice]);
    setSort("default");

    const next = new URLSearchParams(searchParams);
    ["category", "brand", "size", "gender", "available", "priceMin", "priceMax", "sort"].forEach(
      (key) => next.delete(key)
    );
    setSearchParams(next, { replace: true });
  };

  // =========================
  // PRICE RANGE HANDLERS (задача 3 — без скачков)
  // =========================

  const handlePriceMinChange = (value: number) => {
    const clamped = Math.min(value, priceRange[1]);
    setPriceRange([clamped, priceRange[1]]);
  };

  const handlePriceMaxChange = (value: number) => {
    const clamped = Math.max(value, priceRange[0]);
    setPriceRange([priceRange[0], clamped]);
  };

  const handleMinRangeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (val <= priceRange[1]) {
      setPriceRange([val, priceRange[1]]);
    }
  };

  const handleMaxRangeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (val >= priceRange[0]) {
      setPriceRange([priceRange[0], val]);
    }
  };

  // =========================
  // RENDER
  // =========================

  return (
    <main className="min-h-screen pt-20 pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="py-12"
        >
          <p className="text-white/30 text-xs font-medium tracking-[0.3em] uppercase mb-3">
            VB STORE
          </p>
          <h1 className="text-white font-black text-4xl md:text-6xl tracking-tight">
            Каталог
          </h1>
          <p className="text-white/30 mt-3 text-sm">{filtered.length} товаров</p>
        </motion.div>

        {/* SORT + FILTER BUTTON */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3 flex-wrap">

            {/* СОРТИРОВКА */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="bg-black text-white border border-white/10 rounded-xl px-4 py-2 outline-none appearance-none text-sm"
              aria-label="Сортировка товаров"
            >
              <option value="default" className="bg-black text-white">
                По умолчанию
              </option>
              <option value="price-asc" className="bg-black text-white">
                По возрастанию цены
              </option>
              <option value="price-desc" className="bg-black text-white">
                По убыванию цены
              </option>
              <option value="rating" className="bg-black text-white">
                По рейтингу
              </option>
              <option value="new" className="bg-black text-white">
                Новинки
              </option>
            </select>

            {/* ФИЛЬТРЫ */}
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all ${
                showFilters
                  ? "bg-white text-black"
                  : "bg-white/6 text-white/50 hover:text-white"
              }`}
              aria-expanded={showFilters}
              aria-label="Фильтры"
            >
              <Filter size={15} />
              Фильтры
              {selectedCategories.length + selectedBrands.length + selectedSizes.length > 0 && (
                <span className="ml-1 bg-black/20 text-current text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {selectedCategories.length + selectedBrands.length + selectedSizes.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* FILTERS PANEL */}
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

                {/* КАТЕГОРИЯ */}
                <div>
                  <label className="text-white/40 text-xs uppercase tracking-wider mb-3 block">
                    Категория
                  </label>
                  <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                    {categories.map((category) => {
                      const active = selectedCategories.includes(category);
                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() =>
                            toggleInArray(category, selectedCategories, setSelectedCategories)
                          }
                          aria-pressed={active}
                          className={`flex items-center gap-2 text-left text-sm px-3 py-2 rounded-lg transition-all ${
                            active
                              ? "bg-white/15 text-white"
                              : "text-white/50 hover:text-white hover:bg-white/8"
                          }`}
                        >
                          <span
                            className={`w-3.5 h-3.5 rounded-[4px] border shrink-0 ${
                              active ? "bg-white border-white" : "border-white/30"
                            }`}
                          />
                          {category}
                        </button>
                      );
                    })}
                    {categories.length === 0 && (
                      <p className="text-white/20 text-sm">Нет данных</p>
                    )}
                  </div>
                </div>

                {/* БРЕНД */}
                <div>
                  <label className="text-white/40 text-xs uppercase tracking-wider mb-3 block">
                    Бренд
                  </label>
                  <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                    {brands.map((brand) => {
                      const active = selectedBrands.includes(brand);
                      return (
                        <button
                          key={brand}
                          type="button"
                          onClick={() =>
                            toggleInArray(brand, selectedBrands, setSelectedBrands)
                          }
                          aria-pressed={active}
                          className={`flex items-center gap-2 text-left text-sm px-3 py-2 rounded-lg transition-all ${
                            active
                              ? "bg-white/15 text-white"
                              : "text-white/50 hover:text-white hover:bg-white/8"
                          }`}
                        >
                          <span
                            className={`w-3.5 h-3.5 rounded-[4px] border shrink-0 ${
                              active ? "bg-white border-white" : "border-white/30"
                            }`}
                          />
                          {brand}
                        </button>
                      );
                    })}
                    {brands.length === 0 && (
                      <p className="text-white/20 text-sm">Нет данных</p>
                    )}
                  </div>
                </div>

                {/* РАЗМЕР */}
                <div>
                  <label className="text-white/40 text-xs uppercase tracking-wider mb-3 block">
                    Размер
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map((size) => {
                      const active = selectedSizes.includes(size);
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() =>
                            toggleInArray(size, selectedSizes, setSelectedSizes)
                          }
                          aria-pressed={active}
                          className={`text-sm px-3 py-1.5 rounded-lg transition-all ${
                            active
                              ? "bg-white text-black"
                              : "bg-white/6 text-white/50 hover:text-white"
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                    {sizes.length === 0 && (
                      <p className="text-white/20 text-sm">Нет данных</p>
                    )}
                  </div>
                </div>

                {/* ОСТАЛЬНЫЕ ФИЛЬТРЫ */}
                <div className="space-y-4">

                  {/* ПОЛ (задача 2 — добавлены Мальчики, Девочки) */}
                  <div>
                    <label className="text-white/40 text-xs uppercase tracking-wider mb-3 block">
                      Пол
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {GENDER_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setSelectedGender(opt.value)}
                          className={`text-sm px-3 py-1.5 rounded-lg transition-all ${
                            selectedGender === opt.value
                              ? "bg-white text-black"
                              : "bg-white/6 text-white/50 hover:text-white"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* НАЛИЧИЕ */}
                  <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={onlyAvailable}
                      onChange={() => setOnlyAvailable((v) => !v)}
                      className="accent-white"
                    />
                    Только в наличии
                  </label>

                  {/* ЦЕНА (задача 3 — два ползунка, без скачков) */}
                  <div>
                    <label className="text-white/40 text-xs uppercase tracking-wider mb-3 block">
                      Цена:{" "}
                      {priceRange[0].toLocaleString("ru-RU")} ₽ —{" "}
                      {priceRange[1].toLocaleString("ru-RU")} ₽
                    </label>

                    {/* Числовые поля */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <input
                        type="number"
                        min={minPrice}
                        max={priceRange[1]}
                        value={priceRange[0]}
                        onChange={(e) => handlePriceMinChange(Number(e.target.value))}
                        className="bg-white/6 border border-white/10 text-white text-sm px-3 py-2 rounded-lg outline-none"
                        aria-label="Минимальная цена"
                      />
                      <input
                        type="number"
                        min={priceRange[0]}
                        max={maxPrice}
                        value={priceRange[1]}
                        onChange={(e) => handlePriceMaxChange(Number(e.target.value))}
                        className="bg-white/6 border border-white/10 text-white text-sm px-3 py-2 rounded-lg outline-none"
                        aria-label="Максимальная цена"
                      />
                    </div>

                    {/* Ползунок минимума */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-white/30 text-[11px] w-6">от</span>
                        <input
                          type="range"
                          min={minPrice}
                          max={maxPrice}
                          step={1}
                          value={priceRange[0]}
                          onChange={handleMinRangeInput}
                          className="flex-1 accent-white"
                          aria-label="Минимальная цена (ползунок)"
                        />
                      </div>
                      {/* Ползунок максимума */}
                      <div className="flex items-center gap-2">
                        <span className="text-white/30 text-[11px] w-6">до</span>
                        <input
                          type="range"
                          min={minPrice}
                          max={maxPrice}
                          step={1}
                          value={priceRange[1]}
                          onChange={handleMaxRangeInput}
                          className="flex-1 accent-white"
                          aria-label="Максимальная цена (ползунок)"
                        />
                      </div>
                    </div>
                  </div>

                  {/* СБРОС */}
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
                  >
                    <RotateCcw size={14} />
                    Сбросить фильтры
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PRODUCTS */}
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-24"
          >
            <p className="text-white/20 text-6xl mb-6">🔍</p>
            <p className="text-white/40 text-lg">Товары не найдены</p>
            <p className="text-white/20 text-sm mt-2">Попробуйте изменить фильтры</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mt-8">
            {filtered.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

}
