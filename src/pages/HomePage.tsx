import { useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Tag } from "lucide-react";
import Hero from "../components/sections/Hero";
import FeaturedProducts from "../components/sections/FeaturedProducts";
import Advantages from "../components/sections/Advantages";
import ReviewsSection from "../components/sections/ReviewsSection";
import ContactsSection from "../components/sections/ContactsSection";
import ProductCard from "../components/ui/ProductCard";
import { getNewProducts, getSaleProducts } from "../store-data/products";
import { banners } from "../store-data/banners";
import { seo } from "../store-data/seo";

export default function HomePage() {
  const newProducts = getNewProducts().slice(0, 4);
  const saleProducts = getSaleProducts().slice(0, 4);

  useEffect(() => {
    document.title = seo.home.title;
  }, []);

  return (
    <main>
      {/* Hero */}
      <Hero />

      {/* Featured */}
      <FeaturedProducts />

      {/* Banners */}
      <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6" aria-label="Баннеры">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {banners.map((banner, i) => (
            <motion.div
              key={banner.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <Link
                to={banner.href}
                className="group relative block rounded-2xl overflow-hidden aspect-[4/3] bg-white/4 border border-white/6 hover:border-white/15 transition-all"
                aria-label={banner.title}
              >
                {banner.image && (
                  <img
                    src={banner.image}
                    alt={banner.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  {banner.badge && (
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-white/60 border border-white/20 px-2 py-0.5 rounded mb-2">
                      {banner.badge}
                    </span>
                  )}
                  <h3 className="text-white font-bold text-lg">{banner.title}</h3>
                  <p className="text-white/60 text-sm">{banner.subtitle}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* New Products */}
      {newProducts.length > 0 && (
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6" aria-labelledby="new-title">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex items-end justify-between mb-12"
          >
            <div>
              <p className="text-white/30 text-xs font-medium tracking-[0.3em] uppercase mb-3">Только появились</p>
              <h2 id="new-title" className="text-white font-black text-4xl md:text-5xl tracking-tight">
                Новинки
              </h2>
            </div>
            <Link
              to="/catalog?filter=new"
              className="hidden sm:flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors group"
            >
              Все новинки
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {newProducts.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Sale CTA */}
      {saleProducts.length > 0 && (
        <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6" aria-label="Распродажа">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl bg-white/4 border border-white/8 p-8 md:p-12"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-transparent" />
            <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Tag size={18} className="text-red-400" />
                  <span className="text-red-400 text-sm font-bold uppercase tracking-widest">Скидки до 43%</span>
                </div>
                <h2 className="text-white font-black text-3xl md:text-4xl tracking-tight mb-2">
                  Горячая распродажа
                </h2>
                <p className="text-white/40 text-base">
                  Лучшие цены на обувь и аксессуары. Успейте купить.
                </p>
              </div>
              <Link
                to="/sale"
                className="shrink-0 group inline-flex items-center gap-3 bg-white text-black font-semibold px-8 py-4 rounded-2xl hover:bg-white/90 transition-all hover:scale-105"
              >
                Смотреть распродажу
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
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
