import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Hero from "../components/sections/Hero";
import Advantages from "../components/sections/Advantages";
import ReviewsSection from "../components/sections/ReviewsSection";
import ContactsSection from "../components/sections/ContactsSection";
import ProductCard from "../components/ui/ProductCard";
import { loadProducts, type Product } from "../lib/api";
import { seo } from "../store-data/seo";
// Категории блока миниатюр (Wildberries-стиль)
const CATEGORY_TILES: {
  label: string;
  gender?: string;
  category?: string;
  catalogParam: string;
}[] = [
  { label: "Для мужчин", gender: "Мужской", catalogParam: "gender=Мужской" },
  { label: "Для женщин", gender: "Женский", catalogParam: "gender=Женский" },
  { label: "Для девочек", gender: "Девочки", catalogParam: "gender=Девочки" },
  { label: "Для мальчиков", gender: "Мальчики", catalogParam: "gender=Мальчики" },
  { label: "Товары", category: "Товары", catalogParam: "category=Товары" },
];
function getTopByGender(products: Product[], gender: string, count: number): Product[] {
  const normalize = (s: string) => s.trim().toLowerCase();
  return [...products]
    .filter((p) => normalize(p.gender) === normalize(gender))
    .sort((a, b) => b.price - a.price)
    .slice(0, count);
}

function getTileImage(
  products: Product[],
  tile: { gender?: string; category?: string }
): string {
  const normalize = (s: string) => s.trim().toLowerCase();
  let sorted: Product[] = [];

  if (tile.gender) {
    sorted = [...products]
      .filter((p) => normalize(p.gender) === normalize(tile.gender!))
      .sort((a, b) => b.price - a.price);
  } else if (tile.category) {
    sorted = [...products]
      .filter((p) => normalize(p.category) === normalize(tile.category!))
      .sort((a, b) => b.price - a.price);
  }

  const first = sorted.find((p) => p.images && p.images.length > 0);
  return first?.images?.[0] ?? "";
}
export default function HomePage() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  useEffect(() => {
    let isActive = true;

    async function load() {
      const products = await loadProducts();
      if (!isActive) return;
      setAllProducts(products);
    }

    void load();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    document.title = seo.home.title;
  }, []);

  return (
    <main>
      {/* Hero */}
      <Hero />

      {/* Catalog */}
      {allProducts.length > 0 && (
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6" aria-labelledby="catalog-title">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex items-end justify-between mb-12"
          >
            <div>
              <p className="text-white/30 text-xs font-medium tracking-[0.3em] uppercase mb-3">Весь каталог</p>
              <h2 id="catalog-title" className="text-white font-black text-4xl md:text-5xl tracking-tight">
                Товары
              </h2>
            </div>
            <Link
              to="/catalog"
              className="hidden sm:flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors group"
            >
              Перейти в каталог
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {allProducts.slice(0, 8).map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
          <div className="flex justify-center mt-10 mb-20">
  <Link
    to="/catalog"
    className="
      inline-flex items-center justify-center
      px-8 py-4
      rounded-2xl
      bg-white text-black
      font-bold text-sm
      uppercase tracking-wider
      transition-all
      hover:bg-white/90
      hover:scale-[1.03]
      active:scale-[0.98]
    "
  >
    Смотреть ещё
  </Link>
</div>
          {/* Категории — Wildberries-стиль */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-4"
          >
            <p className="text-white/30 text-xs font-medium tracking-[0.3em] uppercase mb-6">
              Категории
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {CATEGORY_TILES.map((tile, i) => {
                const img = tileImages[i];
                return (
                  <motion.div
                    key={tile.label}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: i * 0.07 }}
                  >
                    <Link
                      to={`/catalog?${tile.catalogParam}`}
                      className="group flex flex-col items-center gap-3"
                    >
                      <div className="w-full aspect-square rounded-2xl overflow-hidden bg-white/5 border border-white/8 group-hover:border-white/25 transition-all">
                        {img ? (
                          <img
                            src={img}
                            alt={tile.label}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/10 text-4xl">
                            👕
                          </div>
                        )}
                      </div>
                      <span className="text-white/70 text-sm font-medium text-center group-hover:text-white transition-colors">
                        {tile.label}
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </section>
      )}

      {/* Advantages */}
      <Advantages />

      {/* Reviews */}
      <ReviewsSection />

      {/* Contacts */}
      <ContactsSection />
    </main>
  );
}
