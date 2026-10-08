import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Heart, ShoppingCart, Star, Truck } from "lucide-react";
import { getReviewsForProduct, type Product } from "../../lib/api";
import { analytics } from "../../lib/analytics";
import { addToCart, useProductCartCount } from "../../lib/cart";
import { hasSizes, isProductOrderable } from "../../lib/stock";
import { toast } from "../../lib/toast";
import { formatPrice, reviewsWord } from "../../lib/utils";
import { useFavorites } from "../../hooks/useFavorites";
import SizeSheet from "./SizeSheet";

type Props = {
  product: Product;
  index?: number;
};

export default function ProductCard({ product, index = 0 }: Props) {
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(product.id);
  const inCartCount = useProductCartCount(product.id);
  const [justAdded, setJustAdded] = useState(false);
  const [sizeSheetOpen, setSizeSheetOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const image = product.images?.[0];
  const orderable = isProductOrderable(product);

  const productReviews = useMemo(() => getReviewsForProduct(product), [product]);
  const reviewsCount = Math.max(product.reviewsCount || 0, productReviews.length);
  const hasReviews = reviewsCount > 0;
  const ratingValue = product.rating > 0 ? product.rating : 5;
  const latestReview = productReviews[0];

  const hasDiscount = (product.oldPrice ?? 0) > product.price || (product.discount ?? 0) > 0;
  const discountPercent =
    (product.discount ?? 0) > 0
      ? product.discount ?? 0
      : (product.oldPrice ?? 0) > product.price
        ? Math.round((((product.oldPrice ?? 0) - product.price) / (product.oldPrice ?? 1)) * 100)
        : 0;

  const handleFavoriteClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    toggle(product.id);
  };

  const addSelectedToCart = (size: string | null) => {
    const result = addToCart(product, {
      size,
      color: product.colors?.[0]?.name ?? null,
      quantity: 1,
    });

    if (result.status === "added" || result.status === "increased") {
      analytics.addToCart(product.id, product.name, product.price);
      setJustAdded(true);
      window.setTimeout(() => setJustAdded(false), 1100);
      toast.success(
        result.status === "added"
          ? `Добавлено в корзину${size ? ` (размер ${size})` : ""}`
          : `В корзине: ${result.quantity} шт.`,
        { action: { label: "Корзина", to: "/cart" } }
      );
    } else if (result.status === "max_reached") {
      toast.info(`В корзине уже максимум: ${result.max} шт.`, {
        action: { label: "Корзина", to: "/cart" },
      });
    } else if (result.status === "size_required") {
      setSizeSheetOpen(true);
    } else {
      toast.error("Товар временно недоступен для заказа на сайте");
    }
  };

  const handleCartClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!orderable) {
      toast.info("Этот товар сейчас нельзя заказать на сайте");
      return;
    }
    if (hasSizes(product)) {
      setSizeSheetOpen(true);
      return;
    }
    addSelectedToCart(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20px" }}
      transition={{ duration: 0.35, delay: Math.min(index, 8) * 0.03 }}
      className="group relative flex flex-col"
    >
      <div className="relative">
        <Link
          to={`/catalog/${product.id}`}
          className="relative block aspect-[3/4] overflow-hidden rounded-2xl border border-white/8 bg-zinc-900/90 transition-all group-hover:border-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          aria-label={`Открыть товар: ${product.name}`}
        >
          {image ? (
            <img
              src={image}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-5xl text-white/10">📦</div>
          )}
        </Link>

        {/* Избранное */}
        <button
          type="button"
          onClick={handleFavoriteClick}
          className={`absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full transition-all ${
            fav
              ? "bg-white text-rose-500 shadow-md"
              : "bg-black/45 text-white/80 backdrop-blur-md hover:bg-black/65 hover:text-white"
          }`}
          aria-label={fav ? "Убрать из избранного" : "Добавить в избранное"}
          aria-pressed={fav}
        >
          <Heart size={15} fill={fav ? "currentColor" : "none"} />
        </button>

        {/* Бейджи скидки и новинки */}
        <div className="pointer-events-none absolute bottom-2.5 left-2.5 z-10 flex flex-wrap items-center gap-1">
          {hasDiscount && discountPercent > 0 && (
            <span className="rounded-md bg-[#f5226d] px-1.5 py-0.5 text-[11px] font-bold leading-none text-white shadow-sm">
              −{discountPercent}%
            </span>
          )}
          {product.isNew && (
            <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-black shadow-sm">
              NEW
            </span>
          )}
        </div>
      </div>

      {/* Широкая WB-подобная кнопка. Размер выбирается в шторке до добавления. */}
      <button
        type="button"
        onClick={handleCartClick}
        disabled={!orderable}
        aria-label={hasSizes(product) ? "Выбрать размер и добавить в корзину" : "Добавить в корзину"}
        className={`relative mt-2 flex min-h-[50px] w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left shadow-lg transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40 ${
          justAdded
            ? "bg-emerald-600 text-white"
            : orderable
              ? "bg-[#cb11ab] text-white hover:bg-[#b80f9a]"
              : ""
        }`}
      >
        {justAdded ? <Check size={18} strokeWidth={2.75} /> : <ShoppingCart size={18} />}
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="text-[13px] font-bold">
            {!orderable ? "Нет в наличии" : justAdded ? "Добавлено" : "В корзину"}
          </span>
          <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium text-white/75">
            <Truck size={11} /> Доставка — Завтра
          </span>
        </span>
        {inCartCount > 0 && !justAdded && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[10px] font-extrabold text-[#8f0b79]">
            {inCartCount}
          </span>
        )}
      </button>

      {/* Информация в карточке */}
      <div className="flex flex-1 flex-col px-1 pt-2.5">
        <Link to={`/catalog/${product.id}`} className="rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50">
          <div className="flex flex-wrap items-baseline gap-1.5 pr-2">
            <span
              className={`text-base font-extrabold leading-tight tracking-tight sm:text-[17px] ${
                hasDiscount ? "text-[#ff4d8d]" : "text-white"
              }`}
            >
              {formatPrice(product.price)}
            </span>
            {(product.oldPrice ?? 0) > product.price && (
              <span className="text-xs text-white/35 line-through">{formatPrice(product.oldPrice ?? 0)}</span>
            )}
          </div>
          <h3 className="mt-1 line-clamp-2 text-[13px] leading-snug text-white/75 transition-colors group-hover:text-white">
            {product.brand && (
              <>
                <span className="font-semibold text-white">{product.brand}</span>
                <span className="mx-1 text-white/30">/</span>
              </>
            )}
            <span>{product.name}</span>
          </h3>
        </Link>

        {hasReviews && (
          <div className="mt-1.5 flex flex-col gap-1 pt-0.5">
            <div className="flex items-center gap-1 text-xs">
              <Star size={12} className="shrink-0 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-white">{ratingValue}</span>
              <span className="text-white/30">·</span>
              <span className="text-white/45">
                {reviewsCount} {reviewsWord(reviewsCount)}
              </span>
            </div>
            {latestReview?.text && (
              <p className="line-clamp-1 rounded-lg border border-white/8 bg-white/[0.04] px-2 py-1 text-[11px] leading-tight text-white/60">
                💬 «{latestReview.text}»
              </p>
            )}
          </div>
        )}
      </div>

      <SizeSheet
        open={sizeSheetOpen}
        product={product}
        selectedSize={selectedSize}
        onClose={() => setSizeSheetOpen(false)}
        onSelect={(size) => {
          setSelectedSize(size);
          setSizeSheetOpen(false);
          addSelectedToCart(size);
        }}
      />
    </motion.div>
  );
}
