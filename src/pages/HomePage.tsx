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
