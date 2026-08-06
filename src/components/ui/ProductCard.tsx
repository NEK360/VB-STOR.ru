import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Star } from "lucide-react";
import type { Product } from "../../lib/api";
import { formatPrice, reviewsWord } from "../../lib/utils";
import { useFavorites } from "../../hooks/useFavorites";

type Props = {
  product: Product;
  index?: number;
};

export default function ProductCard({ product, index = 0 }: Props) {
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(product.id);
  const image = product.images?.[0];

  const handleFavoriteClick = (event: React.MouseEvent) => {
    // Each card must toggle only its own product id — never a shared/stale id.
    event.preventDefault();
    event.stopPropagation();
    toggle(product.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.4, delay: Math.min(index, 8) * 0.04 }}
      className="group relative"
    >
      <Link
        to={`/product/${product.id}`}
        className="block rounded-2xl overflow-hidden bg-white/5 border border-white/8 hover:border-white/20 transition-all"
      >
        <div className="relative aspect-square bg-white/5 overflow-hidden">
          {image ? (
            <img
              src={image}
              alt={product.name}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/10 text-5xl">📦</div>
          )}

          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {product.isNew && (
              <span className="bg-white text-black text-[10px] font-bold px-2 py-0.5 rounded-lg">NEW</span>
            )}
            {product.isSale && (product.discount ?? 0) > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg">
                -{product.discount}%
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleFavoriteClick}
            className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              fav ? "bg-white text-black" : "bg-black/40 text-white/70 hover:text-white"
            }`}
            aria-label={fav ? "Убрать из избранного" : "Добавить в избранное"}
            aria-pressed={fav}
          >
            <Heart size={14} fill={fav ? "currentColor" : "none"} />
          </button>
        </div>

        <div className="p-4">
          <p className="text-white/30 text-[11px] uppercase tracking-wider mb-1">{product.brand}</p>
          <h3 className="text-white text-sm font-medium leading-snug line-clamp-2 mb-2">{product.name}</h3>

          <div className="flex items-center gap-1 mb-2">
            <Star size={12} className={product.reviewsCount > 0 ? "text-yellow-400 fill-yellow-400" : "text-white/15"} />
            <span className="text-white/50 text-xs">
              {product.reviewsCount > 0 ? `${product.rating} · ${product.reviewsCount} ${reviewsWord(product.reviewsCount)}` : "Нет отзывов"}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-white font-bold text-base">{formatPrice(product.price)}</span>
            {(product.oldPrice ?? 0) > product.price && (
              <span className="text-white/30 text-xs line-through">{formatPrice(product.oldPrice ?? 0)}</span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
