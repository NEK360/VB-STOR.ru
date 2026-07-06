import { Link } from "react-router-dom";
import { Phone, MessageCircle, Mail, MapPin, Clock } from "lucide-react";
import { settings } from "../../store-data/settings";
import { navLinks } from "../../store-data/navigation";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-black border-t border-white/8 mt-20" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 border border-white/20 rounded-xl flex items-center justify-center">
                <span className="text-sm font-black tracking-tighter text-white">VB</span>
              </div>
              <span className="font-bold text-lg tracking-widest text-white uppercase">{settings.storeName}</span>
            </Link>
            <p className="text-white/40 text-sm leading-relaxed mb-6">
              {settings.storeSlogan}. Оригинальные товары с доставкой по России.
            </p>
            {/* Social */}
            <div className="flex items-center gap-3">
              <a
                href={settings.telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/30 transition-all"
                aria-label="Telegram"
              >
                <MessageCircle size={16} />
              </a>
              <a
                href={settings.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/30 transition-all"
                aria-label="WhatsApp"
              >
                <MessageCircle size={16} />
              </a>
              <a
                href={`mailto:${settings.email}`}
                className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/30 transition-all"
                aria-label="Email"
              >
                <Mail size={16} />
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-widest mb-6">Навигация</h3>
            <ul className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-white/40 hover:text-white text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacts */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-widest mb-6">Контакты</h3>
            <ul className="flex flex-col gap-4">
              <li>
                <a
                  href={`tel:${settings.phoneClean}`}
                  className="flex items-center gap-3 text-white/40 hover:text-white text-sm transition-colors"
                >
                  <Phone size={15} className="shrink-0" />
                  {settings.phone}
                </a>
              </li>
              <li>
                <a
                  href={settings.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-white/40 hover:text-white text-sm transition-colors"
                >
                  <MessageCircle size={15} className="shrink-0" />
                  WhatsApp
                </a>
              </li>
              <li>
                <a
                  href={settings.telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-white/40 hover:text-white text-sm transition-colors"
                >
                  <MessageCircle size={15} className="shrink-0" />
                  {settings.telegram}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${settings.email}`}
                  className="flex items-center gap-3 text-white/40 hover:text-white text-sm transition-colors"
                >
                  <Mail size={15} className="shrink-0" />
                  {settings.email}
                </a>
              </li>
            </ul>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-widest mb-6">Адрес</h3>
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <MapPin size={15} className="text-white/40 shrink-0 mt-0.5" />
                <div>
                  <p className="text-white/70 text-sm">{settings.city}</p>
                  <p className="text-white/40 text-sm">{settings.region}</p>
                  <p className="text-white/40 text-sm">{settings.street}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock size={15} className="text-white/40 shrink-0" />
                <p className="text-white/40 text-sm">{settings.workingHours}</p>
              </div>
              <a
                href={settings.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white/8 hover:bg-white/12 text-white text-sm px-4 py-2.5 rounded-xl transition-all border border-white/8 hover:border-white/15 mt-2"
              >
                <MessageCircle size={15} />
                Написать в WhatsApp
              </a>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-16 pt-6 border-t border-white/6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/20 text-xs">
            © {year} {settings.storeName}. Все права защищены.
          </p>
          <p className="text-white/15 text-xs">
            г. Изобильный, Ставропольский край
          </p>
        </div>
      </div>
    </footer>
  );
}
