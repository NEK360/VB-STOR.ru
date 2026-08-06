import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { reviews } from "../store-data/reviews";
import { seo } from "../store-data/seo";

export default function ReviewsPage() {
  const [searchParams] = useSearchParams();
  const highlightProduct = searchParams.get("product");
  const highlightReview = searchParams.get("review");

  const [flash, setFlash] = useState(true);
  const nodeRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    document.title = seo.reviews.title;
  }, []);

  useEffect(() => {
    if (!highlightProduct && !highlightReview) return;

    // give the list a tick to render before scrolling
    const timer = setTimeout(() => {
      const targetId = highlightReview
        ? highlightReview
        : reviews.find((r) => String(r.productId) === String(highlightProduct))?.id;

      if (targetId && nodeRefs.current[targetId]) {
        nodeRefs.current[targetId]?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 150);

    const fadeTimer = setTimeout(() => setFlash(false), 3200);

    return () => {
      clearTimeout(timer);
      clearTimeout(fadeTimer);
    };
  }, [highlightProduct, highlightReview]);

  const isHighlighted = (review: (typeof reviews)[number]) => {
    if (!flash) return false;
    if (highlightReview) return String(review.id) === String(highlightReview);
    if (highlightProduct) return String(review.productId) === String(highlightProduct);
    return false;
  };

  const avgRating = (reviews.reduce((a, b) => a + b.rating, 0) / reviews.length).toFixed(1);
  const fiveStarCount = reviews.filter((r) => r.rating === 5).length;

  return (
    <main className="min-h-screen pt-20 pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="py-12">
          <p className="text-white/30 text-xs font-medium tracking-[0.3em] uppercase mb-3">Клиенты о нас</p>
          <h1 className="text-white font-black text-4xl md:text-6xl tracking-tight mb-6">Отзывы</h1>

          {/* Stats */}
          <div className="flex flex-wrap gap-6 mb-8">
            <div className="glass rounded-2xl px-6 py-4 border border-white/8">
              <div className="flex items-center gap-2 mb-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={16} className="text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <div className="text-white font-black text-3xl">{avgRating}</div>
              <div className="text-white/30 text-sm">средняя оценка</div>
            </div>
            <div className="glass rounded-2xl px-6 py-4 border border-white/8">
              <div className="text-white font-black text-3xl">{reviews.length}</div>
              <div className="text-white/30 text-sm">отзывов</div>
            </div>
            <div className="glass rounded-2xl px-6 py-4 border border-white/8">
              <div className="text-white font-black text-3xl">{fiveStarCount}</div>
              <div className="text-white/30 text-sm">оценок 5★</div>
            </div>
          </div>
        </motion.div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {reviews.map((review, i) => {
            const highlighted = isHighlighted(review);
            return (
              <motion.article
                key={review.id}
                ref={(el) => {
                  nodeRefs.current[review.id] = el;
                }}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ duration: 0.4, delay: i * 0.03 }}
                className={`glass rounded-2xl p-6 border transition-colors duration-500 ${
                  highlighted
                    ? "border-white bg-white/10 shadow-[0_0_0_3px_rgba(255,255,255,0.25)] animate-pulse"
                    : "border-white/6 hover:border-white/12"
                }`}
                aria-label={`Отзыв от ${review.name}`}
              >
                {/* Author */}
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center text-white font-bold">
                      {review.name[0]}
                    </div>
                    <div>
                      <p className="text-white font-medium">{review.name}</p>
                      <p className="text-white/30 text-xs">
                        {new Date(review.date).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  {review.verified && (
                    <span className="text-emerald-400 text-[10px] font-medium px-2 py-0.5 rounded-full border border-emerald-400/20 bg-emerald-400/5 shrink-0">
                      ✓ Верифицирован
                    </span>
                  )}
                </div>

                {/* Stars */}
                <div className="flex mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={15} className={s <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-white/15"} />
                  ))}
                </div>

                {/* Text */}
                <p className="text-white/60 text-sm leading-relaxed">{review.text}</p>
              </motion.article>
            );
          })}
        </div>

        {/* Write review CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 text-center glass rounded-3xl p-10 border border-white/8"
        >
          <p className="text-white font-bold text-xl mb-2">Хотите оставить отзыв?</p>
          <p className="text-white/40 text-sm mb-6">Напишите нам в WhatsApp или Telegram — мы будем рады вашему отзыву</p>
          <div className="flex justify-center gap-4 flex-wrap">
            <a
              href="https://wa.me/79187970230"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-green-600/20 border border-green-600/30 text-green-400 px-6 py-3 rounded-xl text-sm font-medium hover:bg-green-600/30 transition-all"
            >
              Написать в WhatsApp
            </a>
            <a
              href="https://t.me/VB_STORE_IZOB"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-blue-600/20 border border-blue-600/30 text-blue-400 px-6 py-3 rounded-xl text-sm font-medium hover:bg-blue-600/30 transition-all"
            >
              Написать в Telegram
            </a>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
