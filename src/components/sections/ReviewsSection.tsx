import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { reviews } from "../../store-data/reviews";

export default function ReviewsSection() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === "right" ? 320 : -320, behavior: "smooth" });
    }
  };

  const avgRating = (reviews.reduce((a, b) => a + b.rating, 0) / reviews.length).toFixed(1);

  return (
    <section className="py-20" aria-labelledby="reviews-title">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex items-end justify-between mb-12"
        >
          <div>
            <p className="text-white/30 text-xs font-medium tracking-[0.3em] uppercase mb-3">Что говорят клиенты</p>
            <h2 id="reviews-title" className="text-white font-black text-4xl md:text-5xl tracking-tight">
              Отзывы
            </h2>
            <div className="flex items-center gap-2 mt-3">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={16} className="text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <span className="text-white font-bold">{avgRating}</span>
              <span className="text-white/30 text-sm">из {reviews.length} отзывов</span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-3">
            <button onClick={() => scroll("left")} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/30 transition-all" aria-label="Назад">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => scroll("right")} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/30 transition-all" aria-label="Вперёд">
              <ChevronRight size={18} />
            </button>
          </div>
        </motion.div>

        {/* Reviews scroll */}
        <div ref={scrollRef} className="flex gap-4 overflow-x-auto scrollbar-none pb-4 -mx-4 px-4">
          {reviews.map((review, i) => (
            <motion.article
              key={review.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="shrink-0 w-72 sm:w-80 glass rounded-2xl p-6 border border-white/6 hover:border-white/12 transition-colors"
              aria-label={`Отзыв от ${review.name}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-sm">
                    {review.name[0]}
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{review.name}</p>
                    <p className="text-white/30 text-xs">
                      {new Date(review.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                </div>
                {review.verified && (
                  <span className="text-emerald-400 text-[10px] font-medium px-2 py-0.5 rounded-full border border-emerald-400/20 bg-emerald-400/5">
                    ✓ Верифицирован
                  </span>
                )}
              </div>

              <div className="flex mb-3">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={13}
                    className={s <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-white/15"}
                  />
                ))}
              </div>

              <p className="text-white/60 text-sm leading-relaxed">{review.text}</p>
            </motion.article>
          ))}
        </div>

        {/* See all link */}
        <div className="text-center mt-10">
          <Link
            to="/reviews"
            className="inline-flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors group"
          >
            Все отзывы
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}
