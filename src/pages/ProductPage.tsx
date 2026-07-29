import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Star, ExternalLink, MessageCircle, Check, ChevronLeft, ChevronRight, Share2, ChevronDown } from "lucide-react";
import { getProductById, loadProducts, type Product } from "../lib/api";
import { contacts } from "../store-data/contacts";
import { formatPrice } from "../lib/utils";
import { useFavorites } from "../hooks/useFavorites";
import { useRecentlyViewed } from "../hooks/useRecentlyViewed";
import { analytics } from "../lib/analytics";
import OrderModal from "../components/ui/OrderModal";
import ProductCard from "../components/ui/ProductCard";

const PROMOCODES: Record<string, number> = {
  SKFU: 10,
  SUN12: 15,
};

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setProduct(null);
      setRelated([]);
      setLoading(false);
      return;
    }

    let isActive = true;

    async function load() {
      setLoading(true);
      const p = await getProductById(id ?? "");

      if (!isActive) return;

      setProduct(p ?? null);

      if (!p) {
        setRelated([]);
        setLoading(false);
        return;
      }

      const all = await loadProducts();

      if (!isActive) return;

      setRelated(
        all
          .filter((x) => x.category === p.category && x.id !== p.id)
          .slice(0, 4)
      );
      setLoading(false);
    }

    void load();

    return () => {
      isActive = false;
    };
  }, [id]);

  const { isFavorite, toggle } = useFavorites();
  const { addViewed } = useRecentlyViewed();

  // gallery index
  const [activePhoto, setActivePhoto] = useState(0);
  // size/color
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState("");
  const [orderOpen, setOrderOpen] = useState(false);
  const [imgZoomed, setImgZoomed] = useState(false);
  const [openSection, setOpenSection] = useState<"about" | "details" | "delivery" | null>("about");
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [mouseStartX, setMouseStartX] = useState<number | null>(null);

  // promo state
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);

  useEffect(() => {
    if (!product) return;

    document.title = `${product.name} — VB STORE`;
    addViewed(product.id);
    analytics.viewProduct(product.id, product.name, product.price);
    setActivePhoto(-1);
    // select first available size by default
    const firstAvailable = product.sizes?.find((s) => s.status !== "unavailable")?.value ?? null;
    setSelectedSize(String(firstAvailable));
    setSelectedColor(product.colors?.[0]?.name ?? "");
    setImgZoomed(false);
    setAppliedPromo(null);
    setPromoInput("");
  }, [addViewed, product]);

  const fav = isFavorite(product?.id ?? "");

  const isVideoSrc = (src?: string) => {
    if (!src) return false;
    return src.endsWith(".mp4") || src.includes("youtube") || src.includes("vimeo");
  };

  // build gallery: video first, then images
  const gallery = useMemo(() => {
    if (!product) return [] as { type: "video" | "image"; src: string }[];
    const videoItems: { type: "video" | "image"; src: string }[] = [];
    const p: any = product as any;
    if (p.video && typeof p.video === "string") videoItems.push({ type: "video", src: p.video });
    if (Array.isArray(p.videos)) {
      for (const v of p.videos) if (v) videoItems.push({ type: "video", src: String(v) });
    }
    const images = Array.isArray(product.images)
  ? product.images
      .filter(Boolean)
      .map((s) => ({
        type: "image",
        src: String(s).trim()
      }))
  : typeof product.images === "string"
  ? product.images
      .split(";")
      .filter(Boolean)
      .map((s) => ({
        type: "image",
        src: s.trim()
      }))
  : [];
    return [...videoItems, ...images];
  }, [product]);

  const hasImages = gallery.length > 0;

  const galleryLength = gallery.length || 1;
  const currentPhoto = activePhoto

  const handlePrevPhoto = useCallback(() => {
    setActivePhoto((prev) => (prev === 0 ? galleryLength - 1 : prev - 1));
  }, [galleryLength]);

  const handleNextPhoto = useCallback(() => {
    setActivePhoto((prev) => (prev === galleryLength - 1 ? 0 : prev + 1));
  }, [galleryLength]);

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    setTouchStartX(event.touches[0]?.clientX ?? null);
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX === null) return;

    const delta = (event.changedTouches[0]?.clientX ?? 0) - touchStartX;
    if (delta > 50) {
      handlePrevPhoto();
    } else if (delta < -50) {
      handleNextPhoto();
    }

    setTouchStartX(null);
  };

  const details = useMemo(
    () => [
      { label: "Бренд", value: product?.brand || "—" },
      { label: "Категория", value: product?.category || "—" },
      { label: "Пол", value: product?.gender || "—" },
      { label: "Артикул", value: product?.article || "—" },
    ],
    [product]
  );

  // selected size object
  const selectedSizeObj = useMemo(() => {
    if (!product || !selectedSize) return undefined;
    return product.sizes.find((s) => String(s.value) === String(selectedSize));
  }, [product, selectedSize]);

  const shopQty = Number(selectedSizeObj?.stockOffline ?? 0);
  const wbQty = Number(selectedSizeObj?.stockWB ?? 0);

  // promo calculations
  const promoPercent = appliedPromo ? (PROMOCODES[appliedPromo] ?? 0) : 0;
  const basePrice = product?.price ?? 0;
  const finalPrice = useMemo(() => {
    if (!basePrice) return 0;
    if (!promoPercent) return basePrice;
    return Math.round((basePrice * (100 - promoPercent)) / 100);
  }, [basePrice, promoPercent]);

  const applyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) {
      setAppliedPromo(null);
      return;
    }
    if (!(code in PROMOCODES)) {
      setAppliedPromo(null);
      return;
    }
    setAppliedPromo(code);
  };

  const handleOrderClick = () => {
    if (!selectedSize) {
      alert("Пожалуйста, выберите размер");
      return;
    }
    // if size exists but no stock at all — block
    if (shopQty === 0 && wbQty === 0) {
      alert("Выбранный размер отсутствует");
      return;
    }
    // if only WB — open WB link
    if (shopQty === 0 && wbQty > 0) {
      if (product?.wbUrl) window.open(product.wbUrl, "_blank");
      return;
    }
    setOrderOpen(true);
  };

  if (loading) {
    return (
      <main className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-2 border-white/10 border-t-white animate-spin mx-auto mb-6" />
          <p className="text-white/60 text-lg">Загрузка товара…</p>
        </div>
      </main>
    );
  }

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

  return (
    <main className="min-h-screen pt-16 pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <nav aria-label="Хлебные крошки" className="flex items-center gap-2 py-6 text-sm text-white/30">
          <Link to="/" className="hover:text-white transition-colors">Главная</Link>
          <span>/</span>
          <Link to="/catalog" className="hover:text-white transition-colors">Каталог</Link>
          <span>/</span>
          <span className="text-white/60 truncate max-w-[200px]">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
          {/* Галерея */}
          <div className="space-y-4">
            <div
  className="relative aspect-square overflow-hidden rounded-3xl"
  onTouchStart={handleTouchStart}
  onTouchEnd={handleTouchEnd}
  onMouseDown={(e)=>{
    setMouseStartX(e.clientX);
  }}
  onMouseUp={(e)=>{
    if(mouseStartX === null) return;

    const delta = e.clientX - mouseStartX;

    if(delta > 50){
      handlePrevPhoto();
    }

    if(delta < -50){
      handleNextPhoto();
    }

    setMouseStartX(null);
  }}
>
              {hasImages ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={gallery[currentPhoto]?.src ?? activePhoto}
                    initial={{ opacity: 0, scale: 1.02 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="w-full h-full"
                  >
                    {gallery[currentPhoto]?.type === "video" ? (
                      <video src={gallery[currentPhoto].src} controls className="w-full h-full object-cover" />
                    ) : (
                     <img
 src={gallery[currentPhoto]?.src}
 onClick={() => setImgZoomed(true)}
                        alt={`${product.name} — фото ${activePhoto + 1}`}
                        className="w-full h-full object-cover"
                        loading={activePhoto === 0 ? "eager" : "lazy"}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/10">
                  <span className="text-7xl">📦</span>
                </div>
              )}

            

              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {product.isNew && (
                  <span className="bg-white text-black text-xs font-bold px-3 py-1 rounded-lg">NEW</span>
                )}
              </div>
            </div>


            {/* Миниатюры */}
            {gallery.length > 1 && (
              <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2">
                {gallery.map((item, i) => (
                  <button
                    key={item.src}
                    onClick={(e) => {
 e.stopPropagation();
 setActivePhoto(i);
}}
                    className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                      i === activePhoto ? "border-white ring-2 ring-white/50" : "border-white/10 hover:border-white/30"
                    }`}
                    aria-label={`Фото ${i + 1}`}
                    aria-pressed={i === activePhoto}
                  >
                    {item.type === "video" ? (
                      <div className="w-full h-full flex items-center justify-center bg-black/20 text-white">▶</div>
                    ) : (
                      <img src={item.src} alt="" className="w-full h-full object-cover" loading="lazy" />
                    )}
                  </button>
                ))}
              </div>
           )}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col"
          >
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
                    navigator.share?.({ title: product.name, url: window.location.href }).catch(() => navigator.clipboard.writeText(window.location.href));
                  }}
                  className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-white/30 hover:text-white hover:border-white/30 transition-all"
                    aria-label="Поделиться"
                >
                  <Share2 size={15} />
                </button>
                <button
                  onClick={() => toggle(product.id)}
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${
                    fav ? "bg-white border-white text-black" : "border-white/10 text-white/30 hover:text-white hover:border-white/30"
                  }`}
                  aria-label={fav ? "Убрать из избранного" : "Добавить в избранное"}
                  aria-pressed={fav}
                >
                  <Heart size={15} fill={fav ? "currentColor" : "none"} />
                </button>
              </div>
            </div>

            <h1 className="text-white font-black text-2xl md:text-3xl tracking-tight leading-tight mb-4">{product.name}</h1>

            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={14}
                    className={product.reviewsCount > 0 && s <= Math.round(product.rating) ? "text-yellow-400 fill-yellow-400" : "text-white/15"}
                  />
                ))}
              </div>
              <span className="text-white font-bold text-sm">{product.reviewsCount > 0 ? product.rating : "Нет отзывов"}</span>
              <span className="text-white/30 text-sm">{product.reviewsCount > 0 ? `${product.reviewsCount} отзывов` : "Нет отзывов"}</span>
            </div>

            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-white font-black text-4xl">{formatPrice(product.price)} </span>
            </div>

            {/* Промокод */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
value={promoInput}
onChange={(e)=>setPromoInput(e.target.value)}
placeholder="Промокод"
className="
w-full
bg-white/10
border border-white/20
text-white
px-4
py-3
rounded-xl
outline-none
"
/>
                <button
onClick={applyPromo}
className="
px-5
py-3
rounded-xl
bg-white
text-black
font-medium
"
>
Применить
</button>
                {promoInput && !appliedPromo && promoInput.trim() !== "" && (
                  <div className="text-rose-400 text-sm ml-3">Промокод не найден</div>
                )}
              </div>

              {appliedPromo && (
                <div className="text-white/40 text-sm mt-2">Скидка по промокоду: -{promoPercent}% &nbsp; Итоговая цена: {formatPrice(finalPrice)} ₽</div>
              )}
            </div>

            {product.colors?.length > 0 && (
              <div className="mb-6">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Цвет: <span className="text-white">{selectedColor}</span></p>
                <div className="flex gap-2 flex-wrap">
                  {product.colors.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setSelectedColor(color.name)}
                      className={`group relative w-8 h-8 rounded-full border-2 transition-all ${
                        selectedColor === color.name ? "border-white scale-110" : "border-white/20 hover:border-white/50"
                      }`}
                      style={{ backgroundColor: color.code ?? "#ffffff" }}
                      aria-label={color.name}
                      aria-pressed={selectedColor === color.name}
                    >
                      {selectedColor === color.name && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <Check size={12} className={(color.code ?? "#ffffff") === "#ffffff" ? "text-black" : "text-white"} />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Размеры */}
{product.sizes.length > 0 && (
  <div className="mb-8">
    <p className="text-white/40 text-xs uppercase tracking-wider mb-3">
      Размер
    </p>
            {/* Наличие по выбранному размеру */}
            <div className="glass rounded-2xl p-4 mb-6 border border-white/8">
              {/* Если размер не выбран */}
              {!selectedSize && (
                <div>
                  <p className="text-white text-sm font-medium">Выберите размер, чтобы увидеть наличие</p>
                </div>
              )}

              {selectedSize && shopQty > 0 && (
                <div className="flex items-start gap-3 mb-3 pb-3 border-b border-white/8 last:mb-0 last:pb-0 last:border-b-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-white text-sm font-medium">✔ Есть в наличии в магазине</p>
                    <p className="text-white/40 text-xs mt-1">г. Изобильный, Ставропольский край, ул. Кирова, 2Г</p>
                    <p className="text-white/30 text-xs">Способы покупки: заявка, WhatsApp, Telegram, MAX</p>
                  </div>
                </div>
              )}

              {selectedSize && wbQty > 0 && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-white text-sm font-medium">✔ Есть на Wildberries</p>
                    <p className="text-white/40 text-xs mt-1">Доставка со склада WB</p>
                  </div>
                </div>
              )}

              {selectedSize && shopQty === 0 && wbQty === 0 && (
                <div>
                  <p className="text-white text-sm font-medium">❌ Нет в наличии</p>
                </div>
              )}
            </div>

            {/* Кнопки */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleOrderClick}
                className={`w-full py-4 rounded-2xl font-bold text-base transition-all hover:scale-[1.01] active:scale-[0.99] ${
                  !selectedSize ? "bg-white/50 text-black/50 cursor-not-allowed" : "bg-white text-black hover:bg-white/90"
                }`}
              >
                {selectedSize ? (shopQty === 0 && wbQty > 0 ? "Купить на WB" : "Оставить заявку") : "Выберите размер"}
              </button>

              <div className="grid grid-cols-2 gap-3">
                <a
                  href={selectedSize ? `${contacts.whatsappUrl}?text=Хочу заказать: ${product.name}, размер ${selectedSize}` : "#"}
                  target={selectedSize ? "_blank" : undefined}
                  rel={selectedSize ? "noopener noreferrer" : undefined}
                  onClick={() => {
                    if (selectedSize) {
                      analytics.clickContact("whatsapp");
                    }
                  }}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
                    selectedSize ? "bg-green-600/15 border border-green-600/25 text-green-400 hover:bg-green-600/25" : "bg-green-600/8 border border-green-600/15 text-green-400/50 cursor-not-allowed"
                  }`}
                >
                  <MessageCircle size={16} />
                  WhatsApp
                </a>
                <a
                  href={selectedSize ? `${contacts.telegramUrl}?text=Хочу заказать: ${product.name}, размер ${selectedSize}` : "#"}
                  target={selectedSize ? "_blank" : undefined}
                  rel={selectedSize ? "noopener noreferrer" : undefined}
                  onClick={() => {
                    if (selectedSize) {
                      analytics.clickContact("telegram");
                    }
                  }}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
                    selectedSize ? "bg-blue-600/15 border border-blue-600/25 text-blue-400 hover:bg-blue-600/25" : "bg-blue-600/8 border border-blue-600/15 text-blue-400/50 cursor-not-allowed"
                  }`}
                >
                  <MessageCircle size={16} />
                  Telegram
                </a>
              </div>

             {/* Кнопка Купить на WB — отображается всегда, если есть ссылка */}
              {product.wbUrl && (
                <button
                  onClick={() => window.open(product.wbUrl, "_blank")}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-600/15 border border-purple-600/25 text-purple-400 text-sm font-medium hover:bg-purple-600/25 transition-all"
                >
                  <ExternalLink size={16} />
                  Купить на Wildberries
                </button>
              )}

              <a
                href={contacts.maxUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => analytics.clickContact("max")}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/8 border border-white/10 text-white/70 text-sm font-medium hover:bg-white/12 transition-all"
              >
                <MessageCircle size={16} />
                MAX
              </a>
           </div>  

          </div>     

)}

            <div className="mt-8 space-y-3 border-t border-white/8 pt-6">
              <div className="rounded-2xl border border-white/8 bg-white/4">
                <button
                  onClick={() => setOpenSection((value) => (value === "about" ? null : "about"))}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">О товаре</span>
                  <ChevronDown size={16} className={`transition-transform ${openSection === "about" ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence initial={false}>
                  {openSection === "about" && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="px-4 pb-4 text-sm leading-relaxed text-white/50">{product.description || "Подробное описание будет добавлено позже."}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/4">
                <button
                  onClick={() => setOpenSection((value) => (value === "details" ? null : "details"))}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">Характеристики</span>
                  <ChevronDown size={16} className={`transition-transform ${openSection === "details" ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence initial={false}>
                  {openSection === "details" && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-2 text-sm text-white/60">
                        {details.map((item) => (
                          <div key={item.label} className="flex items-center justify-between gap-4 border-b border-white/8 py-2 last:border-b-0">
                            <span>{item.label}</span>
                            <span className="text-white/80">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/4">
                <button
                  onClick={() => setOpenSection((value) => (value === "delivery" ? null : "delivery"))}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">Доставка и оплата</span>
                  <ChevronDown size={16} className={`transition-transform ${openSection === "delivery" ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence initial={false}>
                  {openSection === "delivery" && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="px-4 pb-4 text-sm leading-relaxed text-white/50">
                        Возможна доставка по запросу, а также самовывоз по адресу г. Изобильный, ул. Кирова, 2Г. Для заказа обратитесь через WhatsApp, Telegram, MAX или форму заявки.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
 </div>
              {/* здесь заканчивается галерея */}
    </motion.div>
        </div>

      {related.length > 0 && (
        <section className="mt-20" aria-labelledby="related-title">
          <h2
            id="related-title"
            className="text-white font-black text-3xl tracking-tight mb-8"
          >
            Похожие товары
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {related.map((p, i) => (
              <ProductCard
                key={p.id}
                product={p}
                index={i}
              />
            ))}
          </div>
        </section>
      )}
      </div>

      <OrderModal
        product={product}
        selectedSize={selectedSize ?? undefined}
        selectedColor={selectedColor}
        isOpen={orderOpen}
        onClose={() => setOrderOpen(false)}
        promocode={appliedPromo ?? undefined}
        discount={promoPercent}
        finalPrice={finalPrice}
      />

      <AnimatePresence>
        {imgZoomed && hasImages && (
          <motion.div
           initial={{
  opacity: 0,
  x: 80
}}

animate={{
  opacity: 1,
  x: 0
}}

exit={{
  opacity: 0,
  x: -80
}}

transition={{
  duration: 0.25
}}
            className="fixed inset-0 z-[400] flex items-center justify-center bg-black/95 p-4"
            onClick={() => setImgZoomed(false)}
          >
            {gallery[currentPhoto]?.type === "video" ? (
              <video src={gallery[currentPhoto].src} controls className="max-w-full max-h-full object-contain rounded-2xl" />
            ) : (
              <motion.img
                src={gallery[currentPhoto]?.src}
                alt={product.name}
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="max-w-full max-h-full object-contain rounded-2xl"
              />
            )}
            <button
              onClick={() => setImgZoomed(false)}
              className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"
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
    case "available":
      return "bg-white/10 text-white hover:bg-white/20 border-white/15";
    case "low":
      return "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 border-yellow-500/30";
    case "unavailable":
      return "bg-white/3 text-white/20 cursor-not-allowed border-white/5";
    default:
      return "";
  }
}
