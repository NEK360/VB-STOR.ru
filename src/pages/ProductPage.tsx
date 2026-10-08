import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Star,
  ExternalLink,
  MessageCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Share2,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";
import {
  getCatalogStatus,
  getInitialProducts,
  getProductById,
  getReviewsForProduct,
  loadProducts,
  type Product,
} from "../lib/api";
import { getProductMacroGroup } from "../lib/sizes";
import { fetchProductReviews, type CustomerReview } from "../lib/customerReviews";
import type { Review } from "../store-data/reviews";
import { contacts } from "../store-data/contacts";
import { formatPrice, reviewsWord } from "../lib/utils";
import { useFavorites } from "../hooks/useFavorites";
import { useRecentlyViewed } from "../hooks/useRecentlyViewed";
import { analytics } from "../lib/analytics";
import { addToCart, applyPromoCode, clearPromoCode, useCart } from "../lib/cart";
import { startBuyNow } from "../lib/checkoutSession";
import { calculateTotals } from "../lib/pricing";
import { shareProductWithFeedback } from "../lib/share";
import {
  getMaxQuantity,
  getSizeInfoByValue,
  hasSizes,
  hasWbStock,
  isProductOrderable,
} from "../lib/stock";
import { toast } from "../lib/toast";
import ProductCard from "../components/ui/ProductCard";
import ProductSizePicker from "../components/ui/ProductSizePicker";
import SizeSheet from "../components/ui/SizeSheet";

type PurchaseIntent = "cart" | "buy";

const DRAG_THRESHOLD = 10;

type GalleryItem = { type: "video" | "image"; src: string };

function normalizeStr(s?: string): string {
  return (s ?? "").trim().toLowerCase();
}

function findProductByRouteId(products: Product[], id?: string): Product | undefined {
  if (!id) return undefined;
  return products.find(
    (item) => String(item.id) === String(id) || String(item.article) === String(id)
  );
}

