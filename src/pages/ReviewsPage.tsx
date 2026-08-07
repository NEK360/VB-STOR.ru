import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Star, CheckCircle, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { reviews, type Review } from "../store-data/reviews";
import { loadProducts, type Product } from "../lib/api";

function formatDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

interface ReviewCardProps {
  review: Review;
  product?: Product;
  highlighted: boolean;
}

function ReviewCard({ review, product, highlighted }: ReviewCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlighted && ref.current) {
      // Небольшая задержка, чтобы анимация входа успела сработать
      const timer = setTimeout(() => {
        ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [highlighted]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      id={`review-${review.id}`}
      className={`
        rounded-2xl border p-5 transition-all duration-700
        ${
          highlighted
            ? "border-yellow-400/60 bg-yellow-400/8 shadow-[0_0_24px_rgba(250,204,21,0.15)] ring-2 ring-yellow-400/30"
            : "border-white/8 bg-white/4"
        }
      `}
    >
      {/* Шапка */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white font-semibold text-sm">
              {review.name}
            </span>
            {review.verified && (
              <span className="flex items-center gap-1 text-emerald-400 text-xs">
                <CheckCircle size={12} />
                Подтверждено
              </span>
            )}
            {highlighted && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 font-medium border border-yellow-400/30">
                ← Этот отзыв
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={13}
                className={
                  s <= review.rating
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-white/15"
                }
              />
            ))}
          </div>
        </div>
        <span className="text-white/30 text-xs shrink-0">
          {formatDate(review.date)}
        </span>
      </div>

      {/* Продукт */}
      {product && (
        <Link
          to={`/product/${product.id}`}
          className="flex items-center gap-2 mb-3 group"
        >
          {product.images?.[0] && (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-10 h-10 rounded-lg object-cover border border-white/10 group-hover:border-white/30 transition-colors"
              loading="lazy"
            />
          )}
          <span className="text-white/40 text-xs group-hover:text-white/70 transition-colors truncate max-w-[200px]">
            {product.name}
          </span>
        </Link>
      )}

      {/* Текст */}
      <p className="text-white/70 text-sm leading-relaxed">{review.text}</p>
    </motion.div>
  );
}

export default function ReviewsPage() {
  const [searchParams] = useSearchParams();
  const productParam = searchParams.get("product");
  const reviewParam = searchParams.get("review");

  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    loadProducts()
      .then((p) => setProducts(p))
      .catch(console.error);
  }, []);

  // Фильтрация отзывов
  const filteredReviews = productParam
    ? reviews.filter(
        (r) =>
          String(r.productId) === String(productParam)
      )
    : reviews;

  // Найти продукт для заголовка
  const currentProduct = productParam
    ? products.find((p) => String(p.id) === String(productParam))
    : undefined;

  // Подсчёт средней оценки
  const avgRating =
    filteredReviews.length > 0
      ? filteredReviews.reduce((sum, r) => sum + r.rating, 0) /
        filteredReviews.length
      : 0;

  function getProductForReview(review: Review): Product | undefined {
    if (!review.productId) return undefined;
    return products.find((p) => String(p.id) === String(review.productId));
  }

  return (
    <main className="min-h-screen pt-16 pb-32">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Хлебные крошки */}
        <nav
          aria-label="Хлебные крошки"
          className="flex items-center gap-2 py-6 text-sm text-white/30"
        >
          <Link to="/" className="hover:text-white transition-colors">
            Главная
          </Link>
          <span>/</span>
          {productParam && currentProduct ? (
            <>
              <Link
                to="/catalog"
                className="hover:text-white transition-colors"
              >
                Каталог
              </Link>
              <span>/</span>
              <Link
                to={`/product/${currentProduct.id}`}
                className="hover:text-white transition-colors truncate max-w-[160px]"
              >
                {currentProduct.name}
              </Link>
              <span>/</span>
              <span className="text-white/60">Отзывы</span>
            </>
          ) : (
            <span className="text-white/60">Все отзывы</span>
          )}
        </nav>

        {/* Заголовок */}
        <div className="mb-8">
          {currentProduct ? (
            <div className="flex items-center gap-4 mb-4">
              <Link
                to={`/product/${currentProduct.id}`}
                className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/30 transition-all"
                aria-label="Назад к товару"
              >
                <ArrowLeft size={16} />
              </Link>
              <div className="flex items-center gap-3">
                {currentProduct.images?.[0] && (
                  <img
                    src={currentProduct.images[0]}
                    alt={currentProduct.name}
                    className="w-12 h-12 rounded-xl object-cover border border-white/10"
                    loading="lazy"
                  />
                )}
                <div>
                  <p className="text-white/40 text-xs mb-0.5">
                    {currentProduct.brand}
                  </p>
                  <h1 className="text-white font-bold text-lg leading-snug line-clamp-2">
                    {currentProduct.name}
                  </h1>
                </div>
              </div>
            </div>
          ) : (
            <h1 className="text-white font-black text-3xl tracking-tight mb-2">
              Все отзывы
            </h1>
          )}

          {/* Статистика */}
          {filteredReviews.length > 0 && (
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={16}
                    className={
                      s <= Math.round(avgRating)
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-white/15"
                    }
                  />
                ))}
              </div>
              <span className="text-white font-bold">
                {avgRating.toFixed(1)}
              </span>
              <span className="text-white/40 text-sm">
                {filteredReviews.length}{" "}
                {filteredReviews.length === 1
                  ? "отзыв"
                  : filteredReviews.length >= 2 && filteredReviews.length <= 4
                    ? "отзыва"
                    : "отзывов"}
              </span>
            </div>
          )}
        </div>

        {/* Список отзывов */}
        {filteredReviews.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-white/20 text-6xl mb-4">💬</p>
            <p className="text-white/40 text-lg">Отзывов пока нет</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                product={
                  productParam
                    ? undefined
                    : getProductForReview(review)
                }
                highlighted={
                  reviewParam !== null && String(review.id) === String(reviewParam)
                }
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
