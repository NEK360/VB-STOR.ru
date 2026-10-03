import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronDown,
  RotateCcw,
  SlidersHorizontal,
  ArrowUpDown,
  X,
} from "lucide-react";
import { seo } from "../store-data/seo";
import ProductCard from "../components/ui/ProductCard";
import { loadProducts, type Product } from "../lib/api";
import {
  classifySize,
  getProductMacroGroup,
  SIZE_GROUP_LABELS,
  sortSizesByGroup,
  type GroupedSizes,
  type SizeGroupKey,
} from "../lib/sizes";

type SortOption = "default" | "price-asc" | "price-desc" | "rating" | "new";
type DropdownKey = "sort" | "category" | "size" | "gender" | "brand" | "price" | null;

const SCROLL_KEY = "catalog_scroll_pos";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "default", label: "По популярности" },
  { value: "rating", label: "По рейтингу" },
  { value: "price-asc", label: "По возрастанию цены" },
  { value: "price-desc", label: "По убыванию цены" },
  { value: "new", label: "По новинкам" },
];

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

function normalize(s: string): string {
  return (s ?? "").trim().toLowerCase();
}

/**
 * Проверяет, подходит ли товар под выбранные категории.
 * Поддерживает как точные названия категорий («Кроссовки», «Шлепанцы», «Одежда», «Товары»),
 * так и макро-группы («Обувь», «Одежда», «Товары»).
 */
function productMatchesCategories(product: Product, selectedCategories: string[]): boolean {
  if (selectedCategories.length === 0) return true;
  const prodCat = normalize(product.category);
  const macro = getProductMacroGroup(product.category, product.name);

  return selectedCategories.some((selRaw) => {
    const sel = normalize(selRaw);
    if (sel === prodCat) return true;
    if (sel === "обувь" && macro === "shoes") return true;
    if (sel === "одежда" && macro === "clothing") return true;
    if (sel === "товары" && macro === "items") return true;
    return false;
  });
}

