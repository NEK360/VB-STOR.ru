import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, RotateCcw } from "lucide-react";
import { seo } from "../store-data/seo";
import ProductCard from "../components/ui/ProductCard";
import { loadProducts, type Product } from "../lib/api";

type SortOption = "default" | "price-asc" | "price-desc" | "rating" | "new";
type FilterType = "all" | "sale";

export default function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState<SortOption>("default");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [selectedSize, setSelectedSize] = useState("all");
  const [selectedGender, setSelectedGender] = useState("all");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
  const [products, setProducts] = useState<Product[]>([]);

  const filterParam = (searchParams.get("filter") || "all") as FilterType;

  useEffect(() => {
    const categoryParam = searchParams.get("category");
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    } else {
      setSelectedCategory("all");
    }
  }, [searchParams]);

  useEffect(() => {
    let isActive = true;

   async function fetchData() {
  try {
    const data = await loadProducts();

    console.log("Получено товаров:", data.length);
    console.log(data);

    if (!isActive) return;

    setProducts(data);
  } catch (e) {
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
useEffect(() => {
  console.log("Products state:", products.length);
}, [products]);
  const maxPrice = useMemo(() => {
    if (products.length === 0) return 100000;
    return Math.max(...products.map((p) => p.price));
  }, [products]);

  const minPrice = useMemo(() => {
    if (products.length === 0) return 0;
    return Math.min(...products.map((p) => p.price));
  }, [products]);

  const brands = useMemo(() => {
    const values = products
      .map((product) => product.brand)
      .filter(Boolean)
      .map((brand) => brand.trim())
      .sort((a, b) => a.localeCompare(b));

    return Array.from(new Set(values));
  }, [products]);

  const sizes = useMemo(() => {
    const values = products
      .flatMap((product) => product.sizes.map((size) => size.value))
      .filter(Boolean)
      .map((size) => size.trim())
      .sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));

    return Array.from(new Set(values));
  }, [products]);
  
  const categories = useMemo(() => {

  const values = products
    .map(product => product.category)
    .filter(Boolean)
    .map(category => category.trim());

  return [...new Set(values)].sort();

}, [products]);

  const filtered = useMemo<Product[]>(() => {
    let list = [...products];

    if (filterParam === "sale") {
      const saleItems = list.filter((p) => p.isSale || (p.discount ?? 0) > 0 || (p.oldPrice ?? 0) > p.price);
      list = saleItems.length > 0 ? saleItems : list;
    }

    const normalize = (value: string) => value.trim().toLowerCase();

    if (selectedCategory !== "all") {

  list = list.filter(
    p => normalize(p.category) === normalize(selectedCategory)
  );

}

    if (selectedBrand !== "all") {
      list = list.filter((p) => normalize(p.brand) === normalize(selectedBrand));
    }

    if (selectedSize !== "all") {
      list = list.filter((p) => p.sizes.some((size) => normalize(size.value) === normalize(selectedSize)));
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
  }, [products, filterParam, selectedCategory, selectedBrand, selectedSize, selectedGender, onlyAvailable, priceRange, sort]);

  const setFilter = (f: FilterType) => {
    const next = new URLSearchParams(searchParams);
    if (f === "all") next.delete("filter");
    else next.set("filter", f);
    setSearchParams(next, { replace: true });
  };

  const handleCategoryChange = (category: string) => {
    const next = new URLSearchParams(searchParams);
    if (category === "all") next.delete("category");
    else next.set("category", category);
    setSearchParams(next, { replace: true });
    setSelectedCategory(category);
  };

  const resetFilters = () => {
    setSelectedCategory("all");
    setSelectedBrand("all");
    setSelectedSize("all");
    setSelectedGender("all");
    setOnlyAvailable(false);
    setPriceRange([minPrice, maxPrice]);
    const next = new URLSearchParams(searchParams);
    next.delete("category");
    next.delete("filter");
    setSearchParams(next, { replace: true });
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
          <p className="text-white/30 text-xs font-medium tracking-[0.3em] uppercase mb-3">VB STORE</p>
        <h1 className="text-white font-black text-4xl md:text-6xl tracking-tight">
  Каталог
</h1>

<p className="text-white/30 mt-3 text-sm">
  {filtered.length} товаров
</p>
        </motion.div>

          <div className="flex-1" />

          <div className="flex items-center gap-2 shrink-0">
           <select
 value={sort}
 onChange={(e)=>setSort(e.target.value as SortOption)}
 className="
 bg-black
 text-white
 border
 border-white/10
 rounded-xl
 px-4
 py-2
 outline-none
 appearance-none
 "
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
                <div>
                  <label className="text-white/40 text-xs uppercase tracking-wider mb-3 block">Категория</label>
                  <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                    <button
  onClick={() => handleCategoryChange("all")}
  className={`text-left text-sm px-3 py-2 rounded-lg transition-all ${
    selectedCategory === "all"
      ? "bg-white/15 text-white"
      : "text-white/50 hover:text-white hover:bg-white/8"
  }`}
>
  Все категории
</button>

{categories.map((category) => (

<button
  key={category}
  onClick={() => handleCategoryChange(category)}
  className={`text-left text-sm px-3 py-2 rounded-lg transition-all ${
    selectedCategory === category
      ? "bg-white/15 text-white"
      : "text-white/50 hover:text-white hover:bg-white/8"
  }`}
>
  {category}
</button>

))}
                  </div>
                </div>

                <div>
                  <label className="text-white/40 text-xs uppercase tracking-wider mb-3 block">Бренд</label>
                  <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                    <button
                      onClick={() => setSelectedBrand("all")}
                      className={`text-left text-sm px-3 py-2 rounded-lg transition-all ${selectedBrand === "all" ? "bg-white/15 text-white" : "text-white/50 hover:text-white hover:bg-white/8"}`}
                    >
                      Все бренды
                    </button>
                    {brands.map((brand) => (
                      <button
                        key={brand}
                        onClick={() => setSelectedBrand(brand)}
                        className={`text-left text-sm px-3 py-2 rounded-lg transition-all ${selectedBrand === brand ? "bg-white/15 text-white" : "text-white/50 hover:text-white hover:bg-white/8"}`}
                      >
                        {brand}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-white/40 text-xs uppercase tracking-wider mb-3 block">Размер</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedSize("all")}
                      className={`text-sm px-3 py-1.5 rounded-lg transition-all ${selectedSize === "all" ? "bg-white text-black" : "bg-white/6 text-white/50 hover:text-white"}`}
                    >
                      Все
                    </button>
                    {sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`text-sm px-3 py-1.5 rounded-lg transition-all ${selectedSize === size ? "bg-white text-black" : "bg-white/6 text-white/50 hover:text-white"}`}
                      >
                        {size}
                      </button>
                    ))}
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
            <p className="text-white/20 text-sm mt-2">Попробуйте изменить фильтры</p>
          </motion.div>
        ) : (
         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mt-8">
            {filtered.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        )}
    </main>
  );
}
