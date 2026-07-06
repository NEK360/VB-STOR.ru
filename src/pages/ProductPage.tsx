import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Heart, Star, ExternalLink, MessageCircle, Check, ChevronLeft, ChevronRight, Share2 } from "lucide-react";
import { getProductById, products, type Product } from "../store-data/products";
import { contacts } from "../store-data/contacts";
import { formatPrice } from "../lib/utils";
import { useFavorites } from "../hooks/useFavorites";
import { useRecentlyViewed } from "../hooks/useRecentlyViewed";
import { analytics } from "../lib/analytics";
import OrderModal from "../components/ui/OrderModal";
import ProductCard from "../components/ui/ProductCard";

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const product = getProductById(id || "");
  const { isFavorite, toggle } = useFavorites();
  const { addViewed } = useRecentlyViewed();

  const [imgIndex, setImgIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [orderOpen, setOrderOpen] = useState(false);
  const [imgZoomed, setImgZoomed] = useState(false);

  useEffect(() => {
    if (product) {
      document.title = `${product.name} — VB STORE`;
      addViewed(product.id);
      analytics.viewProduct(product.id, product.name, product.price);
      if (product.colors.length > 0) setSelectedColor(product.colors[0].name);
    }
  }, [product?.id]);

  if (!product) {
    return (
      <main className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/20 text-6xl mb-6">404</p>
          <p className="text-white/40 text-lg mb-8">Товар не найден</p>
          <Link to="/catalog" className="glass text-white px-6 py-3 rounded-xl hover:bg-white/10 transition-all">
            Вернуться в каталог
          </Link>
        </div>
      </main>
    );
  }

  const fav = isFavorite(product.id);
  const hasImages = product.images.length > 0;
  const related = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);

  const prevImg = () => setImgIndex((i) => Math.max(0, i - 1));
  const nextImg = () => setImgIndex((i) => Math.min(product.images.length - 1, i + 1));

  const getSizeStatus = (status: string) => {
    switch (status) {
      case "available": return "bg-white/10 text-white hover:bg-white/20 border-white/15";
      case "low": return "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 border-yellow-500/30";
      case "unavailable": return "bg-white/3 text-white/20 cursor-not-allowed border-white/5";
      default: return "";
    }
  };

  return (
    <main className="min-h-screen pt-16 pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Breadcrumb */}
        <nav aria-label="Хлебные крошки" className="flex items-center gap-2 py-6 text-sm text-white/30">
          <Link to="/" className="hover:text-white transition-colors">Главная</Link>
          <span>/</span>
          <Link to="/catalog" className="hover:text-white transition-colors">Каталог</Link>
          <span>/</span>
          <span className="text-white/60 truncate max-w-[200px]">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
          {/* Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <div
              className="relative aspect-square rounded-3xl overflow-hidden bg-white/4 border border-white/8 cursor-zoom-in"
              onClick={() => setImgZoomed(true)}
            >
              {hasImages ? (
                <AnimatePresence mode="wait">
                  <motion.img
                    key={imgIndex}
                    src={product.images[imgIndex]}
                    alt={`${product.name} — фото ${imgIndex + 1}`}
                    initial={{ opacity: 0, scale: 1.02 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="w-full h-full object-cover"
                    loading={imgIndex === 0 ? "eager" : "lazy"}
                  />
                </AnimatePresence>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/10">
                  <span className="text-7xl">📦</span>
                </div>
              )}

              {/* Nav arrows */}
              {product.images.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); prevImg(); }}
                    disabled={imgIndex === 0}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full glass flex items-center justify-center text-white disabled:opacity-20 transition-all hover:bg-white/20"
                    aria-label="Предыдущее фото"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); nextImg(); }}
                    disabled={imgIndex === product.images.length - 1}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full glass flex items-center justify-center text-white disabled:opacity-20 transition-all hover:bg-white/20"
                    aria-label="Следующее фото"
                  >
                    <ChevronRight size={18} />
                  </button>
                </>
              )}

              {/* Badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {product.isNew && (
                  <span className="bg-white text-black text-xs font-bold px-3 py-1 rounded-lg">NEW</span>
                )}
                {product.discount && product.discount > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-lg">-{product.discount}%</span>
                )}
              </div>
            </div>

            {/* Thumbnails */}
            {product.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto scrollbar-none">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIndex(i)}
                    className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${i === imgIndex ? "border-white" : "border-white/10 hover:border-white/30"}`}
                    aria-label={`Фото ${i + 1}`}
                    aria-pressed={i === imgIndex}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col"
          >
            {/* Category & Actions */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-white/30 text-xs uppercase tracking-widest">{product.category}</span>
                {product.gender && (
                  <>
                    <span className="text-white/15">·</span>
                    <span className="text-white/30 text-xs">{product.gender}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.share?.({ title: product.name, url: window.location.href })
                      .catch(() => navigator.clipboard.writeText(window.location.href));
                  }}
                  className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-white/30 hover:text-white hover:border-white/30 transition-all"
                  aria-label="Поделиться"
                >
                  <Share2 size={15} />
                </button>
                <button
                  onClick={() => toggle(product.id)}
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${fav ? "bg-white border-white text-black" : "border-white/10 text-white/30 hover:text-white hover:border-white/30"}`}
                  aria-label={fav ? "Убрать из избранного" : "Добавить в избранное"}
                  aria-pressed={fav}
                >
                  <Heart size={15} fill={fav ? "currentColor" : "none"} />
                </button>
              </div>
            </div>

            {/* Name */}
            <h1 className="text-white font-black text-2xl md:text-3xl tracking-tight leading-tight mb-4">
              {product.name}
            </h1>

            {/* Rating */}
            {product.rating > 0 && (
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={14}
                      className={s <= Math.round(product.rating) ? "text-yellow-400 fill-yellow-400" : "text-white/15"}
                    />
                  ))}
                </div>
                <span className="text-white font-bold text-sm">{product.rating}</span>
                <span className="text-white/30 text-sm">{product.reviewsCount} отзывов</span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-8">
              <span className="text-white font-black text-4xl">{formatPrice(product.price)}</span>
              {product.oldPrice && (
                <span className="text-white/30 text-xl line-through">{formatPrice(product.oldPrice)}</span>
              )}
              {product.discount && product.discount > 0 && (
                <span className="bg-red-500/20 text-red-400 text-sm font-bold px-2 py-0.5 rounded-lg">
                  Скидка {product.discount}%
                </span>
              )}
            </div>

            {/* Colors */}
            {product.colors.length > 0 && (
              <div className="mb-6">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-3">
                  Цвет: <span className="text-white">{selectedColor}</span>
                </p>
                <div className="flex gap-2 flex-wrap">
                  {product.colors.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setSelectedColor(color.name)}
                      className={`group relative w-8 h-8 rounded-full border-2 transition-all ${selectedColor === color.name ? "border-white scale-110" : "border-white/20 hover:border-white/50"}`}
                      style={{ backgroundColor: color.hex }}
                      aria-label={color.name}
                      aria-pressed={selectedColor === color.name}
                    >
                      {selectedColor === color.name && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <Check size={12} className={color.hex === "#ffffff" ? "text-black" : "text-white"} />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sizes */}
            {product.sizes.length > 0 && (
              <div className="mb-8">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Размер</p>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size.value}
                      onClick={() => size.status !== "unavailable" && setSelectedSize(size.value)}
                      disabled={size.status === "unavailable"}
                      className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                        selectedSize === size.value
                          ? "bg-white text-black border-white"
                          : getSizeStatus(size.status)
                      }`}
                      aria-label={`Размер ${size.value}${size.status === "unavailable" ? " — нет в наличии" : size.status === "low" ? " — мало" : ""}`}
                      aria-pressed={selectedSize === size.value}
                    >
                      {size.value}
                      {size.status === "low" && <span className="ml-1 text-[9px]">•</span>}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-white/30">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white/40" />В наличии</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400/60" />Мало</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white/15" />Нет</span>
                </div>
              </div>
            )}

            {/* Availability */}
            <div className="glass rounded-2xl p-4 mb-6 border border-white/8">
              {product.offlineOnly && !product.bothAvailable && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-white text-sm font-medium">✔ Есть в наличии в магазине</p>
                    <p className="text-white/40 text-xs mt-1">г. Изобильный, Ставропольский край, ул. Кирова, 2Г</p>
                    <p className="text-white/30 text-xs">Способы покупки: заявка, WhatsApp, Telegram</p>
                  </div>
                </div>
              )}
              {product.wbOnly && !product.bothAvailable && product.wbUrl && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-white text-sm font-medium">✔ Есть на Wildberries</p>
                  </div>
                </div>
              )}
              {product.bothAvailable && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <p className="text-white text-sm">✔ В магазине — г. Изобильный, ул. Кирова, 2Г</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                    <p className="text-white text-sm">✔ На Wildberries</p>
                  </div>
                </div>
              )}

              {/* Stock info */}
              {product.sizes.some((s) => s.stockOffline !== undefined) && (
                <div className="mt-3 pt-3 border-t border-white/8">
                  <p className="text-white/30 text-xs mb-2">Остатки в магазине:</p>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((s) => (
                      <span key={s.value} className="text-xs text-white/40">
                        {s.value}: {s.stockOffline ?? "?"} шт
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setOrderOpen(true)}
                className="w-full py-4 rounded-2xl bg-white text-black font-bold text-base hover:bg-white/90 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                Оставить заявку
              </button>

              <div className="grid grid-cols-2 gap-3">
                <a
                  href={`${contacts.whatsappUrl}?text=Хочу заказать: ${product.name}${selectedSize ? `, размер ${selectedSize}` : ""}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => analytics.clickContact("whatsapp")}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600/15 border border-green-600/25 text-green-400 text-sm font-medium hover:bg-green-600/25 transition-all"
                >
                  <MessageCircle size={16} />
                  WhatsApp
                </a>
                <a
                  href={`${contacts.telegramUrl}?text=Хочу заказать: ${product.name}${selectedSize ? `, размер ${selectedSize}` : ""}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => analytics.clickContact("telegram")}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600/15 border border-blue-600/25 text-blue-400 text-sm font-medium hover:bg-blue-600/25 transition-all"
                >
                  <MessageCircle size={16} />
                  Telegram
                </a>
              </div>

              {product.wbUrl && (
                <a
                  href={product.wbUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => analytics.clickWildberries(product.id)}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-600/15 border border-purple-600/25 text-purple-400 text-sm font-medium hover:bg-purple-600/25 transition-all"
                >
                  <ExternalLink size={16} />
                  Купить на Wildberries
                </a>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div className="mt-8 pt-8 border-t border-white/8">
                <h2 className="text-white font-semibold text-sm uppercase tracking-widest mb-4">О товаре</h2>
                <p className="text-white/50 text-sm leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Article */}
            <p className="mt-4 text-white/20 text-xs">Артикул: {product.article}</p>
          </motion.div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <section className="mt-20" aria-labelledby="related-title">
            <h2 id="related-title" className="text-white font-black text-3xl tracking-tight mb-8">
              Похожие товары
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {related.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Order Modal */}
      <OrderModal
        product={product}
        selectedSize={selectedSize}
        selectedColor={selectedColor}
        isOpen={orderOpen}
        onClose={() => setOrderOpen(false)}
      />

      {/* Image Zoom */}
      <AnimatePresence>
        {imgZoomed && hasImages && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] flex items-center justify-center bg-black/95 p-4"
            onClick={() => setImgZoomed(false)}
          >
            <motion.img
              src={product.images[imgIndex]}
              alt={product.name}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="max-w-full max-h-full object-contain rounded-2xl"
            />
            <button
              className="absolute top-6 right-6 text-white/50 hover:text-white"
              aria-label="Закрыть"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function getSizeStatus(status: string) {
  switch (status) {
    case "available": return "bg-white/10 text-white hover:bg-white/20 border-white/15";
    case "low": return "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 border-yellow-500/30";
    case "unavailable": return "bg-white/3 text-white/20 cursor-not-allowed border-white/5";
    default: return "";
  }
}
