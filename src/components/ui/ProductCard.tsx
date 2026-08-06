import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, Heart } from "lucide-react";
import type { Product } from "../../lib/api";
import { formatPrice } from "../../lib/utils";
import { useFavorites } from "../../hooks/useFavorites";

interface Props {
  product: Product;
  index?: number;
}

export default function ProductCard({ product, index = 0 }: Props) {
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(product.id);

  const firstImage = Array.isArray(product.images)
    ? product.images[0]
    : typeof product.images === "string"
      ? (product.images as string).split(";")[0]?.trim()
      : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className="group relative"
    >
      <Link to={`/product/${product.id}`} className="block">
        <div className="relative aspect-square rounded-2xl overflow-hidden bg-white/5 border border-white/8 mb-3">
          {firstImage ? (
            <img
              src={firstImage}
              alt={product.name}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl text-white/10">
              📦
            </div>
          )}

          {product.isNew && (
            <span className="absolute top-3 left-3 bg-white text-black text-[10px] font-bold px-2 py-0.5 rounded-md">
              NEW
            </span>
          )}
          {product.isSale && product.discount && product.discount > 0 && (
            <span className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
              -{product.discount}%
            </span>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-white/30 text-[11px] uppercase tracking-wider">
            {product.brand}
          </p>
          <p className="text-white text-sm font-medium leading-snug line-clamp-2">
            {product.name}
          </p>

          {product.reviewsCount > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={10}
                    className={
                      s <= Math.round(product.rating)
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-white/15"
                    }
                  />
                ))}
              </div>
              <span className="text-white/30 text-[11px]">
                {product.reviewsCount}
              </span>
            </div>
          )}

          <p className="text-white font-bold text-base">
            {formatPrice(product.price)}
          </p>
        </div>
      </Link>

      <button
        onClick={(e) => {
          e.preventDefault();
          toggle(product.id);
        }}
        className={`absolute top-3 right-3 w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
          fav
            ? "bg-white border-white text-black"
            : "bg-black/40 border-white/20 text-white/50 hover:text-white hover:border-white/50"
        }`}
        aria-label={fav ? "Убрать из избранного" : "Добавить в избранное"}
      >
        <Heart size={13} fill={fav ? "currentColor" : "none"} />
      </button>
    </motion.div>
  );
}
