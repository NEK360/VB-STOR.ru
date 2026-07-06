import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, X, ChevronDown } from "lucide-react";
import { products, type Product } from "../store-data/products";
import { categories } from "../store-data/categories";
import { seo } from "../store-data/seo";
import ProductCard from "../components/ui/ProductCard";

type SortOption = "default" | "price-asc" | "price-desc" | "rating" | "new";
type FilterType = "all" | "new" | "featured" | "sale";

export default function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState<SortOption>("default");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedGender, setSelectedGender] = useState("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);

  const filterParam = (searchParams.get("filter") || "all") as FilterType;

  useEffect(() => {
    document.title = seo.catalog.title;
  }, []);

  const maxPrice = Math.max(...products.map((p) => p.price));

  const filtered = useMemo<Product[]>(() => {
    let list = [...products];

    // Filter type
    if (filterParam === "new") list = list.filter((p) => p.isNew);
    else if (filterParam === "featured") list = list.filter((p) => p.isFeatured);
    else if (filterParam === "sale") list = list.filter((p) => p.isSale);

    // Category
    if (selectedCategory !== "all") {
      list = list.filter((p) => p.category === selectedCategory);
    }

    // Gender
    if (selectedGender !== "all") {
      list = list.filter((p) => p.gender === selectedGender);
    }

    // Price
    list = list.filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1]);

    // Sort
    switch (sort) {
      case "price-asc": list.sort((a, b) => a.price - b.price); break;
      case "price-desc": list.sort((a, b) => b.price - a.price); break;
      case "rating": list.sort((a, b) => b.rating - a.rating); break;
      case "new": list.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0)); break;
    }

    return list;
  }, [filterParam, selectedCategory, selectedGender, priceRange, sort]);

  const filterTitle: Record<FilterType, string> = {
    all: "Весь каталог",
    new: "Новинки",
    featured: "Хиты продаж",
    sale: "Распродажа",
  };

  const setFilter = (f: FilterType) => {
    if (f === "all") searchParams.delete("filter");
    else searchParams.set("filter", f);
    setSearchParams(searchParams, { replace: true });
  };

  return (
    <main className="min-h-screen pt-20 pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="py-12"
        >
          <p className="text-white/30 text-xs font-medium tracking-[0.3em] uppercase mb-3">VB STORE</p>
          <h1 className="text-white font-black text-4xl md:text-6xl tracking-tight">
            {filterTitle[filterParam]}
          </h1>
          <p className="text-white/30 mt-3 text-sm">{filtered.length} товаров</p>
        </motion.div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto scrollbar-none pb-2">
          {(["all", "new", "featured", "sale"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filterParam === f
                  ? "bg-white text-black"
                  : "bg-white/6 text-white/50 hover:text-white hover:bg-white/10"
              }`}
            >
              {filterTitle[f]}
            </button>
          ))}

          <div className="flex-1" />

          {/* Sort & Filter */}
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="bg-white/6 border border-white/10 text-white/60 text-sm px-3 py-2 rounded-xl outline-none appearance-none pr-8 relative cursor-pointer"
              aria-label="Сортировка"
            >
              <option value="default">По умолчанию</option>
              <option value="price-asc">Цена ↑</option>
              <option value="price-desc">Цена ↓</option>
              <option value="rating">По рейтингу</option>
              <option value="new">Новинки</option>
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

        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="glass rounded-2xl p-6 mb-8 border border-white/8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Category */}
                <div>
                  <label className="text-white/40 text-xs uppercase tracking-wider mb-3 block">Категория</label>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setSelectedCategory("all")}
                      className={`text-left text-sm px-3 py-2 rounded-lg transition-all ${selectedCategory === "all" ? "bg-white/15 text-white" : "text-white/50 hover:text-white hover:bg-white/8"}`}
                    >
                      Все категории
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.slug)}
                        className={`text-left text-sm px-3 py-2 rounded-lg transition-all ${selectedCategory === cat.slug ? "bg-white/15 text-white" : "text-white/50 hover:text-white hover:bg-white/8"}`}
                      >
                        {cat.icon} {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gender */}
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

                {/* Price */}
                <div>
                  <label className="text-white/40 text-xs uppercase tracking-wider mb-3 block">
                    Цена: до {priceRange[1].toLocaleString("ru-RU")} ₽
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={maxPrice}
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([0, Number(e.target.value)])}
                    className="w-full accent-white"
                    aria-label="Максимальная цена"
                  />
                  <div className="flex justify-between text-white/30 text-xs mt-1">
                    <span>0 ₽</span>
                    <span>{maxPrice.toLocaleString("ru-RU")} ₽</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Products Grid */}
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {filtered.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
