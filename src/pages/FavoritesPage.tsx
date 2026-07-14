import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Heart, ArrowRight } from "lucide-react";
import { useFavorites } from "../hooks/useFavorites";
import { getProductById, type Product } from "../lib/api";
import ProductCard from "../components/ui/ProductCard";

export default function FavoritesPage() {
  const { favorites } = useFavorites();
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([]);

  useEffect(() => {
    let isActive = true;

    async function load() {
      const products = await Promise.all(
        favorites.map((id) => getProductById(id))
      );

      if (!isActive) return;

      setFavoriteProducts(
        products.filter((product): product is Product => Boolean(product))
      );
    }

    void load();

    return () => {
      isActive = false;
    };
  }, [favorites]);

  useEffect(() => {
    document.title = "Избранное — VB STORE";
  }, []);

  return (
    <main className="min-h-screen pt-20 pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="py-12"
        >
          <div className="flex items-center gap-3 mb-4">
            <Heart size={28} className="text-white/60" />
          </div>
          <h1 className="text-white font-black text-4xl md:text-6xl tracking-tight mb-2">
            Избранное
          </h1>
          <p className="text-white/30 text-sm">{favoriteProducts.length} товаров</p>
        </motion.div>

        {favoriteProducts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-24"
          >
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
              <Heart size={32} className="text-white/20" />
            </div>
            <p className="text-white/40 text-xl mb-2">Список избранного пуст</p>
            <p className="text-white/20 text-sm mb-8">Добавляйте товары, нажимая на ♡</p>
            <Link
              to="/catalog"
              className="inline-flex items-center gap-2 bg-white text-black font-semibold px-8 py-4 rounded-2xl hover:bg-white/90 transition-all"
            >
              Перейти в каталог
              <ArrowRight size={18} />
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {favoriteProducts.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
