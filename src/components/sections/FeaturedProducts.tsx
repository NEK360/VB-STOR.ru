import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { getFeaturedProducts } from "../../store-data/products";
import ProductCard from "../ui/ProductCard";

export default function FeaturedProducts() {
  const products = getFeaturedProducts();

  return (
    <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6" aria-labelledby="featured-title">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="flex items-end justify-between mb-12"
      >
        <div>
          <p className="text-white/30 text-xs font-medium tracking-[0.3em] uppercase mb-3">Популярное</p>
          <h2 id="featured-title" className="text-white font-black text-4xl md:text-5xl tracking-tight">
            Хиты продаж
          </h2>
        </div>
        <Link
          to="/catalog?filter=featured"
          className="hidden sm:flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors group"
        >
          Смотреть все
          <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </Link>
      </motion.div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {products.map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} />
        ))}
      </div>

      {/* Mobile see all */}
      <div className="sm:hidden mt-8 text-center">
        <Link
          to="/catalog?filter=featured"
          className="inline-flex items-center gap-2 glass text-white text-sm px-6 py-3 rounded-xl"
        >
          Смотреть все хиты
          <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
