import { useEffect } from "react";
import { motion } from "framer-motion";
import ContactsSection from "../components/sections/ContactsSection";
import { seo } from "../store-data/seo";

export default function ContactsPage() {
  useEffect(() => {
    document.title = seo.contacts.title;
  }, []);

  return (
    <main className="min-h-screen pt-20 pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="py-12"
        >
          <p className="text-white/30 text-xs font-medium tracking-[0.3em] uppercase mb-3">Связь с нами</p>
          <h1 className="text-white font-black text-4xl md:text-6xl tracking-tight mb-4">
            Контакты
          </h1>
          <p className="text-white/40 text-base max-w-lg">
            Мы работаем каждый день. Выберите удобный способ связи — ответим быстро.
          </p>
        </motion.div>
      </div>
      <ContactsSection />
    </main>
  );
}
