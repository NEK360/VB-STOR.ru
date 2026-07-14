import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import { loadProducts } from "../../lib/api";
import { formatPrice } from "../../lib/utils";

interface HeroSlideData {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  primaryButton: { label: string; href: string };
  secondaryButton?: { label: string; href: string };
  image: string;
  accentColor: string;
  price: number;
}

function shorten(text: string, limit = 140) {
  const value = text.replace(/\s+/g, " ").trim();
  if (!value) return "Новые модели обуви и аксессуаров для повседневной носки.";
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}

export default function Hero() {
  const [current, setCurrent] = useState(0);
  const [_imgLoaded, setImgLoaded] = useState(false);
  const [slides, setSlides] = useState<HeroSlideData[]>([]);

  useEffect(() => {
    let isActive = true;

    async function loadSlides() {
      const products = await loadProducts();
      if (!isActive) return;

      const featured = products
        .filter((product) => product.images.length > 0 && (product.isFeatured || product.isNew || product.isSale || product.available))
        .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || Number(b.isNew) - Number(a.isNew) || b.price - a.price)
        .slice(0, 3);

      const mapped = featured.map((product) => ({
        id: product.id,
        title: product.name,
        subtitle: product.brand || "VB STORE",
        description: shorten(product.description),
        primaryButton: { label: "Купить", href: `/catalog/${product.id}` },
        secondaryButton: { label: "В каталог", href: "/catalog" },
        image: product.images[0],
        accentColor: "#ffffff",
        price: product.price,
      }));

      setSlides(mapped);
      setCurrent(0);
    }

    void loadSlides();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
      setImgLoaded(false);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const slide = slides[current] ?? {
    id: "fallback",
    title: "VB STORE",
    subtitle: "Обувь и аксессуары",
    description: "Подбираем комфортные и стильные модели для повседневной носки.",
    primaryButton: { label: "В каталог", href: "/catalog" },
    secondaryButton: { label: "Акции", href: "/sale" },
    image: "",
    accentColor: "#ffffff",
    price: 0,
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden" aria-label="Главный баннер">
      {slides.length === 0 ? (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-black to-zinc-800" />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="absolute inset-0"
          >
            {slide.image ? (
              <img
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-cover object-top"
                onLoad={() => setImgLoaded(true)}
                loading="eager"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-zinc-900 via-black to-zinc-800" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-black/10" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />
            <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOSIgbnVtT2N0YXZlcz0iNCIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNub2lzZSkiIG9wYWNpdHk9IjEiLz48L3N2Zz4=')]" />
          </motion.div>
        </AnimatePresence>
      )}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-white/3 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-white/2 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-20">
        <div className="max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full mb-6"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span className="text-white/80 text-sm font-medium tracking-widest uppercase">
                  {slide.subtitle}
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.7 }}
                className="font-black text-white leading-none tracking-tight mb-2"
                style={{ fontSize: "clamp(3rem, 10vw, 7rem)" }}
              >
                {slide.title}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="font-light text-white/60 tracking-[0.3em] uppercase text-xl mb-6"
              >
                {slide.price > 0 ? formatPrice(slide.price) : "От 2 400 ₽"}
              </motion.p>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-white/50 text-lg leading-relaxed mb-10 max-w-md"
              >
                {slide.description}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-wrap items-center gap-4"
              >
                <Link
                  to={slide.primaryButton.href}
                  className="group inline-flex items-center gap-3 bg-white text-black font-semibold px-8 py-4 rounded-2xl hover:bg-white/90 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-white/20"
                >
                  {slide.primaryButton.label}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                {slide.secondaryButton && (
                  <Link
                    to={slide.secondaryButton.href}
                    className="inline-flex items-center gap-3 glass text-white font-medium px-8 py-4 rounded-2xl hover:bg-white/10 transition-all duration-300"
                  >
                    {slide.secondaryButton.label}
                  </Link>
                )}
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => { setCurrent(i); setImgLoaded(false); }}
              className={`transition-all duration-300 rounded-full ${i === current ? "bg-white w-8 h-1.5" : "bg-white/30 w-4 h-1.5 hover:bg-white/50"}`}
              aria-label={`Слайд ${i + 1}`}
            />
          ))}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-10 right-8 flex flex-col items-center gap-2 z-10 hidden md:flex"
      >
        <span className="text-white/20 text-[10px] tracking-[0.3em] uppercase rotate-90 mb-4">Scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown size={18} className="text-white/30" />
        </motion.div>
      </motion.div>
    </section>
  );
}
