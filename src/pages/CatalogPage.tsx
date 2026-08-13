import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, RotateCcw } from "lucide-react";
import { seo } from "../store-data/seo";
import ProductCard from "../components/ui/ProductCard";
import { loadProducts, type Product } from "../lib/api";

type SortOption = "default" | "price-asc" | "price-desc" | "rating" | "new";
type FilterType = "all" | "sale";

// ---- Ключ для сохранения позиции скролла каталога ----
const SCROLL_KEY = "catalog_scroll_pos";

// ---- helpers to read/write comma-separated array params from the URL ----
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

  // ---- Filters state, all persisted to URL so browser Back restores them ----
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
  const [priceRange, setPriceRange] = useState<[number, number]>(() => {
    const min = searchParams.get("priceMin");
    const max = searchParams.get("priceMax");
    return [min ? Number(min) : 0, max ? Number(max) : 100000];
  });
  const [priceInitialized, setPriceInitialized] = useState(
    Boolean(searchParams.get("priceMin") || searchParams.get("priceMax"))
  );

  const filterParam = (searchParams.get("filter") || "all") as FilterType;

  // Флаг: нужно ли восстановить позицию скролла после загрузки
  // Проверяем sessionStorage: если есть сохранённая позиция — значит пользователь вернулся назад
  const shouldRestoreScroll = useRef(false);
  const scrollRestoredRef = useRef(false);

  // При монтировании проверяем, есть ли сохранённая позиция скролла
  useEffect(() => {
    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved !== null) {
      shouldRestoreScroll.current = true;
    }

    // При демонтировании страницы (уход со страницы каталога) НЕ очищаем sessionStorage —
    // позиция уже сохранена при клике на карточку товара.
    // Это гарантирует правильное восстановление при возврате.
    return () => {
      // cleanup — ничего не делаем намеренно
    };
  }, []);

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
        setProductsLoaded(true);
      } catch (e) {
        console.error("Ошибка загрузки:", e);
        if (isActive) {
          setProductsLoaded(true);
        }
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

  // ---- Восстановление позиции скролла после загрузки товаров ----
  // Восстанавливаем только один раз, после того как товары загружены и отрисованы
  useEffect(() => {
    if (!productsLoaded) return;
    if (!shouldRestoreScroll.current) return;
    if (scrollRestoredRef.current) return;

    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved === null) return;

    const targetY = Number(saved);
    scrollRestoredRef.current = true;

    // Убираем сохранённую позицию из sessionStorage
    sessionStorage.removeItem(SCROLL_KEY);

    // requestAnimationFrame гарантирует, что DOM уже обновлён после render
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: targetY, behavior: "instant" as ScrollBehavior });
      });
    });
  }, [productsLoaded]);

  // ---- Сохраняем позицию скролла при уходе со страницы (клик на товар) ----
  useEffect(() => {
    // Отслеживаем клики на ссылки товаров
    // HashRouter: Link генерирует href вида "#/catalog/ID" или "/catalog/ID" в зависимости от реализации
    // Дополнительно отслеживаем pathname после клика через hashchange
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a[href]");
      if (!target) return;
      const href = (target as HTMLAnchorElement).getAttribute("href");
      if (!href) return;
      // Сохраняем позицию при переходе на страницу конкретного товара
      const isProductLink =
        href.includes("/catalog/") ||
        href.startsWith("#/catalog/");
      if (isProductLink) {
        sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
      }
    };

    // Также сохраняем при изменении hash (для браузерной кнопки вперёд)
    const handleHashChange = (e: HashChangeEvent) => {
      const newHash = new URL(e.newURL).hash;
      const oldHash = new URL(e.oldURL).hash;
      // Переходим ИЗ каталога (список) В страницу товара
      const fromCatalogList = oldHash === "#/catalog" || oldHash.startsWith("#/catalog?");
      const toProductPage =
        newHash.startsWith("#/catalog/") &&
        newHash.slice("#/catalog/".length).length > 0 &&
        !newHash.slice("#/catalog/".length).startsWith("?");
      if (fromCatalogList && toProductPage) {
        // уже сохранено при клике, но на всякий случай
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
    return Array.from(new Set(values)).sort(
      (a, b) => Number(a) - Number(b) || a.localeCompare(b)
    );
  }, [products]);

  const categories = useMemo(() => {
    const values = products
      .map((product) => product.category)
      .filter(Boolean)
      .map((category) => category.trim());
    return Array.from(new Set(values)).sort();
  }, [products]);

  // ---- write current state into the URL ----
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
      apply(
        "priceMin",
        priceRange[0] === minPrice ? null : String(priceRange[0])
      );
      apply(
        "priceMax",
        priceRange[1] === maxPrice ? null : String(priceRange[1])
      );

      for (const [key, value] of Object.entries(overrides)) {
        apply(key, value);
      }

      setSearchParams(next, { replace: true });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
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
    ]
  );

  // keep URL in sync whenever any filter changes
  useEffect(() => {
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
  ]);

  const toggleInArray = (
    value: string,
    list: string[],
    setList: (v: string[]) => void
  ) => {
    setList(
      list.includes(value)
        ? list.filter((v) => v !== value)
        : [...list, value]
    );
  };

  const filtered = useMemo<Product[]>(() => {
    let list = [...products];

    if (filterParam === "sale") {
      const saleItems = list.filter(
        (p) => p.isSale || (p.discount ?? 0) > 0 || (p.oldPrice ?? 0) > p.price
      );
      list = saleItems.length > 0 ? saleItems : list;
    }

    const normalize = (value: string) => value.trim().toLowerCase();

    if (selectedCategories.length > 0) {
      const normalizedSelected = selectedCategories.map(normalize);
      list = list.filter((p) =>
        normalizedSelected.includes(normalize(p.category))
      );
    }

    if (selectedBrands.length > 0) {
      const normalizedSelected = selectedBrands.map(normalize);
      list = list.filter((p) =>
        normalizedSelected.includes(normalize(p.brand))
      );
    }

    if (selectedSizes.length > 0) {
      const normalizedSelected = selectedSizes.map(normalize);
      list = list.filter((p) =>
        p.sizes.some((size) =>
          normalizedSelected.includes(normalize(size.value))
        )
      );
    }

    if (selectedGender !== "all") {
      list = list.filter(
        (p) => normalize(p.gender) === normalize(selectedGender)
      );
    }

    if (onlyAvailable) {
      list = list.filter(
        (p) =>
          p.available ||
          p.sizes.some((size) => size.status !== "unavailable")
      );
    }

    list = list.filter(
      (p) => p.price >= priceRange[0] && p.price <= priceRange[1]
    );

    // ---- СОРТИРОВКА ----
    // ВАЖНО: list уже является копией ([...products]), поэтому sort() безопасен
    switch (sort) {
      case "price-asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        // По рейтингу: от большего к меньшему
        // Если rating отсутствует или NaN — товар идёт в конец (трактуем как 0)
        list.sort((a, b) => {
          const ratingA = typeof a.rating === "number" && !isNaN(a.rating) ? a.rating : 0;
          const ratingB = typeof b.rating === "number" && !isNaN(b.rating) ? b.rating : 0;
          return ratingB - ratingA;
        });
        break;
      case "new":
        // По новизне: isNew === true идут первыми
        list.sort((a, b) => {
          const aNew = a.isNew ? 1 : 0;
          const bNew = b.isNew ? 1 : 0;
          return bNew - aNew;
        });
        break;
      default:
        // "default" — оставляем порядок как есть
        break;
    }

    return list;
  }, [
    products,
    filterParam,
    selectedCategories,
    selectedBrands,
    selectedSizes,
    selectedGender,
    onlyAvailable,
    priceRange,
    sort,
  ]);

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
    [
      "category",
      "brand",
      "size",
      "gender",
      "available",
      "priceMin",
      "priceMax",
      "filter",
      "sort",
    ].forEach((k) => next.delete(k));
    setSearchParams(next, { replace: true });
    setSort("default");
  };

  return (
    <main className="min-h-screen pt-20 pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
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

        <div className="flex items-center gap-3 mb-6">

  <select
    value={sort}
    onChange={(e) => setSort(e.target.value as SortOption)}
    className="bg-white/6 text-white text-sm px-4 py-2 rounded-xl border border-white/10 outline-none"
  >
    <option value="default" className="bg-black">
      По умолчанию
    </option>

    <option value="price-asc" className="bg-black">
      Цена ↑
    </option>

    <option value="price-desc" className="bg-black">
      Цена ↓
    </option>

    <option value="rating" className="bg-black">
      Рейтинг
    </option>

    <option value="new" className="bg-black">
      Новинки
    </option>
  </select>

  <button
    onClick={() => setShowFilters(!showFilters)}
    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all ${
      showFilters
        ? "bg-white text-black"
        : "bg-white/6 text-white/50 hover:text-white"
    }`}
  >
    <Filter size={15} />

    Фильтры

    {selectedCategories.length +
      selectedBrands.length +
      selectedSizes.length >
      0 && (
      <span className="ml-1 bg-black/20 text-current text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
        {selectedCategories.length +
          selectedBrands.length +
          selectedSizes.length}
      </span>
    )}
  </button>

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
                            toggleInArray(
                              category,
                              selectedCategories,
                              setSelectedCategories
                            )
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
                              active
                                ? "bg-white border-white"
                                : "border-white/30"
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

                {/* Бренды — множественный выбор */}
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
                            toggleInArray(
                              brand,
                              selectedBrands,
                              setSelectedBrands
                            )
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
                              active
                                ? "bg-white border-white"
                                : "border-white/30"
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

                {/* Размеры — множественный выбор */}
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

                <div className="space-y-4">
                  <div>
                    <label className="text-white/40 text-xs uppercase tracking-wider mb-3 block">
                      Пол
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {["all", "Мужской", "Женский", "Унисекс"].map((g) => (
                        <button
                          key={g}
                          onClick={() => setSelectedGender(g)}
                          className={`text-sm px-3 py-1.5 rounded-lg transition-all ${
                            selectedGender === g
                              ? "bg-white text-black"
                              : "bg-white/6 text-white/50 hover:text-white"
                          }`}
                        >
                          {g === "all" ? "Все" : g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-white/60">
                    <input
                      type="checkbox"
                      checked={onlyAvailable}
                      onChange={() => setOnlyAvailable((value) => !value)}
                      className="accent-white"
                    />
                    Только в наличии
                  </label>

                  <div>
                    <label className="text-white/40 text-xs uppercase tracking-wider mb-3 block">
                      Цена: {priceRange[0].toLocaleString("ru-RU")} ₽ —{" "}
                      {priceRange[1].toLocaleString("ru-RU")} ₽
                    </label>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <input
                        type="number"
                        min={minPrice}
                        max={maxPrice}
                        value={priceRange[0]}
                        onChange={(e) =>
                          setPriceRange([Number(e.target.value), priceRange[1]])
                        }
                        className="bg-white/6 border border-white/10 text-white text-sm px-3 py-2 rounded-lg outline-none"
                        aria-label="Минимальная цена"
                      />
                      <input
                        type="number"
                        min={minPrice}
                        max={maxPrice}
                        value={priceRange[1]}
                        onChange={(e) =>
                          setPriceRange([priceRange[0], Number(e.target.value)])
                        }
                        className="bg-white/6 border border-white/10 text-white text-sm px-3 py-2 rounded-lg outline-none"
                        aria-label="Максимальная цена"
                      />
                    </div>
                    <input
                      type="range"
                      min={minPrice}
                      max={maxPrice}
                      value={priceRange[1]}
                      onChange={(e) =>
                        setPriceRange([priceRange[0], Number(e.target.value)])
                      }
                      className="w-full accent-white"
                      aria-label="Максимальная цена"
                    />
                  </div>

                  <button
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

        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-24"
          >
            <p className="text-white/20 text-6xl mb-6">🔍</p>
            <p className="text-white/40 text-lg">Товары не найдены</p>
            <p className="text-white/20 text-sm mt-2">
              Попробуйте изменить фильтры
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mt-8">
            {filtered.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        )}
      </div>
  );
