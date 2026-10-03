import { motion } from "framer-motion";
import {
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  Clock,
  ExternalLink,
  Navigation,
} from "lucide-react";
import { contacts } from "../../store-data/contacts";
import { analytics } from "../../lib/analytics";

export default function ContactsSection() {
  const contactItems = [
    {
      icon: Phone,
      label: "Телефон",
      value: contacts.phone,
      href: `tel:${contacts.phoneClean}`,
      method: "phone",
    },
    {
      icon: MessageCircle,
      label: "WhatsApp",
      value: contacts.whatsapp,
      href: contacts.whatsappUrl,
      method: "whatsapp",
      external: true,
    },
    {
      icon: MessageCircle,
      label: "Telegram",
      value: contacts.telegram,
      href: contacts.telegramUrl,
      method: "telegram",
      external: true,
    },
    {
      icon: MessageCircle,
      label: "MAX",
      value: contacts.max,
      href: contacts.maxUrl,
      method: "max",
      external: true,
    },
    {
      icon: MessageCircle,
      label: "VK",
      value: contacts.vk,
      href: contacts.vkUrl,
      method: "vk",
      external: true,
    },
    {
      icon: Mail,
      label: "Email",
      value: contacts.email,
      href: `mailto:${contacts.email}`,
      method: "email",
    },
  ];

  return (
    <section
      className="py-16 md:py-20 border-t border-white/6"
      aria-labelledby="contacts-title"
    >
      <div className="w-full px-3 sm:px-5 md:px-8 lg:px-10 xl:px-12 2xl:px-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 md:mb-16"
        >
          <p className="text-white/30 text-xs font-medium tracking-[0.3em] uppercase mb-3">
            Связь
          </p>
          <h2
            id="contacts-title"
            className="text-white font-black text-3xl sm:text-4xl md:text-5xl tracking-tight mb-4"
          >
            Контакты
          </h2>
          <p className="text-white/40 text-base max-w-md mx-auto">
            Мы всегда на связи. Выберите удобный способ или приходите в наш магазин.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Contact cards */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {contactItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.a
                  key={item.label}
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  onClick={() => analytics.clickContact(item.method)}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  whileHover={{ y: -2 }}
                  className="glass rounded-2xl p-5 border border-white/6 hover:border-white/20 transition-all duration-300 group flex flex-col justify-between"
                  aria-label={`${item.label}: ${item.value}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white/8 flex items-center justify-center">
                      <Icon
                        size={18}
                        className="text-white/70 group-hover:text-white transition-colors"
                      />
                    </div>
                    {item.external && (
                      <ExternalLink
                        size={14}
                        className="text-white/20 group-hover:text-white/50 transition-colors"
                      />
                    )}
                  </div>
                  <div>
                    <p className="text-white/40 text-xs mb-1 uppercase tracking-wider">
                      {item.label}
                    </p>
                    <p className="text-white font-medium text-sm break-all">
                      {item.value}
                    </p>
                  </div>
                </motion.a>
              );
            })}
          </div>

          {/* Address + Hours */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="lg:col-span-5 glass rounded-2xl p-6 border border-white/6 flex flex-col justify-between gap-6"
          >
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#a73afd]/20 border border-[#a73afd]/30 flex items-center justify-center">
                    <MapPin size={18} className="text-[#c98bff]" />
                  </div>
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wider">
                      Адрес магазина
                    </p>
                    <p className="text-white font-bold text-sm">VB STORE</p>
                  </div>
                </div>
                <p className="text-white font-medium">{contacts.city}</p>
                <p className="text-white/50 text-sm">{contacts.region}</p>
                <p className="text-white/70 text-sm font-medium mt-0.5">
                  {contacts.street}
                </p>
              </div>

              <div className="h-px bg-white/6" />

              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-white/8 flex items-center justify-center">
                    <Clock size={18} className="text-white/70" />
                  </div>
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wider">
                      Режим работы
                    </p>
                    <p className="text-white font-medium text-sm">
                      {contacts.workingHours}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-white/6" />

            {/* Quick order & map buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href={contacts.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => analytics.clickContact("whatsapp")}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-green-600/15 border border-green-600/25 text-green-400 text-sm font-medium hover:bg-green-600/25 transition-all"
              >
                <MessageCircle size={16} />
                WhatsApp
              </a>
              <a
                href={contacts.telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => analytics.clickContact("telegram")}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600/15 border border-blue-600/25 text-blue-400 text-sm font-medium hover:bg-blue-600/25 transition-all"
              >
                <MessageCircle size={16} />
                Telegram
              </a>
            </div>
          </motion.div>
        </div>

        {/* ВИЗУАЛ КАРТЫ МЕСТОПОЛОЖЕНИЯ МАГАЗИНА */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8 rounded-3xl overflow-hidden border border-white/10 bg-[#121215] shadow-2xl"
        >
          {/* Шапка карточки карты */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:px-6 border-b border-white/8 bg-white/[0.03]">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#a73afd]/20 border border-[#a73afd]/40 flex items-center justify-center shrink-0">
                <MapPin size={20} className="text-[#c98bff]" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-white font-bold text-base sm:text-lg">
                    Наш магазин на карте
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {contacts.workingHours}
                  </span>
                </div>
                <p className="text-white/60 text-xs sm:text-sm mt-0.5">
                  {contacts.address}
                </p>
              </div>
            </div>

            <a
              href={contacts.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => analytics.clickContact("map")}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#a73afd] hover:bg-[#9327e8] text-white text-xs sm:text-sm font-bold transition-all shrink-0 shadow-lg shadow-purple-950/50"
            >
              <Navigation size={15} />
              Открыть в Яндекс Картах
              <ExternalLink size={13} className="opacity-75" />
            </a>
          </div>

          {/* Интерактивная Яндекс Карта */}
          <div className="relative w-full h-[360px] sm:h-[440px] lg:h-[480px] bg-zinc-900">
            <iframe
              src={contacts.mapEmbedUrl}
              title="Карта расположения магазина VB STORE — г. Изобильный, ул. Кирова, 2Г"
              className="w-full h-full border-0"
              allowFullScreen
              loading="lazy"
            />

            {/* Плавающая плашка поверх карты в левом нижнем углу */}
            <div className="pointer-events-none hidden sm:flex absolute bottom-4 left-4 z-10 items-center gap-3 rounded-2xl bg-black/85 backdrop-blur-md border border-white/15 px-4 py-3 shadow-xl">
              <div className="w-9 h-9 rounded-xl bg-[#a73afd] flex items-center justify-center text-white font-black text-xs shrink-0">
                VB
              </div>
              <div>
                <p className="text-white text-xs font-bold leading-tight">
                  VB STORE — {contacts.city}, {contacts.street}
                </p>
                <p className="text-white/50 text-[11px] mt-0.5">
                  Самовывоз и примерка в магазине · {contacts.workingHours}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
