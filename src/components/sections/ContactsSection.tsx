import { motion } from "framer-motion";
import { Phone, MessageCircle, Mail, MapPin, Clock, ExternalLink } from "lucide-react";
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
      icon: Mail,
      label: "Email",
      value: contacts.email,
      href: `mailto:${contacts.email}`,
      method: "email",
    },
  ];

  return (
    <section className="py-20 border-t border-white/6" aria-labelledby="contacts-title">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-white/30 text-xs font-medium tracking-[0.3em] uppercase mb-3">Связь</p>
          <h2 id="contacts-title" className="text-white font-black text-4xl md:text-5xl tracking-tight mb-4">
            Контакты
          </h2>
          <p className="text-white/40 text-base max-w-md mx-auto">
            Мы всегда на связи. Выберите удобный способ.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contact cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  whileHover={{ y: -2 }}
                  className="glass rounded-2xl p-5 border border-white/6 hover:border-white/20 transition-all duration-300 group"
                  aria-label={`${item.label}: ${item.value}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white/8 flex items-center justify-center">
                      <Icon size={18} className="text-white/70 group-hover:text-white transition-colors" />
                    </div>
                    {item.external && (
                      <ExternalLink size={14} className="text-white/20 group-hover:text-white/50 transition-colors" />
                    )}
                  </div>
                  <p className="text-white/40 text-xs mb-1 uppercase tracking-wider">{item.label}</p>
                  <p className="text-white font-medium text-sm">{item.value}</p>
                </motion.a>
              );
            })}
          </div>

          {/* Address + Hours */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="glass rounded-2xl p-6 border border-white/6 flex flex-col gap-6"
          >
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/8 flex items-center justify-center">
                  <MapPin size={18} className="text-white/70" />
                </div>
                <p className="text-white/40 text-xs uppercase tracking-wider">Адрес магазина</p>
              </div>
              <p className="text-white font-medium">{contacts.city}</p>
              <p className="text-white/50 text-sm">{contacts.region}</p>
              <p className="text-white/50 text-sm">{contacts.street}</p>
            </div>

            <div className="h-px bg-white/6" />

            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/8 flex items-center justify-center">
                  <Clock size={18} className="text-white/70" />
                </div>
                <p className="text-white/40 text-xs uppercase tracking-wider">Режим работы</p>
              </div>
              <p className="text-white font-medium">{contacts.workingHours}</p>
            </div>

            <div className="h-px bg-white/6" />

            {/* Quick order buttons */}
            <div className="flex flex-col gap-3">
              <a
                href={contacts.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => analytics.clickContact("whatsapp")}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600/15 border border-green-600/25 text-green-400 text-sm font-medium hover:bg-green-600/25 transition-all"
              >
                <MessageCircle size={16} />
                Написать в WhatsApp
              </a>
              <a
                href={contacts.telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => analytics.clickContact("telegram")}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600/15 border border-blue-600/25 text-blue-400 text-sm font-medium hover:bg-blue-600/25 transition-all"
              >
                <MessageCircle size={16} />
                Написать в Telegram
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