function sortRelatedProducts(all: Product[], product: Product): Product[] {
  const targetCat = normalizeStr(product.category);
  const targetGender = normalizeStr(product.gender);
  const targetMacro = getProductMacroGroup(product.category, product.name);

  return all
    .filter((item) => String(item.id) !== String(product.id))
    .sort((a, b) => {
      const score = (item: Product) => {
        let value = 0;
        if (normalizeStr(item.category) === targetCat) value += 100;
        else if (getProductMacroGroup(item.category, item.name) === targetMacro) value += 50;
        if (targetGender && normalizeStr(item.gender) === targetGender) value += 25;
        if (product.brand && normalizeStr(item.brand) === normalizeStr(product.brand)) value += 10;
        return value;
      };
      return score(b) - score(a);
    });
}

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(() =>
    id ? findProductByRouteId(getInitialProducts(), id) ?? null : null
  );
  const [related, setRelated] = useState<Product[]>(() => {
    if (!id) return [];
    const initialProducts = getInitialProducts();
    const initialProduct = findProductByRouteId(initialProducts, id);
    return initialProduct ? sortRelatedProducts(initialProducts, initialProduct) : [];
  });
  const [loading, setLoading] = useState(() =>
    Boolean(id) && !findProductByRouteId(getInitialProducts(), id)
  );
  const [catalogError, setCatalogError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [customerReviews, setCustomerReviews] = useState<CustomerReview[]>([]);

  useEffect(() => {
    if (!id) {
      setProduct(null);
      setRelated([]);
      setCatalogError(false);
      setLoading(false);
      return;
    }

    let isActive = true;

    async function load() {
      const initialProducts = getInitialProducts();
      const initialProduct = findProductByRouteId(initialProducts, id);
      const canRenderCached = Boolean(initialProduct) && retryCount === 0;

      setCatalogError(false);
      setProduct(canRenderCached ? initialProduct ?? null : null);
      setRelated(
        canRenderCached && initialProduct
          ? sortRelatedProducts(initialProducts, initialProduct)
          : []
      );
      setLoading(!canRenderCached);

      // Если нужный товар уже есть в памяти/localStorage, показываем его сразу.
      // loadProducts продолжит обновление в фоне и заменит список похожих товаров.
      const loadedProduct = await getProductById(id ?? "", { force: retryCount > 0 });
      if (!isActive) return;

      if (!loadedProduct) {
        setProduct(null);
        setRelated([]);
        setCatalogError(getCatalogStatus() === "error");
        setLoading(false);
        return;
      }

      setProduct(loadedProduct);
      setRelated(sortRelatedProducts(initialProducts, loadedProduct));
      setLoading(false);

      const allProducts = await loadProducts();
      if (!isActive) return;

      const latestProduct = findProductByRouteId(allProducts, id) ?? loadedProduct;
      setProduct(latestProduct);
      setRelated(sortRelatedProducts(allProducts, latestProduct));
      setCatalogError(false);
    }

    void load();

    return () => {
      isActive = false;
    };
  }, [id, retryCount]);

  useEffect(() => {
    if (!product?.id) {
      setCustomerReviews([]);
      return;
    }

    let active = true;
    fetchProductReviews(String(product.id))
      .then((reviews) => {
        if (active) setCustomerReviews(reviews);
      })
      .catch(() => {
        // Пользовательские отзывы дополняют каталог, но не блокируют карточку при сбое сервиса.
        if (active) setCustomerReviews([]);
      });

    return () => {
      active = false;
    };
  }, [product?.id]);

  const navigate = useNavigate();
  const { isFavorite, toggle } = useFavorites();
  const { addViewed } = useRecentlyViewed();

  const [activePhoto, setActivePhoto] = useState(0);
  const [imgZoomed, setImgZoomed] = useState(false);

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState("");

  const [sizeSheet, setSizeSheet] = useState<{
    open: boolean;
    intent: PurchaseIntent;
  }>({
    open: false,
    intent: "cart",
  });
  const [openSection, setOpenSection] = useState<
    "about" | "details" | "delivery" | null
  >("about");

  const { promoCode: appliedPromo } = useCart();
  const [promoCode, setPromoCode] = useState(appliedPromo ?? "");
  const [promoError, setPromoError] = useState(false);

  useEffect(() => {
    if (!product) return;

    document.title = `${product.name} — VB STORE`;
    addViewed(product.id);
    analytics.viewProduct(product.id, product.name, product.price);
    setActivePhoto(0);
    setSelectedSize(null);
    setSelectedColor(product.colors?.[0]?.name ?? "");
    setImgZoomed(false);
    setSizeSheet({ open: false, intent: "cart" });
    setPromoError(false);
    setPromoCode(appliedPromo ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [id]);

  const fav = isFavorite(product?.id ?? "");

  const productReviews = useMemo<Review[]>(() => {
    if (!product) return [];
    const merged = [...customerReviews, ...getReviewsForProduct(product)];
    const unique = new Map<string, Review>();
    merged.forEach((review) => unique.set(review.id, review));
    return [...unique.values()].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  }, [product, customerReviews]);
  const reviewsCount = Math.max(product?.reviewsCount ?? 0, productReviews.length);
  const hasReviews = reviewsCount > 0;
  const ratingValue = productReviews.length
    ? Number((productReviews.reduce((sum, review) => sum + review.rating, 0) / productReviews.length).toFixed(1))
    : product && product.rating > 0
      ? product.rating
      : 5;

  const gallery = useMemo<GalleryItem[]>(() => {
    if (!product) return [];
    const items: GalleryItem[] = [];
    const p = product as unknown as { video?: string; videos?: string[] };
    if (p.video && typeof p.video === "string")
      items.push({ type: "video", src: p.video });
    if (Array.isArray(p.videos)) {
      for (const v of p.videos)
        if (v) items.push({ type: "video", src: String(v) });
    }
    const images = Array.isArray(product.images)
      ? product.images
          .filter(Boolean)
          .map((s) => ({ type: "image" as const, src: String(s).trim() }))
      : [];
    return [...items, ...images];
  }, [product]);

  const hasImages = gallery.length > 0;
  const galleryLength = gallery.length || 1;

  const handlePrevPhoto = useCallback(() => {
    setActivePhoto((prev) => (prev === 0 ? galleryLength - 1 : prev - 1));
  }, [galleryLength]);

  const handleNextPhoto = useCallback(() => {
    setActivePhoto((prev) => (prev === galleryLength - 1 ? 0 : prev + 1));
  }, [galleryLength]);

  const dragStartX = useRef<number | null>(null);
  const dragDelta = useRef(0);
  const isDragging = useRef(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragStartX.current = e.clientX;
    dragDelta.current = 0;
    isDragging.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartX.current === null) return;
    dragDelta.current = e.clientX - dragStartX.current;
    if (Math.abs(dragDelta.current) > DRAG_THRESHOLD) {
      isDragging.current = true;
    }
  };

  const handlePointerUp = () => {
    if (dragStartX.current === null) return;

    if (Math.abs(dragDelta.current) > 50) {
      if (dragDelta.current < 0) {
        handleNextPhoto();
      } else {
        handlePrevPhoto();
      }
    }

    dragStartX.current = null;
    dragDelta.current = 0;
  };

  const handleImageClick = () => {
    if (!isDragging.current) {
      setImgZoomed(true);
    }
    isDragging.current = false;
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

  const selectedSizeObj = useMemo(() => {
    if (!product || !selectedSize) return undefined;
    return product.sizes.find(
      (s) => String(s.value) === String(selectedSize)
    );
  }, [product, selectedSize]);

  const shopQty = Number(selectedSizeObj?.stockOffline ?? 0);
  const wbQty = Number(selectedSizeObj?.stockWB ?? 0);

  const priceTotals = useMemo(
    () =>
      calculateTotals(
        [{ price: product?.price ?? 0, quantity: 1 }],
        appliedPromo
      ),
    [product?.price, appliedPromo]
  );
  const promoPercent = priceTotals.discountPercent;
  const finalPrice = priceTotals.total;

  const applyPromo = () => {
    if (!promoCode.trim() && appliedPromo) {
      clearPromoCode();
      toast.info("Промокод удалён");
      return;
    }

    const result = applyPromoCode(promoCode);
    if (!result.ok) {
      setPromoError(true);
      analytics.applyPromo(promoCode.trim().toUpperCase(), false);
      return;
    }
    setPromoError(false);
    setPromoCode(result.promo.code);
    analytics.applyPromo(result.promo.code, true);
  };

  const runPurchase = (intent: PurchaseIntent, size: string | null) => {
    if (!product) return;
    const color = selectedColor || null;
    const productSize = hasSizes(product) ? size : null;

    if (hasSizes(product) && !productSize) {
      setSizeSheet({ open: true, intent });
      return;
    }

    if (intent === "cart") {
      const result = addToCart(product, { size: productSize, color });

      if (result.status === "added" || result.status === "increased") {
        analytics.addToCart(product.id, product.name, product.price);
        toast.success(
          result.status === "added"
            ? "Товар добавлен в корзину"
            : `Количество в корзине обновлено: ${result.quantity} шт.`,
          { action: { label: "Корзина", to: "/cart" } }
        );
      } else if (result.status === "max_reached") {
        toast.info(`В корзине уже всё, что есть в наличии: ${result.max} шт.`, {
          action: { label: "Корзина", to: "/cart" },
        });
      } else if (result.status === "size_required") {
        setSizeSheet({ open: true, intent });
      } else {
        toast.error(
          "Этот размер сейчас нельзя заказать на сайте. Выберите другой размер."
        );
      }
      return;
    }

    if (getMaxQuantity(product, productSize) <= 0) {
      toast.error(
        "Этот размер сейчас нельзя заказать на сайте. Выберите другой размер."
      );
      return;
    }
    startBuyNow(product, { size: productSize, color });
    analytics.beginCheckout(1, finalPrice);
    navigate("/checkout");
  };

  const handlePurchase = (intent: PurchaseIntent) => {
    if (!product) return;
    if (hasSizes(product) && !selectedSize) {
      setSizeSheet({ open: true, intent });
      return;
    }
    runPurchase(intent, selectedSize);
  };

  const openWildberries = () => {
    if (product?.wbUrl) {
      analytics.clickWildberries(product.id);
      window.open(product.wbUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleBackToCatalog = () => {
    window.history.back();
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
        <div className="max-w-md px-5 text-center">
          <p className="mb-6 text-6xl font-black text-white/20">
            {catalogError ? "!" : "404"}
          </p>
          <p className="mb-3 text-lg text-white/70">
            {catalogError ? "Не удалось загрузить карточку товара" : "Товар не найден"}
          </p>
          <p className="mb-8 text-sm leading-relaxed text-white/40">
            {catalogError
              ? "Каталог временно недоступен. Проверьте соединение и попробуйте ещё раз."
              : "Возможно, товар был удалён или ссылка указана неверно."}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {catalogError && (
              <button
                type="button"
                onClick={() => setRetryCount((count) => count + 1)}
                className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-white/90"
              >
                Повторить загрузку
              </button>
            )}
            <Link
              to="/catalog"
              className="glass rounded-xl px-5 py-3 text-sm text-white transition-colors hover:bg-white/10"
            >
              Вернуться в каталог
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const selectedInfo = getSizeInfoByValue(product, selectedSize);
  const orderableOnSite = isProductOrderable(product);
  const showWbButton =
    Boolean(selectedInfo?.wbOnly) ||
    (!selectedInfo && !orderableOnSite && hasWbStock(product));
  const showUnavailable =
    !showWbButton && (Boolean(selectedInfo?.unavailable) || !orderableOnSite);

  return (
    <main className="min-h-screen pt-16 pb-32">
      <div className="w-full px-3 sm:px-5 md:px-8 lg:px-10 xl:px-12 2xl:px-16">
        <nav
          aria-label="Хлебные крошки"
          className="flex items-center gap-2 py-5 text-sm text-white/35"
        >
          <Link to="/" className="hover:text-white transition-colors">
            Главная
          </Link>
          <span>/</span>
          <button
            onClick={handleBackToCatalog}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Каталог
          </button>
          <span>/</span>
          <span className="text-white/60 truncate max-w-[260px]">
            {product.name}
          </span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,540px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,600px)_minmax(0,1fr)] gap-8 lg:gap-12 xl:gap-16 items-start">
          {/* Галерея */}
          <div className="space-y-4">
            <div
              className="relative aspect-[3/4] sm:aspect-square rounded-3xl overflow-hidden bg-white/4 border border-white/8 select-none cursor-grab active:cursor-grabbing touch-pan-y"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={() => {
                dragStartX.current = null;
              }}
            >
              {hasImages ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={gallery[activePhoto]?.src ?? activePhoto}
                    initial={{ opacity: 0, scale: 1.02 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="w-full h-full"
                  >
                    {gallery[activePhoto]?.type === "video" ? (
                      <video
                        src={gallery[activePhoto].src}
                        controls
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={gallery[activePhoto]?.src}
                        onClick={handleImageClick}
                        alt={`${product.name} — фото ${activePhoto + 1}`}
                        className="w-full h-full object-cover cursor-zoom-in"
                        loading={activePhoto === 0 ? "eager" : "lazy"}
                        draggable={false}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/10">
                  <span className="text-7xl">📦</span>
                </div>
              )}

              {gallery.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrevPhoto();
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-white/20 flex items-center justify-center text-white transition-all z-10"
                    aria-label="Предыдущее фото"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextPhoto();
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-white/20 flex items-center justify-center text-white transition-all z-10"
                    aria-label="Следующее фото"
                  >
                    <ChevronRight size={18} />
                  </button>
                </>
              )}

              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {product.isNew && (
                  <span className="bg-white text-black text-xs font-bold px-3 py-1 rounded-lg">
                    NEW
                  </span>
                )}
              </div>
            </div>

            {/* Миниатюры */}
            {gallery.length > 1 && (
              <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2">
                {gallery.map((item, i) => (
                  <button
                    key={`${item.src}-${i}`}
                    type="button"
                    onClick={() => setActivePhoto(i)}
                    className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                      i === activePhoto
                        ? "border-white ring-2 ring-white/50"
                        : "border-white/10 hover:border-white/30"
                    }`}
                    aria-label={`Фото ${i + 1}`}
                    aria-pressed={i === activePhoto}
                  >
                    {item.type === "video" ? (
                      <div className="w-full h-full flex items-center justify-center bg-black/20 text-white">
                        ▶
                      </div>
                    ) : (
                      <img
                        src={item.src}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col max-w-2xl"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                {product.brand && (
                  <>
                    <span className="text-white font-bold text-xs uppercase tracking-wider">
                      {product.brand}
                    </span>
                    <span className="text-white/20">·</span>
                  </>
                )}
                <span className="text-white/40 text-xs uppercase tracking-widest">
                  {product.category}
                </span>
                {product.gender && (
                  <>
                    <span className="text-white/15">·</span>
                    <span className="text-white/40 text-xs">
                      {product.gender}
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void shareProductWithFeedback(product)}
                  className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/30 transition-all"
                  aria-label="Поделиться"
                >
                  <Share2 size={15} />
                </button>
                <button
                  onClick={() => toggle(product.id)}
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${
                    fav
                      ? "bg-white border-white text-rose-500"
                      : "border-white/10 text-white/40 hover:text-white hover:border-white/30"
                  }`}
                  aria-label={
                    fav ? "Убрать из избранного" : "Добавить в избранное"
                  }
                  aria-pressed={fav}
                >
                  <Heart size={15} fill={fav ? "currentColor" : "none"} />
                </button>
              </div>
            </div>

            <h1 className="text-white font-black text-2xl md:text-3xl tracking-tight leading-tight mb-4">
              {product.name}
            </h1>

            {/* Оценка и количество отзывов — показываем только если отзывы/оценки реально есть */}
            {hasReviews && (
              <div className="flex items-center gap-3 mb-5">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={14}
                      className={
                        s <= Math.round(ratingValue)
                          ? "text-amber-400 fill-amber-400"
                          : "text-white/15"
                      }
                    />
                  ))}
                </div>
                <span className="text-white font-bold text-sm">
                  {ratingValue}
                </span>
                <Link
                  to={`/reviews?product=${encodeURIComponent(product.id)}`}
                  className="text-white/50 text-sm underline decoration-white/25 underline-offset-2 hover:text-white transition-colors"
                >
                  {reviewsCount} {reviewsWord(reviewsCount)}
                </Link>
              </div>
            )}

            <div className="flex items-baseline gap-3 mb-5">
              <span className="text-white font-black text-3xl sm:text-4xl">
                {formatPrice(product.price)}
              </span>
              {(product.oldPrice ?? 0) > product.price && (
                <span className="text-white/35 text-lg line-through">
                  {formatPrice(product.oldPrice ?? 0)}
                </span>
              )}
            </div>

            {/* Промокод */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value);
                    if (promoError) setPromoError(false);
                  }}
                  placeholder="Промокод"
                  className="w-full bg-white/10 border border-white/20 text-white px-4 py-3 rounded-xl outline-none focus:border-white/40"
                />
                <button
                  type="button"
                  onClick={applyPromo}
                  className="px-5 py-3 rounded-xl bg-white text-black font-medium shrink-0"
                >
                  Применить
                </button>
              </div>

              {promoError && (
                <div className="text-rose-400 text-sm mt-2">
                  Промокод не найден
                </div>
              )}

              {appliedPromo && (
                <div className="text-white/40 text-sm mt-2">
                  Скидка по промокоду: -{promoPercent}% &nbsp; Итоговая цена:{" "}
                  {formatPrice(finalPrice)}{" "}
                  <button
                    type="button"
                    onClick={() => {
                      clearPromoCode();
                      setPromoCode("");
                      toast.info("Промокод удалён");
                    }}
                    className="ml-1 text-white/60 underline underline-offset-2 hover:text-white"
                  >
                    Убрать
                  </button>
                </div>
              )}
            </div>

            {product.colors?.length > 0 && (
              <div className="mb-6">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-3">
                  Цвет: <span className="text-white">{selectedColor}</span>
                </p>
                <div className="flex gap-2 flex-wrap">
                  {product.colors.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setSelectedColor(color.name)}
                      className={`group relative w-8 h-8 rounded-full border-2 transition-all ${
                        selectedColor === color.name
                          ? "border-white scale-110"
                          : "border-white/20 hover:border-white/50"
                      }`}
                      style={{ backgroundColor: color.code ?? "#ffffff" }}
                      aria-label={color.name}
                      aria-pressed={selectedColor === color.name}
                    >
                      {selectedColor === color.name && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <Check
                            size={12}
                            className={
                              (color.code ?? "#ffffff") === "#ffffff"
                                ? "text-black"
                                : "text-white"
                            }
                          />
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

                <ProductSizePicker
                  product={product}
                  selectedSize={selectedSize}
                  onSelect={(size) => {
                    setSelectedSize((prev) => (prev === size ? prev : size));
                  }}
                />
              </div>
            )}

            {/* Наличие по выбранному размеру */}
            <div className="glass rounded-2xl p-4 mb-6 border border-white/8">
              {!selectedSize && (
                <div>
                  <p className="text-white text-sm font-medium">
                    Выберите размер, чтобы увидеть наличие
                  </p>
                </div>
              )}

              {selectedSize && shopQty > 0 && (
                <div className="flex items-start gap-3 mb-3 pb-3 border-b border-white/8 last:mb-0 last:pb-0 last:border-b-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-white text-sm font-medium">
                      ✔ Есть в наличии в магазине
                    </p>
                    <p className="text-white/40 text-xs mt-1">
                      г. Изобильный, Ставропольский край, ул. Кирова, 2Г
                    </p>
                    <p className="text-white/30 text-xs">
                      Способы покупки: заказ на сайте, WhatsApp, Telegram, MAX
                    </p>
                  </div>
                </div>
              )}

              {selectedSize && wbQty > 0 && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-white text-sm font-medium">
                      ✔ Есть на Wildberries
                    </p>
                    <p className="text-white/40 text-xs mt-1">
                      Доставка со склада WB
                    </p>
                  </div>
                </div>
              )}

              {selectedSize && shopQty === 0 && wbQty === 0 && (
                <div>
                  <p className="text-white text-sm font-medium">
                    ❌ Нет в наличии
                  </p>
                </div>
              )}
            </div>

            {/* Кнопки */}
            <div className="flex flex-col gap-3">
              {showWbButton ? (
                <button
                  type="button"
                  onClick={openWildberries}
                  disabled={!product.wbUrl}
                  className="w-full py-4 rounded-2xl font-bold text-base bg-white text-black transition-all hover:bg-white/90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Купить на WB
                </button>
              ) : showUnavailable ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-4 rounded-2xl font-bold text-base bg-white/10 text-white/40 cursor-not-allowed"
                >
                  Нет в наличии
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => handlePurchase("buy")}
                    className="min-h-14 rounded-2xl bg-white px-2 py-3 text-[13px] sm:text-base font-bold leading-tight text-black transition-all hover:bg-white/90 active:scale-[0.99]"
                  >
                    Купить сейчас
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePurchase("cart")}
                    className="min-h-14 rounded-2xl border border-[#a73afd] bg-[#a73afd] px-2 py-3 text-[13px] sm:text-base font-bold leading-tight text-white transition-all hover:bg-[#9327e8] active:scale-[0.99]"
                  >
                    Добавить в корзину
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <a
                  href={
                    selectedSize
                      ? `${contacts.whatsappUrl}?text=Хочу заказать: ${product.name}, размер ${selectedSize}`
                      : "#"
                  }
                  target={selectedSize ? "_blank" : undefined}
                  rel={selectedSize ? "noopener noreferrer" : undefined}
                  onClick={(e) => {
                    if (!selectedSize) {
                      e.preventDefault();
                      return;
                    }
                    analytics.clickContact("whatsapp");
                  }}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
                    selectedSize
                      ? "bg-green-600/15 border border-green-600/25 text-green-400 hover:bg-green-600/25"
                      : "bg-green-600/8 border border-green-600/15 text-green-400/50 cursor-not-allowed"
                  }`}
                >
                  <MessageCircle size={16} />
                  WhatsApp
                </a>
                <a
                  href={
                    selectedSize
                      ? `${contacts.telegramUrl}?text=Хочу заказать: ${product.name}, размер ${selectedSize}`
                      : "#"
                  }
                  target={selectedSize ? "_blank" : undefined}
                  rel={selectedSize ? "noopener noreferrer" : undefined}
                  onClick={(e) => {
                    if (!selectedSize) {
                      e.preventDefault();
                      return;
                    }
                    analytics.clickContact("telegram");
                  }}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
                    selectedSize
                      ? "bg-blue-600/15 border border-blue-600/25 text-blue-400 hover:bg-blue-600/25"
                      : "bg-blue-600/8 border border-blue-600/15 text-blue-400/50 cursor-not-allowed"
                  }`}
                >
                  <MessageCircle size={16} />
                  Telegram
                </a>
              </div>

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

            <div className="mt-8 space-y-3 border-t border-white/8 pt-6">
              <div className="rounded-2xl border border-white/8 bg-white/4">
                <button
                  onClick={() =>
                    setOpenSection((value) =>
                      value === "about" ? null : "about"
                    )
                  }
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                    О товаре
                  </span>
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${
                      openSection === "about" ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {openSection === "about" && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="px-4 pb-4 text-sm leading-relaxed text-white/50">
                        {product.description ||
                          "Подробное описание будет добавлено позже."}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/4">
                <button
                  onClick={() =>
                    setOpenSection((value) =>
                      value === "details" ? null : "details"
                    )
                  }
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                    Характеристики
                  </span>
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${
                      openSection === "details" ? "rotate-180" : ""
                    }`}
                  />
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
                          <div
                            key={item.label}
                            className="flex items-center justify-between gap-4 border-b border-white/8 py-2 last:border-b-0"
                          >
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
                  onClick={() =>
                    setOpenSection((value) =>
                      value === "delivery" ? null : "delivery"
                    )
                  }
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                    Доставка и оплата
                  </span>
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${
                      openSection === "delivery" ? "rotate-180" : ""
                    }`}
                  />
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
                        Оформите заказ на сайте: выберите пункт выдачи в
                        Изобильном или доставку по России (Wildberries, OZON,
                        Яндекс, CDEK, Почта России). Возможен и самовывоз по
                        адресу г. Изобильный, ул. Кирова, 2Г. Также можно
                        обратиться через WhatsApp, Telegram или MAX.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Блок отзывов к товару (если есть отзывы) */}
        {productReviews.length > 0 && (
          <section className="mt-16 border-t border-white/8 pt-12">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-white font-black text-2xl sm:text-3xl tracking-tight">
                  Отзывы покупателей
                </h2>
                <div className="flex items-center gap-2 mt-1.5">
                  <Star
                    size={15}
                    className="text-amber-400 fill-amber-400"
                  />
                  <span className="text-white font-bold text-sm">
                    {ratingValue}
                  </span>
                  <span className="text-white/40 text-sm">
                    · {productReviews.length}{" "}
                    {reviewsWord(productReviews.length)}
                  </span>
                </div>
              </div>
              <Link
                to={`/reviews?product=${encodeURIComponent(product.id)}`}
                className="text-xs sm:text-sm font-medium text-[#c98bff] hover:text-white transition-colors"
              >
                Смотреть все →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {productReviews.map((review) => (
                <div
                  key={review.id}
                  className="glass rounded-2xl p-5 border border-white/8 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold text-sm">
                          {review.name}
                        </span>
                        {review.verified && (
                          <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px]">
                            <CheckCircle2 size={12} />
                            Покупка
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={12}
                            className={
                              s <= review.rating
                                ? "text-amber-400 fill-amber-400"
                                : "text-white/15"
                            }
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-white/75 text-sm leading-relaxed">
                      {review.text}
                    </p>
                  </div>
                  <p className="text-white/30 text-xs">
                    {new Date(review.date).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Похожие товары — идут все подряд до конца без обрезки */}
        {related.length > 0 && (
          <section className="mt-16 pt-12 border-t border-white/8" aria-labelledby="related-title">
            <div className="flex items-baseline justify-between gap-4 mb-6">
              <h2
                id="related-title"
                className="text-white font-black text-2xl sm:text-3xl tracking-tight"
              >
                Похожие товары
              </h2>
              <span className="text-white/35 text-xs sm:text-sm">
                {related.length} товаров
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 min-[1920px]:grid-cols-7 gap-3 sm:gap-4 md:gap-5">
              {related.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* «Выберите размер» */}
      <SizeSheet
        open={sizeSheet.open}
        product={product}
        selectedSize={selectedSize}
        onClose={() => setSizeSheet((state) => ({ ...state, open: false }))}
        onSelect={(size) => {
          setSelectedSize(size);
          setSizeSheet((state) => ({ ...state, open: false }));
          runPurchase(sizeSheet.intent, size);
        }}
      />

      {/* Fullscreen viewer */}
      <AnimatePresence>
        {imgZoomed && hasImages && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] flex items-center justify-center bg-black/95 p-4"
            onClick={() => setImgZoomed(false)}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {gallery[activePhoto]?.type === "video" ? (
              <video
                src={gallery[activePhoto].src}
                controls
                className="max-w-full max-h-full object-contain rounded-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <motion.img
                src={gallery[activePhoto]?.src}
                alt={product.name}
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="max-w-full max-h-full object-contain rounded-2xl select-none"
                onClick={(e) => e.stopPropagation()}
                draggable={false}
              />
            )}

            {gallery.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevPhoto();
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
                  aria-label="Предыдущее фото"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNextPhoto();
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
                  aria-label="Следующее фото"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                setImgZoomed(false);
              }}
              className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors text-2xl"
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
