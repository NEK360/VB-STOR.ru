import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import { faq } from "../store-data/faq";
import { seo } from "../store-data/seo";

export default function FAQPage() {
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    document.title = seo.faq.title;
  }, []);

  return (
    <main className="min-h-screen pt-20 pb-32">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="py-12 text-center"
        >
          <p className="text-white/30 text-xs font-medium tracking-[0.3em] uppercase mb-3">Помощь</p>
          <h1 className="text-white font-black text-4xl md:text-6xl tracking-tight mb-4">
            Частые вопросы
          </h1>
          <p className="text-white/40 text-base max-w-md mx-auto">
            Ответы на самые популярные вопросы о заказе, доставке и оплате
          </p>
        </motion.div>

        {/* FAQ Accordion */}
        <div className="flex flex-col gap-3">
          {faq.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-20px" }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <div
                className={`glass rounded-2xl border transition-all duration-300 overflow-hidden ${
                  open === item.id ? "border-white/20" : "border-white/6 hover:border-white/12"
                }`}
              >
                <button
                  onClick={() => setOpen(open === item.id ? null : item.id)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                  aria-expanded={open === item.id}
                  aria-controls={`faq-answer-${item.id}`}
                >
                  <div className="flex-1">
                    {item.category && (
                      <span className="text-white/25 text-[10px] uppercase tracking-wider block mb-1">
                        {item.category}
                      </span>
                    )}
                    <span className="text-white font-medium text-sm leading-relaxed">
                      {item.question}
                    </span>
                  </div>
                  <div className={`shrink-0 w-7 h-7 rounded-full border flex items-center justify-center transition-all ${
                    open === item.id ? "border-white/30 bg-white/10" : "border-white/10"
                  }`}>
                    {open === item.id
                      ? <Minus size={14} className="text-white" />
                      : <Plus size={14} className="text-white/50" />
                    }
                  </div>
                </button>

                <AnimatePresence>
                  {open === item.id && (
                    <motion.div
                      id={`faq-answer-${item.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      role="region"
                    >
                      <div className="px-6 pb-5">
                        <div className="h-px bg-white/6 mb-4" />
                        <p className="text-white/50 text-sm leading-relaxed">{item.answer}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 text-center glass rounded-3xl p-8 border border-white/8"
        >
          <p className="text-white font-bold text-lg mb-2">Не нашли ответ?</p>
          <p className="text-white/40 text-sm mb-6">Задайте вопрос напрямую — ответим быстро</p>
          <div className="flex justify-center gap-4 flex-wrap">
            <a
              href="https://wa.me/79187970230"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-green-600/20 border border-green-600/30 text-green-400 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-green-600/30 transition-all"
            >
              WhatsApp
            </a>
            <a
              href="https://t.me/VB_STORE_IZOB"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-blue-600/20 border border-blue-600/30 text-blue-400 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-600/30 transition-all"
            >
              Telegram
            </a>
            <a
              href="tel:79187970230"
              className="flex items-center gap-2 bg-white/8 border border-white/15 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-white/12 transition-all"
            >
              +7 918 797-02-30
            </a>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
