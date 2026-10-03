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
      <div className="w-full px-3 sm:px-5 md:px-8 lg:px-10 xl:px-12 2xl:px-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="pt-8 pb-4"
        >
          <p className="text-white/30 text-xs font-medium tracking-[0.3em] uppercase mb-3">
            Связь с нами
          </p>
          <h1 className="text-white font-black text-3xl sm:text-4xl md:text-6xl tracking-tight mb-4">
            Контакты
          </h1>
          <p className="text-white/40 text-base max-w-lg">
            Мы работаем каждый день. Выберите удобный способ связи или постройте маршрут до магазина на карте.
          </p>
        </motion.div>
      </div>
      <ContactsSection />
    </main>
  );
}
