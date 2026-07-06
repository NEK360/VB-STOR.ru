import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, ShoppingBag, Star, ExternalLink } from "lucide-react";
import { type Product } from "../../store-data/products";
import { useFavorites } from "../../hooks/useFavorites";
import { formatPrice } from "../../lib/utils";
import { analytics } from "../../lib/analytics";

interface ProductCardProps {
  product: Product;
  index?: number;
}

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
  const [imgIndex, setImgIndex] = useState(0);
  const [imgLoaded, setImgLoaded] = useState(false);
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(product.id);

  const hasImages = product.images.length > 0;
  const currentImg = hasImages ? product.images[imgIndex] : null;

  const handleFav = (e: React.MouseEvent) => {
    e.preventDefault();
    toggle(product.id);
    analytics.addToFavorites(product.id);
  };

  const handleWBClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (product.wbUrl) {
      analytics.clickWildberries(product.id);
      window.open(product.wbUrl, "_blank");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.07, ease: "easeOut" }}
    >
      <Link
        to={`/catalog/${product.id}`}
        className="group block"
        aria-label={product.name}
        onClick={() => analytics.viewProduct(product.id, product.name, product.price)}
      >
        <div className="relative overflow-hidden rounded-2xl bg-white/4 border border-white/6 transition-all duration-500 group-hover:border-white/15 group-hover:shadow-2xl group-hover:shadow-black/40">
          {/* Image */}
          <div
            className="relative aspect-[3/4] overflow-hidden bg-white/3"
            onMouseEnter={() => product.images[1] && setImgIndex(1)}
            onMouseLeave={() => setImgIndex(0)}
          >
            {currentImg ? (
              <>
                {!imgLoaded && (
                  <div className="absolute inset-0 shimmer" />
                )}
                <motion.img
                  src={currentImg}
                  alt={product.name}
                  loading="lazy"
                  onLoad={() => setImgLoaded(true)}
                  className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-105 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
                  animate={{ opacity: imgLoaded ? 1 : 0 }}
                />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ShoppingBag size={32} className="text-white/10" />
              </div>
            )}

            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-1.5">
              {product.isNew && (
                <span className="bg-white text-black text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                  New
                </span>
              )}
              {product.discount && product.discount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                  -{product.discount}%
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="absolute top-3 right-3 flex flex-col gap-2">
              <button
                onClick={handleFav}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                  fav ? "bg-white text-black" : "bg-black/40 text-white hover:bg-white hover:text-black"
                }`}
                aria-label={fav ? "Убрать из избранного" : "Добавить в избранное"}
              >
                <Heart size={14} fill={fav ? "currentColor" : "none"} />
              </button>
              {product.wbUrl && (
                <button
                  onClick={handleWBClick}
                  className="w-8 h-8 rounded-full bg-black/40 text-white hover:bg-white hover:text-black flex items-center justify-center transition-all duration-200"
                  aria-label="Открыть на Wildberries"
                >
                  <ExternalLink size={12} />
                </button>
              )}
            </div>

            {/* Image dots */}
            {product.images.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                {product.images.slice(0, 5).map((_, i) => (
                  <div
                    key={i}
                    className={`w-1 h-1 rounded-full transition-all ${i === imgIndex ? "bg-white w-3" : "bg-white/30"}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-4">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex-1 min-w-0">
                <p className="text-white/40 text-xs mb-1 uppercase tracking-wider">{product.category}</p>
                <h3 className="text-white text-sm font-medium leading-tight line-clamp-2 group-hover:text-white transition-colors">
                  {product.name}
                </h3>
              </div>
            </div>

            {/* Rating */}
            {product.rating > 0 && (
              <div className="flex items-center gap-1.5 my-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={11}
                      className={star <= Math.round(product.rating) ? "text-yellow-400 fill-yellow-400" : "text-white/15"}
                    />
                  ))}
                </div>
                <span className="text-white/30 text-[11px]">({product.reviewsCount})</span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-white font-bold text-base">{formatPrice(product.price)}</span>
              {product.oldPrice && (
                <span className="text-white/30 text-xs line-through">{formatPrice(product.oldPrice)}</span>
              )}
            </div>

            {/* Availability */}
            <div className="mt-3 flex items-center gap-2">
              {product.available ? (
                <span className="flex items-center gap-1.5 text-emerald-400 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  В наличии
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-white/30 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/20 inline-block" />
                  Нет в наличии
                </span>
              )}
              {product.wbUrl && product.bothAvailable && (
                <span className="text-white/20 text-xs ml-auto">+ WB</span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