export default function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [showAllFilters, setShowAllFilters] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<DropdownKey>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);

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

  const [priceRange, setPriceRange] = useState<[number, number]>(() => {
    const min = searchParams.get("priceMin");
    const max = searchParams.get("priceMax");
    return [min ? Number(min) : 0, max ? Number(max) : 100000];
  });

  const [priceInitialized, setPriceInitialized] = useState(
    Boolean(searchParams.get("priceMin") || searchParams.get("priceMax"))
  );

  // Закрытие выпадающего фильтра по клику вне панели и по клавише Escape
  useEffect(() => {
    if (!openDropdown) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (
        filterBarRef.current &&
        !filterBarRef.current.contains(event.target as Node)
      ) {
        setOpenDropdown(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenDropdown(null);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openDropdown]);

  // Блокировка скролла при открытии боковой панели «Все фильтры»
  useEffect(() => {
    if (!showAllFilters) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowAllFilters(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [showAllFilters]);

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
    return () => {
      isActive = false;
    };
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
      const isProductLink =
        href.includes("/catalog/") || href.startsWith("#/catalog/");
      if (isProductLink) {
        sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
      }
    };

    const handleHashChange = (event: HashChangeEvent) => {
      const newHash = new URL(event.newURL).hash;
      const oldHash = new URL(event.oldURL).hash;
      const fromCatalogList =
        oldHash === "#/catalog" || oldHash.startsWith("#/catalog?");
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
  // ВЗАИМОСВЯЗАННАЯ ФИЛЬТРАЦИЯ (КАК НА WILDBERRIES)
  // =========================

  /**
   * Проверяет, подходит ли товар по всем активным фильтрам, кроме указанного excludeFacet.
   * Благодаря этому при выборе «Одежда» в списке размеров остаются только размеры одежды,
   * в списке брендов — только бренды одежды и т.д.
   */
  const matchesFacet = useCallback(
    (
      p: Product,
      excludeFacet?: "category" | "brand" | "size" | "gender" | "price"
    ): boolean => {
      if (
        excludeFacet !== "category" &&
        !productMatchesCategories(p, selectedCategories)
      ) {
        return false;
      }

      if (excludeFacet !== "brand" && selectedBrands.length > 0) {
        const sel = selectedBrands.map(normalize);
        if (!sel.includes(normalize(p.brand))) return false;
      }

      if (excludeFacet !== "gender" && selectedGender !== "all") {
        if (normalize(p.gender) !== normalize(selectedGender)) return false;
      }

      if (onlyAvailable) {
        const isAvail =
          p.available || p.sizes.some((s) => s.status !== "unavailable");
        if (!isAvail) return false;
      }

      if (excludeFacet !== "price" && priceInitialized) {
        if (p.price < priceRange[0] || p.price > priceRange[1]) return false;
      }

      if (excludeFacet !== "size" && selectedSizes.length > 0) {
        const sel = selectedSizes.map(normalize);
        const hasMatchingSize = p.sizes.some(
          (s) =>
            sel.includes(normalize(s.value)) &&
            (!onlyAvailable || s.status !== "unavailable")
        );
        if (!hasMatchingSize) return false;
      }

      return true;
    },
    [
      selectedCategories,
      selectedBrands,
      selectedGender,
      onlyAvailable,
      priceInitialized,
      priceRange,
      selectedSizes,
    ]
  );

  // Доступные категории и количество товаров в каждой (с учётом других выбранных фильтров)
  const categoryOptions = useMemo(() => {
    const subset = products.filter((p) => matchesFacet(p, "category"));
    const counts = new Map<string, number>();

    for (const p of subset) {
      const cat = (p.category || "").trim();
      if (!cat) continue;
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }

    // Сохраняем уже выбранные категории в списке, чтобы их всегда можно было снять
    for (const sel of selectedCategories) {
      const trimmed = sel.trim();
      if (
        trimmed &&
        !["обувь", "одежда", "товары"].includes(normalize(trimmed)) &&
        !counts.has(trimmed)
      ) {
        counts.set(trimmed, 0);
      }
    }

    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ru"));
  }, [products, matchesFacet, selectedCategories]);

  // Все категории обуви, присутствующие в каталоге (для быстрого чипа «Обувь»)
  const shoeCategoryNames = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      const cat = (p.category || "").trim();
      if (cat && getProductMacroGroup(cat, p.name) === "shoes") {
        set.add(cat);
      }
    }
    return Array.from(set);
  }, [products]);

  const clothingCategoryNames = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      const cat = (p.category || "").trim();
      if (cat && getProductMacroGroup(cat, p.name) === "clothing") {
        set.add(cat);
      }
    }
    return Array.from(set);
  }, [products]);

  const itemCategoryNames = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      const cat = (p.category || "").trim();
      if (cat && getProductMacroGroup(cat, p.name) === "items") {
        set.add(cat);
      }
    }
    return Array.from(set);
  }, [products]);

  // Доступные бренды (только те, которые есть при текущих фильтрах)
  const brandOptions = useMemo(() => {
    const subset = products.filter((p) => matchesFacet(p, "brand"));
    const counts = new Map<string, number>();

    for (const p of subset) {
      const brand = (p.brand || "").trim();
      if (!brand) continue;
      counts.set(brand, (counts.get(brand) ?? 0) + 1);
    }

    for (const sel of selectedBrands) {
      if (sel && !counts.has(sel)) counts.set(sel, 0);
    }

    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ru"));
  }, [products, matchesFacet, selectedBrands]);

  // Доступные варианты пола (только те, которые есть при текущих фильтрах)
  const availableGenderOptions = useMemo(() => {
    const subset = products.filter((p) => matchesFacet(p, "gender"));
    const counts = new Map<string, number>();

    for (const p of subset) {
      const g = (p.gender || "").trim();
      if (!g) continue;
      counts.set(normalize(g), (counts.get(normalize(g)) ?? 0) + 1);
    }

    return GENDER_OPTIONS.filter((opt) => {
      if (opt.value === "all") return true;
      if (normalize(selectedGender) === normalize(opt.value)) return true;
      return (counts.get(normalize(opt.value)) ?? 0) > 0;
    }).map((opt) => ({
      ...opt,
      count:
        opt.value === "all"
          ? subset.length
          : (counts.get(normalize(opt.value)) ?? 0),
    }));
  }, [products, matchesFacet, selectedGender]);

  // Размеры, разделённые на 3 группы (Обувь / Одежда / Товары) и отсортированные отдельно!
  // Вычисляются ТОЛЬКО по товарам, подходящим под выбранные Категорию, Бренд, Пол, Цену и Наличие.
  const groupedSizes = useMemo<GroupedSizes>(() => {
    const subset = products.filter((p) => matchesFacet(p, "size"));

    const shoesSet = new Set<string>();
    const clothingSet = new Set<string>();
    const itemsSet = new Set<string>();

    for (const p of subset) {
      for (const s of p.sizes) {
        const val = (s.value || "").trim();
        if (!val) continue;
        if (onlyAvailable && s.status === "unavailable") continue;

        const group = classifySize(val, p.category, p.name);
        if (group === "shoes") shoesSet.add(val);
        else if (group === "clothing") clothingSet.add(val);
        else itemsSet.add(val);
      }
    }

    return {
      shoes: sortSizesByGroup(shoesSet, "shoes"),
      clothing: sortSizesByGroup(clothingSet, "clothing"),
      items: sortSizesByGroup(itemsSet, "items"),
    };
  }, [products, matchesFacet, onlyAvailable]);

  const allAvailableSizes = useMemo(() => {
    return new Set(
      [...groupedSizes.shoes, ...groupedSizes.clothing, ...groupedSizes.items].map(
        normalize
      )
    );
  }, [groupedSizes]);

  // Автоматическая очистка выбранных размеров, которые пропали после переключения категории/пола/бренда
  useEffect(() => {
    if (!productsLoaded || selectedSizes.length === 0) return;
    const validSizes = selectedSizes.filter((s) =>
      allAvailableSizes.has(normalize(s))
    );
    if (validSizes.length !== selectedSizes.length) {
      setSelectedSizes(validSizes);
    }
  }, [
    selectedCategories,
    selectedGender,
    selectedBrands,
    onlyAvailable,
    allAvailableSizes,
    productsLoaded,
    selectedSizes,
  ]);

  const totalAvailableSizesCount =
    groupedSizes.shoes.length +
    groupedSizes.clothing.length +
    groupedSizes.items.length;

  // =========================
  // URL SYNC
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
    apply(
      "priceMin",
      priceRange[0] <= minPrice ? null : String(priceRange[0])
    );
    apply(
      "priceMax",
      priceRange[1] >= maxPrice ? null : String(priceRange[1])
    );

    setSearchParams(next, { replace: true });

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
    const normVal = normalize(value);
    const exists = list.some((item) => normalize(item) === normVal);
    setList(
      exists
        ? list.filter((item) => normalize(item) !== normVal)
        : [...list, value]
    );
  };

  // Переключение макро-группы («Обувь», «Одежда», «Товары») как на WB
  const isMacroGroupActive = (group: SizeGroupKey): boolean => {
    const groupCats =
      group === "shoes"
        ? shoeCategoryNames
        : group === "clothing"
          ? clothingCategoryNames
          : itemCategoryNames;
    const macroLabel =
      group === "shoes" ? "обувь" : group === "clothing" ? "одежда" : "товары";

    if (selectedCategories.some((c) => normalize(c) === macroLabel)) return true;
    if (groupCats.length === 0) return false;
    return groupCats.every((cat) =>
      selectedCategories.some((c) => normalize(c) === normalize(cat))
    );
  };

  const toggleMacroGroup = (group: SizeGroupKey) => {
    const groupCats =
      group === "shoes"
        ? shoeCategoryNames
        : group === "clothing"
          ? clothingCategoryNames
          : itemCategoryNames;
    const macroLabel =
      group === "shoes" ? "Обувь" : group === "clothing" ? "Одежда" : "Товары";

    const active = isMacroGroupActive(group);
    const normGroupCats = new Set([
      ...groupCats.map(normalize),
      normalize(macroLabel),
    ]);

    if (active) {
      setSelectedCategories(
        selectedCategories.filter((c) => !normGroupCats.has(normalize(c)))
      );
    } else {
      const withoutGroup = selectedCategories.filter(
        (c) => !normGroupCats.has(normalize(c))
      );
      const toAdd = groupCats.length > 0 ? groupCats : [macroLabel];
      setSelectedCategories([...withoutGroup, ...toAdd]);
    }
  };

  // =========================
  // FILTER + SORT
  // =========================

  const filtered = useMemo<Product[]>(() => {
    const list = products.filter((p) => matchesFacet(p));

    switch (sort) {
      case "price-asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        list.sort((a, b) => {
          const rA =
            typeof a.rating === "number" && !Number.isNaN(a.rating)
              ? a.rating
              : 0;
          const rB =
            typeof b.rating === "number" && !Number.isNaN(b.rating)
              ? b.rating
              : 0;
          return rB - rA || (b.reviewsCount ?? 0) - (a.reviewsCount ?? 0);
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
  }, [products, matchesFacet, sort]);

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
    setOpenDropdown(null);

    const next = new URLSearchParams(searchParams);
    [
      "category",
      "brand",
      "size",
      "gender",
      "available",
      "priceMin",
      "priceMax",
      "sort",
    ].forEach((key) => next.delete(key));
    setSearchParams(next, { replace: true });
  };

  // =========================
  // PRICE RANGE HANDLERS
  // =========================

  const handlePriceMinChange = (value: number) => {
    const safe = Number.isNaN(value) ? minPrice : value;
    const clamped = Math.max(minPrice, Math.min(safe, priceRange[1]));
    setPriceRange([clamped, priceRange[1]]);
  };

  const handlePriceMaxChange = (value: number) => {
    const safe = Number.isNaN(value) ? maxPrice : value;
    const clamped = Math.min(maxPrice, Math.max(safe, priceRange[0]));
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

  const isPriceFiltered =
    priceInitialized &&
    (priceRange[0] > minPrice || priceRange[1] < maxPrice);

  const activeFilterCount =
    selectedCategories.length +
    selectedBrands.length +
    selectedSizes.length +
    (selectedGender !== "all" ? 1 : 0) +
    (onlyAvailable ? 1 : 0) +
    (isPriceFiltered ? 1 : 0);

  const currentSortLabel =
    SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "По популярности";

  // Отрисовка сгруппированных размеров (Обувь / Одежда / Товары) в компактном стиле WB
  const renderSizeGroups = (compact = false) => {
    const groups: { key: SizeGroupKey; title: string; list: string[] }[] = [
      { key: "shoes", title: SIZE_GROUP_LABELS.shoes, list: groupedSizes.shoes },
      {
        key: "clothing",
        title: SIZE_GROUP_LABELS.clothing,
        list: groupedSizes.clothing,
      },
      { key: "items", title: SIZE_GROUP_LABELS.items, list: groupedSizes.items },
    ].filter((g) => g.list.length > 0);

    if (groups.length === 0) {
      return (
        <p className="text-white/30 text-xs py-2">
          Нет доступных размеров для выбранных фильтров
        </p>
      );
    }

    return (
      <div className="space-y-3.5">
        {groups.map((group) => (
          <div key={group.key}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
                {group.title}
              </span>
              <span className="text-[10px] text-white/25">
                {group.list.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {group.list.map((size) => {
                const active = selectedSizes.some(
                  (s) => normalize(s) === normalize(size)
                );
                return (
                  <button
                    key={`${group.key}-${size}`}
                    type="button"
                    onClick={() =>
                      toggleInArray(size, selectedSizes, setSelectedSizes)
                    }
                    aria-pressed={active}
                    className={`${
                      compact
                        ? "min-w-[2.35rem] h-7 px-2 text-xs"
                        : "min-w-[2.5rem] h-8 px-2.5 text-xs"
                    } inline-flex items-center justify-center rounded-lg font-medium transition-all cursor-pointer border ${
                      active
                        ? "bg-[#a73afd] border-[#a73afd] text-white shadow-sm shadow-purple-950/50"
                        : "bg-white/[0.05] border-white/10 text-white/75 hover:text-white hover:border-white/25 hover:bg-white/10"
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <main className="min-h-screen pt-20 pb-32">
      <div className="w-full px-3 sm:px-5 md:px-8 lg:px-10 xl:px-12 2xl:px-16">
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="pt-6 pb-5 flex flex-wrap items-baseline justify-between gap-3"
        >
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="text-white font-black text-2xl sm:text-3xl md:text-4xl tracking-tight">
              Каталог
            </h1>
            <span className="text-white/35 text-xs sm:text-sm font-medium">
              {filtered.length} товаров
            </span>
          </div>
        </motion.div>

        {/* БЫСТРЫЕ КАТЕГОРИИ В СТИЛЕ WB */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-3">
          <button
            type="button"
            onClick={() => setSelectedCategories([])}
            className={`shrink-0 h-8 px-3.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
              selectedCategories.length === 0
                ? "bg-white text-black border-white"
                : "bg-white/[0.05] text-white/70 border-white/10 hover:text-white hover:border-white/25"
            }`}
          >
            Все товары
          </button>

          {shoeCategoryNames.length > 0 && (
            <button
              type="button"
              onClick={() => toggleMacroGroup("shoes")}
              className={`shrink-0 h-8 px-3.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                isMacroGroupActive("shoes")
                  ? "bg-[#a73afd] text-white border-[#a73afd]"
                  : "bg-white/[0.05] text-white/70 border-white/10 hover:text-white hover:border-white/25"
              }`}
            >
              👟 Обувь
            </button>
          )}

          {clothingCategoryNames.length > 0 && (
            <button
              type="button"
              onClick={() => toggleMacroGroup("clothing")}
              className={`shrink-0 h-8 px-3.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                isMacroGroupActive("clothing")
                  ? "bg-[#a73afd] text-white border-[#a73afd]"
                  : "bg-white/[0.05] text-white/70 border-white/10 hover:text-white hover:border-white/25"
              }`}
            >
              👕 Одежда
            </button>
          )}

          {itemCategoryNames.length > 0 && (
            <button
              type="button"
              onClick={() => toggleMacroGroup("items")}
              className={`shrink-0 h-8 px-3.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                isMacroGroupActive("items")
                  ? "bg-[#a73afd] text-white border-[#a73afd]"
                  : "bg-white/[0.05] text-white/70 border-white/10 hover:text-white hover:border-white/25"
              }`}
            >
              🎮 Товары и аксессуары
            </button>
          )}

          {/* Отдельные подкатегории (например, Кроссовки, Шлепанцы, Ботильоны, Лоферы) */}
          {categoryOptions
            .filter(
              (c) => !["одежда", "товары", "обувь"].includes(normalize(c.name))
            )
            .map((cat) => {
              const active = selectedCategories.some(
                (s) => normalize(s) === normalize(cat.name)
              );
              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() =>
                    toggleInArray(
                      cat.name,
                      selectedCategories,
                      setSelectedCategories
                    )
                  }
                  className={`shrink-0 h-8 px-3.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                    active
                      ? "bg-white text-black border-white"
                      : "bg-white/[0.04] text-white/65 border-white/8 hover:text-white hover:border-white/20"
                  }`}
                >
                  {cat.name}
                  <span className="ml-1.5 opacity-50">{cat.count}</span>
                </button>
              );
            })}
        </div>

        {/* КОМПАКТНАЯ ПАНЕЛЬ ФИЛЬТРОВ КАК НА WILDBERRIES */}
        <div
          ref={filterBarRef}
          className="relative z-30 flex items-center gap-2 flex-wrap py-2 mb-3"
        >
          {/* Кнопка «Все фильтры» */}
          <button
            type="button"
            onClick={() => {
              setOpenDropdown(null);
              setShowAllFilters((v) => !v);
            }}
            className={`h-9 px-3.5 rounded-xl text-xs sm:text-[13px] font-semibold flex items-center gap-2 transition-all cursor-pointer border ${
              showAllFilters || activeFilterCount > 0
                ? "bg-[#a73afd] border-[#a73afd] text-white shadow-md shadow-purple-950/40"
                : "bg-white/[0.07] border-white/10 text-white/85 hover:bg-white/12 hover:text-white"
            }`}
            aria-expanded={showAllFilters}
            aria-label="Фильтры"
          >
            <SlidersHorizontal size={14} />
            <span>Фильтры</span>
            {activeFilterCount > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-white text-black text-[10px] font-extrabold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Выпадающий фильтр: СОРТИРОВКА */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setOpenDropdown((prev) => (prev === "sort" ? null : "sort"))
              }
              className={`h-9 px-3.5 rounded-xl text-xs sm:text-[13px] font-medium flex items-center gap-1.5 transition-all cursor-pointer border ${
                openDropdown === "sort" || sort !== "default"
                  ? "bg-white/15 border-white/30 text-white"
                  : "bg-white/[0.06] border-white/10 text-white/75 hover:text-white hover:bg-white/10"
              }`}
              aria-label="Сортировка товаров"
            >
              <ArrowUpDown size={13} className="text-white/50" />
              <span>{currentSortLabel}</span>
              <ChevronDown
                size={14}
                className={`text-white/40 transition-transform ${
                  openDropdown === "sort" ? "rotate-180" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {openDropdown === "sort" && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 top-full mt-2 w-56 rounded-2xl bg-[#141416] border border-white/15 shadow-2xl p-1.5 z-50"
                >
                  {SORT_OPTIONS.map((opt) => {
                    const active = sort === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setSort(opt.value);
                          setOpenDropdown(null);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-[13px] text-left transition-colors cursor-pointer ${
                          active
                            ? "bg-[#a73afd]/20 text-white font-semibold"
                            : "text-white/70 hover:bg-white/6 hover:text-white"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {active && (
                          <Check size={14} className="text-[#a73afd]" />
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Выпадающий фильтр: КАТЕГОРИЯ */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setOpenDropdown((prev) =>
                  prev === "category" ? null : "category"
                )
              }
              className={`h-9 px-3.5 rounded-xl text-xs sm:text-[13px] font-medium flex items-center gap-1.5 transition-all cursor-pointer border ${
                selectedCategories.length > 0
                  ? "bg-white text-black border-white font-semibold"
                  : openDropdown === "category"
                    ? "bg-white/15 border-white/30 text-white"
                    : "bg-white/[0.06] border-white/10 text-white/75 hover:text-white hover:bg-white/10"
              }`}
            >
              <span>
                Категория
                {selectedCategories.length > 0
                  ? `: ${selectedCategories.length}`
                  : ""}
              </span>
              <ChevronDown
                size={14}
                className={`opacity-60 transition-transform ${
                  openDropdown === "category" ? "rotate-180" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {openDropdown === "category" && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 top-full mt-2 w-64 rounded-2xl bg-[#141416] border border-white/15 shadow-2xl p-3 z-50"
                >
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                      Категории
                    </span>
                    {selectedCategories.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedCategories([])}
                        className="text-[11px] text-[#b966ff] hover:underline cursor-pointer"
                      >
                        Сбросить
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 max-h-60 overflow-y-auto pr-1">
                    {categoryOptions.map(({ name: category, count }) => {
                      const active = selectedCategories.some(
                        (c) => normalize(c) === normalize(category)
                      );
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
                          className={`flex items-center justify-between gap-2 text-left text-xs sm:text-[13px] px-2.5 py-2 rounded-xl transition-all cursor-pointer ${
                            active
                              ? "bg-[#a73afd]/20 text-white font-medium"
                              : "text-white/70 hover:text-white hover:bg-white/6"
                          }`}
                        >
                          <span className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`w-4 h-4 rounded-[5px] border flex items-center justify-center shrink-0 transition-colors ${
                                active
                                  ? "bg-[#a73afd] border-[#a73afd]"
                                  : "border-white/25"
                              }`}
                            >
                              {active && (
                                <Check
                                  size={11}
                                  strokeWidth={3}
                                  className="text-white"
                                />
                              )}
                            </span>
                            <span className="truncate">{category}</span>
                          </span>
                          <span className="text-[11px] text-white/35 shrink-0">
                            {count}
                          </span>
                        </button>
                      );
                    })}
                    {categoryOptions.length === 0 && (
                      <p className="text-white/30 text-xs py-2 px-1">
                        Нет доступных категорий
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Выпадающий фильтр: РАЗМЕР (разделён на Обувь / Одежда / Товары) */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setOpenDropdown((prev) => (prev === "size" ? null : "size"))
              }
              className={`h-9 px-3.5 rounded-xl text-xs sm:text-[13px] font-medium flex items-center gap-1.5 transition-all cursor-pointer border ${
                selectedSizes.length > 0
                  ? "bg-white text-black border-white font-semibold"
                  : openDropdown === "size"
                    ? "bg-white/15 border-white/30 text-white"
                    : "bg-white/[0.06] border-white/10 text-white/75 hover:text-white hover:bg-white/10"
              }`}
            >
              <span>
                Размер
                {selectedSizes.length > 0
                  ? `: ${selectedSizes.slice(0, 2).join(", ")}${
                      selectedSizes.length > 2
                        ? ` +${selectedSizes.length - 2}`
                        : ""
                    }`
                  : ""}
              </span>
              <ChevronDown
                size={14}
                className={`opacity-60 transition-transform ${
                  openDropdown === "size" ? "rotate-180" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {openDropdown === "size" && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 top-full mt-2 w-72 sm:w-80 rounded-2xl bg-[#141416] border border-white/15 shadow-2xl p-3.5 z-50 max-h-80 overflow-y-auto"
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                      Доступные размеры ({totalAvailableSizesCount})
                    </span>
                    {selectedSizes.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedSizes([])}
                        className="text-[11px] text-[#b966ff] hover:underline cursor-pointer"
                      >
                        Сбросить
                      </button>
                    )}
                  </div>
                  {renderSizeGroups(true)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Выпадающий фильтр: ПОЛ */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setOpenDropdown((prev) => (prev === "gender" ? null : "gender"))
              }
              className={`h-9 px-3.5 rounded-xl text-xs sm:text-[13px] font-medium flex items-center gap-1.5 transition-all cursor-pointer border ${
                selectedGender !== "all"
                  ? "bg-white text-black border-white font-semibold"
                  : openDropdown === "gender"
                    ? "bg-white/15 border-white/30 text-white"
                    : "bg-white/[0.06] border-white/10 text-white/75 hover:text-white hover:bg-white/10"
              }`}
            >
              <span>
                {selectedGender === "all" ? "Пол" : selectedGender}
              </span>
              <ChevronDown
                size={14}
                className={`opacity-60 transition-transform ${
                  openDropdown === "gender" ? "rotate-180" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {openDropdown === "gender" && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 top-full mt-2 w-56 rounded-2xl bg-[#141416] border border-white/15 shadow-2xl p-2 z-50"
                >
                  {availableGenderOptions.map((opt) => {
                    const active = selectedGender === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setSelectedGender(opt.value);
                          setOpenDropdown(null);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-[13px] text-left transition-colors cursor-pointer ${
                          active
                            ? "bg-[#a73afd]/20 text-white font-semibold"
                            : "text-white/70 hover:bg-white/6 hover:text-white"
                        }`}
                      >
                        <span>{opt.label}</span>
                        <span className="text-[11px] text-white/35">
                          {opt.count}
                        </span>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Выпадающий фильтр: БРЕНД */}
          {brandOptions.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setOpenDropdown((prev) => (prev === "brand" ? null : "brand"))
                }
                className={`h-9 px-3.5 rounded-xl text-xs sm:text-[13px] font-medium flex items-center gap-1.5 transition-all cursor-pointer border ${
                  selectedBrands.length > 0
                    ? "bg-white text-black border-white font-semibold"
                    : openDropdown === "brand"
                      ? "bg-white/15 border-white/30 text-white"
                      : "bg-white/[0.06] border-white/10 text-white/75 hover:text-white hover:bg-white/10"
                }`}
              >
                <span>
                  Бренд
                  {selectedBrands.length > 0
                    ? `: ${selectedBrands.length}`
                    : ""}
                </span>
                <ChevronDown
                  size={14}
                  className={`opacity-60 transition-transform ${
                    openDropdown === "brand" ? "rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {openDropdown === "brand" && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-full mt-2 w-60 rounded-2xl bg-[#141416] border border-white/15 shadow-2xl p-3 z-50"
                  >
                    <div className="flex items-center justify-between mb-2 px-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                        Бренды
                      </span>
                      {selectedBrands.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedBrands([])}
                          className="text-[11px] text-[#b966ff] hover:underline cursor-pointer"
                        >
                          Сбросить
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 max-h-56 overflow-y-auto pr-1">
                      {brandOptions.map(({ name: brand, count }) => {
                        const active = selectedBrands.some(
                          (b) => normalize(b) === normalize(brand)
                        );
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
                            className={`flex items-center justify-between gap-2 text-left text-xs sm:text-[13px] px-2.5 py-2 rounded-xl transition-all cursor-pointer ${
                              active
                                ? "bg-[#a73afd]/20 text-white font-medium"
                                : "text-white/70 hover:text-white hover:bg-white/6"
                            }`}
                          >
                            <span className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`w-4 h-4 rounded-[5px] border flex items-center justify-center shrink-0 transition-colors ${
                                  active
                                    ? "bg-[#a73afd] border-[#a73afd]"
                                    : "border-white/25"
                                }`}
                              >
                                {active && (
                                  <Check
                                    size={11}
                                    strokeWidth={3}
                                    className="text-white"
                                  />
                                )}
                              </span>
                              <span className="truncate">{brand}</span>
                            </span>
                            <span className="text-[11px] text-white/35 shrink-0">
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Выпадающий фильтр: ЦЕНА */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setOpenDropdown((prev) => (prev === "price" ? null : "price"))
              }
              className={`h-9 px-3.5 rounded-xl text-xs sm:text-[13px] font-medium flex items-center gap-1.5 transition-all cursor-pointer border ${
                isPriceFiltered
                  ? "bg-white text-black border-white font-semibold"
                  : openDropdown === "price"
                    ? "bg-white/15 border-white/30 text-white"
                    : "bg-white/[0.06] border-white/10 text-white/75 hover:text-white hover:bg-white/10"
              }`}
            >
              <span>
                {isPriceFiltered
                  ? `${priceRange[0].toLocaleString("ru-RU")} – ${priceRange[1].toLocaleString("ru-RU")} ₽`
                  : "Цена, ₽"}
              </span>
              <ChevronDown
                size={14}
                className={`opacity-60 transition-transform ${
                  openDropdown === "price" ? "rotate-180" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {openDropdown === "price" && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 top-full mt-2 w-72 rounded-2xl bg-[#141416] border border-white/15 shadow-2xl p-4 z-50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                      Цена, ₽
                    </span>
                    {isPriceFiltered && (
                      <button
                        type="button"
                        onClick={() => setPriceRange([minPrice, maxPrice])}
                        className="text-[11px] text-[#b966ff] hover:underline cursor-pointer"
                      >
                        Сбросить
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 mb-3">
                    <div>
                      <span className="text-[10px] text-white/35 block mb-1">
                        От
                      </span>
                      <input
                        type="number"
                        min={minPrice}
                        max={priceRange[1]}
                        value={priceRange[0]}
                        onChange={(e) =>
                          handlePriceMinChange(Number(e.target.value))
                        }
                        className="w-full bg-white/6 border border-white/12 text-white text-xs px-2.5 py-2 rounded-xl outline-none focus:border-[#a73afd]"
                        aria-label="Минимальная цена"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-white/35 block mb-1">
                        До
                      </span>
                      <input
                        type="number"
                        min={priceRange[0]}
                        max={maxPrice}
                        value={priceRange[1]}
                        onChange={(e) =>
                          handlePriceMaxChange(Number(e.target.value))
                        }
                        className="w-full bg-white/6 border border-white/12 text-white text-xs px-2.5 py-2 rounded-xl outline-none focus:border-[#a73afd]"
                        aria-label="Максимальная цена"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-white/30 text-[11px] w-5">от</span>
                      <input
                        type="range"
                        min={minPrice}
                        max={maxPrice}
                        step={1}
                        value={priceRange[0]}
                        onChange={handleMinRangeInput}
                        className="flex-1 accent-[#a73afd]"
                        aria-label="Минимальная цена (ползунок)"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white/30 text-[11px] w-5">до</span>
                      <input
                        type="range"
                        min={minPrice}
                        max={maxPrice}
                        step={1}
                        value={priceRange[1]}
                        onChange={handleMaxRangeInput}
                        className="flex-1 accent-[#a73afd]"
                        aria-label="Максимальная цена (ползунок)"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Быстрый переключатель «Только в наличии» */}
          <button
            type="button"
            onClick={() => setOnlyAvailable((v) => !v)}
            aria-pressed={onlyAvailable}
            className={`h-9 px-3.5 rounded-xl text-xs sm:text-[13px] font-medium flex items-center gap-1.5 transition-all cursor-pointer border ${
              onlyAvailable
                ? "bg-white text-black border-white font-semibold"
                : "bg-white/[0.06] border-white/10 text-white/75 hover:text-white hover:bg-white/10"
            }`}
          >
            <span>В наличии</span>
          </button>

          {/* Кнопка быстрого сброса, если что-то выбрано */}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="h-9 px-3 rounded-xl text-xs text-white/50 hover:text-white hover:bg-white/8 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Сбросить все</span>
            </button>
          )}
        </div>

        {/* АКТИВНЫЕ ЧИПЫ ВЫБРАННЫХ ФИЛЬТРОВ (КАК НА WB) */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mb-5">
            {selectedCategories.map((cat) => (
              <span
                key={`cat-${cat}`}
                className="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1.5 rounded-lg bg-white/10 border border-white/12 text-xs text-white"
              >
                <span>{cat}</span>
                <button
                  type="button"
                  onClick={() =>
                    toggleInArray(
                      cat,
                      selectedCategories,
                      setSelectedCategories
                    )
                  }
                  className="w-4 h-4 rounded hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white"
                  aria-label={`Убрать категорию ${cat}`}
                >
                  <X size={11} />
                </button>
              </span>
            ))}

            {selectedSizes.map((size) => (
              <span
                key={`size-${size}`}
                className="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1.5 rounded-lg bg-[#a73afd]/20 border border-[#a73afd]/40 text-xs text-white"
              >
                <span>Размер: {size}</span>
                <button
                  type="button"
                  onClick={() =>
                    toggleInArray(size, selectedSizes, setSelectedSizes)
                  }
                  className="w-4 h-4 rounded hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white"
                  aria-label={`Убрать размер ${size}`}
                >
                  <X size={11} />
                </button>
              </span>
            ))}

            {selectedGender !== "all" && (
              <span className="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1.5 rounded-lg bg-white/10 border border-white/12 text-xs text-white">
                <span>Пол: {selectedGender}</span>
                <button
                  type="button"
                  onClick={() => setSelectedGender("all")}
                  className="w-4 h-4 rounded hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white"
                  aria-label="Сбросить пол"
                >
                  <X size={11} />
                </button>
              </span>
            )}

            {selectedBrands.map((brand) => (
              <span
                key={`brand-${brand}`}
                className="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1.5 rounded-lg bg-white/10 border border-white/12 text-xs text-white"
              >
                <span>{brand}</span>
                <button
                  type="button"
                  onClick={() =>
                    toggleInArray(brand, selectedBrands, setSelectedBrands)
                  }
                  className="w-4 h-4 rounded hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white"
                  aria-label={`Убрать бренд ${brand}`}
                >
                  <X size={11} />
                </button>
              </span>
            ))}

            {onlyAvailable && (
              <span className="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1.5 rounded-lg bg-white/10 border border-white/12 text-xs text-white">
                <span>В наличии</span>
                <button
                  type="button"
                  onClick={() => setOnlyAvailable(false)}
                  className="w-4 h-4 rounded hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white"
                  aria-label="Сбросить фильтр наличия"
                >
                  <X size={11} />
                </button>
              </span>
            )}

            {isPriceFiltered && (
              <span className="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1.5 rounded-lg bg-white/10 border border-white/12 text-xs text-white">
                <span>
                  {priceRange[0].toLocaleString("ru-RU")} –{" "}
                  {priceRange[1].toLocaleString("ru-RU")} ₽
                </span>
                <button
                  type="button"
                  onClick={() => setPriceRange([minPrice, maxPrice])}
                  className="w-4 h-4 rounded hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white"
                  aria-label="Сбросить фильтр цены"
                >
                  <X size={11} />
                </button>
              </span>
            )}
          </div>
        )}

        {/* БОКОВОЕ КОМПАКТНОЕ ОКНО «ВСЕ ФИЛЬТРЫ» КАК НА WILDBERRIES */}
        <AnimatePresence>
          {showAllFilters && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[250] flex justify-start"
            >
              {/* Задний фон */}
              <div
                className="absolute inset-0 bg-black/75 backdrop-blur-sm"
                onClick={() => setShowAllFilters(false)}
                aria-hidden="true"
              />

              {/* Сама панель фильтров — не растянутая, компактная (w-full max-w-[360px]) */}
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 340, damping: 34 }}
                className="relative z-10 w-full max-w-[360px] h-full bg-[#101012] border-r border-white/10 flex flex-col shadow-2xl"
                aria-label="Все фильтры"
              >
                {/* Шапка */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal size={16} className="text-[#a73afd]" />
                    <h2 className="text-white font-bold text-base">Фильтры</h2>
                    {activeFilterCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-[#a73afd]/20 text-[#c98bff] text-xs font-bold">
                        {activeFilterCount}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAllFilters(false)}
                    className="w-8 h-8 rounded-xl bg-white/6 hover:bg-white/12 flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
                    aria-label="Закрыть фильтры"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Прокручиваемое содержимое фильтров */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 overscroll-contain">
                  {/* КАТЕГОРИЯ */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-white/50">
                        Категория
                      </span>
                      {selectedCategories.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedCategories([])}
                          className="text-[11px] text-[#b966ff] hover:underline cursor-pointer"
                        >
                          Очистить
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {categoryOptions.map(({ name: category, count }) => {
                        const active = selectedCategories.some(
                          (c) => normalize(c) === normalize(category)
                        );
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
                            className={`h-8 px-3 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer border ${
                              active
                                ? "bg-[#a73afd] border-[#a73afd] text-white"
                                : "bg-white/[0.05] border-white/10 text-white/75 hover:text-white hover:border-white/25"
                            }`}
                          >
                            <span>{category}</span>
                            <span
                              className={`text-[10px] ${
                                active ? "text-white/80" : "text-white/35"
                              }`}
                            >
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* РАЗМЕРЫ (Обувь / Одежда / Товары отдельно!) */}
                  <div className="border-t border-white/8 pt-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-white/50">
                        Размер
                      </span>
                      {selectedSizes.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedSizes([])}
                          className="text-[11px] text-[#b966ff] hover:underline cursor-pointer"
                        >
                          Очистить
                        </button>
                      )}
                    </div>
                    {renderSizeGroups(false)}
                  </div>

                  {/* ПОЛ */}
                  <div className="border-t border-white/8 pt-5">
                    <label className="text-xs font-bold uppercase tracking-wider text-white/50 mb-2.5 block">
                      Пол
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {availableGenderOptions.map((opt) => {
                        const active = selectedGender === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setSelectedGender(opt.value)}
                            className={`h-8 px-3 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                              active
                                ? "bg-[#a73afd] border-[#a73afd] text-white"
                                : "bg-white/[0.05] border-white/10 text-white/70 hover:text-white hover:border-white/25"
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* БРЕНД */}
                  {brandOptions.length > 0 && (
                    <div className="border-t border-white/8 pt-5">
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-white/50">
                          Бренд
                        </span>
                        {selectedBrands.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedBrands([])}
                            className="text-[11px] text-[#b966ff] hover:underline cursor-pointer"
                          >
                            Очистить
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto pr-1">
                        {brandOptions.map(({ name: brand, count }) => {
                          const active = selectedBrands.some(
                            (b) => normalize(b) === normalize(brand)
                          );
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
                              className={`h-8 px-3 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer border ${
                                active
                                  ? "bg-[#a73afd] border-[#a73afd] text-white"
                                  : "bg-white/[0.05] border-white/10 text-white/70 hover:text-white hover:border-white/25"
                              }`}
                            >
                              <span>{brand}</span>
                              <span
                                className={`text-[10px] ${
                                  active ? "text-white/80" : "text-white/35"
                                }`}
                              >
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ЦЕНА */}
                  <div className="border-t border-white/8 pt-5">
                    <label className="text-xs font-bold uppercase tracking-wider text-white/50 mb-2.5 block">
                      Цена:{" "}
                      <span className="text-white font-semibold">
                        {priceRange[0].toLocaleString("ru-RU")} ₽ —{" "}
                        {priceRange[1].toLocaleString("ru-RU")} ₽
                      </span>
                    </label>

                    <div className="grid grid-cols-2 gap-2.5 mb-3">
                      <input
                        type="number"
                        min={minPrice}
                        max={priceRange[1]}
                        value={priceRange[0]}
                        onChange={(e) =>
                          handlePriceMinChange(Number(e.target.value))
                        }
                        className="bg-white/6 border border-white/12 text-white text-xs px-3 py-2 rounded-xl outline-none focus:border-[#a73afd]"
                        aria-label="Минимальная цена"
                      />
                      <input
                        type="number"
                        min={priceRange[0]}
                        max={maxPrice}
                        value={priceRange[1]}
                        onChange={(e) =>
                          handlePriceMaxChange(Number(e.target.value))
                        }
                        className="bg-white/6 border border-white/12 text-white text-xs px-3 py-2 rounded-xl outline-none focus:border-[#a73afd]"
                        aria-label="Максимальная цена"
                      />
                    </div>

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
                          className="flex-1 accent-[#a73afd]"
                          aria-label="Минимальная цена (ползунок)"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white/30 text-[11px] w-6">до</span>
                        <input
                          type="range"
                          min={minPrice}
                          max={maxPrice}
                          step={1}
                          value={priceRange[1]}
                          onChange={handleMaxRangeInput}
                          className="flex-1 accent-[#a73afd]"
                          aria-label="Максимальная цена (ползунок)"
                        />
                      </div>
                    </div>
                  </div>

                  {/* НАЛИЧИЕ */}
                  <div className="border-t border-white/8 pt-5">
                    <label className="flex items-center justify-between text-xs sm:text-sm text-white/80 cursor-pointer">
                      <span>Только товары в наличии</span>
                      <input
                        type="checkbox"
                        checked={onlyAvailable}
                        onChange={() => setOnlyAvailable((v) => !v)}
                        className="w-4 h-4 accent-[#a73afd] rounded"
                      />
                    </label>
                  </div>
                </div>

                {/* Нижняя закреплённая панель кнопок (как на WB) */}
                <div className="p-4 border-t border-white/10 bg-[#101012] flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="h-11 px-4 rounded-xl border border-white/15 bg-white/5 text-white/75 hover:text-white hover:bg-white/10 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Сбросить
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAllFilters(false)}
                    className="flex-1 h-11 rounded-xl bg-[#a73afd] hover:bg-[#9327e8] text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer shadow-lg shadow-purple-950/50"
                  >
                    Показать {filtered.length} товаров
                  </button>
                </div>
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PRODUCTS GRID — адаптивная сетка во всю ширину экрана как у WB */}
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-24"
          >
            <p className="text-white/20 text-6xl mb-6">🔍</p>
            <p className="text-white/50 text-lg font-medium">
              Товары не найдены
            </p>
            <p className="text-white/30 text-sm mt-2 mb-6">
              Попробуйте изменить или сбросить параметры фильтрации
            </p>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#a73afd] text-white text-sm font-semibold hover:bg-[#9327e8] transition-colors cursor-pointer"
              >
                <RotateCcw size={15} />
                Сбросить фильтры
              </button>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 min-[1920px]:grid-cols-7 gap-3 sm:gap-4 md:gap-5 mt-4">
            {filtered.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
