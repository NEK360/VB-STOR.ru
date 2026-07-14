import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Tag } from "lucide-react";
import { loadProducts, type Product } from "../lib/api";
import { seo } from "../store-data/seo";
import ProductCard from "../components/ui/ProductCard";

export default function SalePage() {
  const [saleProducts, setSaleProducts] = useState<Product[]>([]);

  useEffect(() => {
    let isActive = true;

    async function load() {
      const products = await loadProducts();

      if (!isActive) return;

      const saleItems = products.filter(
        (product) => product.isSale || (product.discount ?? 0) > 0 || (product.oldPrice ?? 0) > product.price
      );

      setSaleProducts(saleItems.length > 0 ? saleItems : products.slice(0, 20));
    }

    void load();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    document.title = seo.sale.title;
  }, []);

  return (
    <main className="min-h-screen pt-20 pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="py-12"
        >
          <div className="flex items-center gap-3 mb-4">
            <Tag size={28} className="text-red-400" />
            <p className="text-red-400 text-sm font-bold uppercase tracking-[0.3em]">Скидки до 43%</p>
          </div>
          <h1 className="text-white font-black text-4xl md:text-6xl tracking-tight mb-4">
            Распродажа
          </h1>
          <p className="text-white/40 text-base max-w-lg">
            Лучшие цены на обувь и аксессуары. Успейте купить по выгодным ценам — предложение ограничено.
          </p>
        </motion.div>

        {/* Sale Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative overflow-hidden rounded-3xl bg-white/4 border border-red-500/15 p-8 mb-12"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/8 to-transparent" />
          <div className="relative">
            <div className="flex flex-wrap gap-6 items-center">
              {[43, 42, 39].map((discount, i) => (
                <div key={i} className="text-center">
                  <div className="text-red-400 font-black text-5xl">-{discount}%</div>
                  <div className="text-white/30 text-xs mt-1">скидка</div>
                </div>
              ))}
              <div className="flex-1">
                <p className="text-white font-bold text-xl mb-1">Горячие предложения</p>
                <p className="text-white/40 text-sm">Ботильоны, лоферы, джинсы и аксессуары</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Products */}
        {saleProducts.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-white/20 text-6xl mb-6">🏷️</p>
            <p className="text-white/40 text-lg">Распродажа временно недоступна</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {saleProducts.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
