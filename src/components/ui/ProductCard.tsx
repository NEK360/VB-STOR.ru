import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Heart, ShoppingCart, Star } from "lucide-react";
import { getReviewsForProduct, type Product } from "../../lib/api";
import { analytics } from "../../lib/analytics";
import { quickAddToCart, useProductCartCount } from "../../lib/cart";
import { toast } from "../../lib/toast";
import { formatPrice, reviewsWord } from "../../lib/utils";
import { useFavorites } from "../../hooks/useFavorites";

type Props = {
  product: Product;
  index?: number;
};

export default function ProductCard({ product, index = 0 }: Props) {
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(product.id);
  const inCartCount = useProductCartCount(product.id);
  const [justAdded, setJustAdded] = useState(false);

  const image = product.images?.[0];

  const productReviews = useMemo(() => getReviewsForProduct(product), [product]);
  const reviewsCount = Math.max(product.reviewsCount || 0, productReviews.length);
  const hasReviews = reviewsCount > 0;
  const ratingValue = product.rating > 0 ? product.rating : 5;
  const latestReview = productReviews[0];

  const hasDiscount = (product.oldPrice ?? 0) > product.price || (product.discount ?? 0) > 0;
  const discountPercent =
    (product.discount ?? 0) > 0
      ? product.discount
      : (product.oldPrice ?? 0) > product.price
        ? Math.round((((product.oldPrice ?? 0) - product.price) / (product.oldPrice ?? 1)) * 100)
        : 0;

  const handleFavoriteClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    toggle(product.id);
  };

  const handleQuickAddToCart = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const result = quickAddToCart(product);
    if (result.status === "added" || result.status === "increased") {
      analytics.addToCart(product.id, product.name, product.price);
      setJustAdded(true);
      window.setTimeout(() => setJustAdded(false), 1100);
      toast.success(
        result.status === "added"
          ? `Добавлено в корзину${result.size ? ` (размер ${result.size})` : ""}`
          : `В корзине: ${result.quantity} шт.`,
        { action: { label: "Корзина", to: "/cart" } }
      );
    } else if (result.status === "max_reached") {
      toast.info(`В корзине уже максимум: ${result.max} шт.`, {
        action: { label: "Корзина", to: "/cart" },
      });
    } else {
      toast.error("Товар временно недоступен");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20px" }}
      transition={{ duration: 0.35, delay: Math.min(index, 8) * 0.03 }}
      className="group relative flex flex-col"
    >
      <Link
        to={`/catalog/${product.id}`}
        className="flex flex-col h-full rounded-2xl transition-all focus:outline-none"
      >
        {/* Фото товара + бейджи + избранное + кнопка корзины в правом нижнем углу */}
        <div className="relative">
          <div className="relative aspect-[3/4] rounded-2xl bg-zinc-900/90 border border-white/8 group-hover:border-white/20 overflow-hidden transition-all">
            {image ? (
              <img
                src={image}
                alt={product.name}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/10 text-5xl">
                📦
              </div>
            )}

            {/* Кнопка Избранное (правый верхний угол, как на WB) */}
            <button
              type="button"
              onClick={handleFavoriteClick}
              className={`absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                fav
                  ? "bg-white text-rose-500 shadow-md"
                  : "bg-black/45 backdrop-blur-md text-white/80 hover:text-white hover:bg-black/65"
              }`}
              aria-label={fav ? "Убрать из избранного" : "Добавить в избранное"}
              aria-pressed={fav}
            >
              <Heart size={15} fill={fav ? "currentColor" : "none"} />
            </button>

            {/* Бейджи скидки и новинки внизу слева на фото (стиль WB) */}
            <div className="absolute bottom-2.5 left-2.5 z-10 flex flex-wrap items-center gap-1">
              {hasDiscount && (discountPercent ?? 0) > 0 && (
                <span className="bg-[#f5226d] text-white text-[11px] font-bold px-1.5 py-0.5 rounded-md leading-none shadow-sm">
                  −{discountPercent}%
                </span>
              )}
              {product.isNew && (
                <span className="bg-white text-black text-[10px] font-extrabold px-1.5 py-0.5 rounded-md leading-none shadow-sm">
                  NEW
                </span>
              )}
            </div>
          </div>

          {/* Маленькая кнопка корзины в правом нижнем углу, немного заходящая на фото товара (как у WB) */}
          <button
            type="button"
            onClick={handleQuickAddToCart}
            aria-label="Добавить в корзину"
            title="В корзину"
            className={`absolute -bottom-3 right-2.5 z-20 w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition-all duration-200 active:scale-90 cursor-pointer border ${
              justAdded
                ? "bg-emerald-500 border-emerald-400 text-white scale-105 shadow-emerald-950/50"
                : inCartCount > 0
                  ? "bg-[#a73afd] border-purple-400/50 text-white hover:bg-[#9327e8] shadow-purple-950/60"
                  : "bg-[#a73afd] border-white/15 text-white hover:bg-[#b554ff] hover:scale-105 shadow-black/60"
            }`}
          >
            {justAdded ? (
              <Check size={16} strokeWidth={2.75} />
            ) : (
              <ShoppingCart size={16} strokeWidth={2.2} />
            )}
            {inCartCount > 0 && !justAdded && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-white text-black text-[10px] font-extrabold flex items-center justify-center shadow">
                {inCartCount}
              </span>
            )}
          </button>
        </div>

        {/* Информация под фото в порядке WB: 1) Цена, 2) Название, 3) В самом низу оценки/отзыв */}
        <div className="pt-2.5 px-1 flex flex-col flex-1">
          {/* 1. ЦЕНА СНАЧАЛА ПОД ФОТО */}
          <div className="flex items-baseline gap-1.5 flex-wrap pr-10">
            <span
              className={`font-extrabold text-base sm:text-[17px] leading-tight tracking-tight ${
                hasDiscount ? "text-[#ff4d8d]" : "text-white"
              }`}
            >
              {formatPrice(product.price)}
            </span>
            {(product.oldPrice ?? 0) > product.price && (
              <span className="text-white/35 text-xs line-through">
                {formatPrice(product.oldPrice ?? 0)}
              </span>
            )}
          </div>

          {/* 2. БРЕНД И НАЗВАНИЕ */}
          <h3 className="mt-1 text-[13px] leading-snug line-clamp-2 text-white/75 group-hover:text-white transition-colors">
            {product.brand && (
              <>
                <span className="font-semibold text-white">{product.brand}</span>
                <span className="text-white/30 mx-1">/</span>
              </>
            )}
            <span>{product.name}</span>
          </h3>

          {/* 3. В САМОМ НИЗУ ОЦЕНКИ И ОТЗЫВЫ (если оценок нет — ничего не выводим) */}
          {hasReviews && (
            <div className="mt-1.5 pt-0.5 flex flex-col gap-1">
              <div className="flex items-center gap-1 text-xs">
                <Star size={12} className="text-amber-400 fill-amber-400 shrink-0" />
                <span className="text-white font-semibold">{ratingValue}</span>
                <span className="text-white/30">·</span>
                <span className="text-white/45">
                  {reviewsCount} {reviewsWord(reviewsCount)}
                </span>
              </div>
              {latestReview?.text && (
                <p className="text-[11px] text-white/60 line-clamp-1 bg-white/[0.04] border border-white/8 rounded-lg px-2 py-1 leading-tight">
                  💬 «{latestReview.text}»
                </p>
              )}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
