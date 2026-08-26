import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Heart, Menu, X, Phone, MessageCircle, Send } from "lucide-react";
import { navLinks } from "../../store-data/navigation";
import { settings } from "../../store-data/settings";
import { contacts } from "../../store-data/contacts";
import { useFavorites } from "../../hooks/useFavorites";
import { useSearch } from "../../hooks/useSearch";
import SearchModal from "../ui/SearchModal";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const { count: favCount } = useFavorites();
  const search = useSearch();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
          scrolled ? "glass-dark shadow-lg shadow-black/20" : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16 md:h-18">
         {/* Logo */}
<Link to="/" className="flex items-center gap-3 group shrink-0">
  <div className="w-9 h-9 flex items-center justify-center overflow-hidden rounded-xl">
    <img
      src="/favicon.svg"
      alt="VB STORE"
      className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
    />
  </div>

  <span className="font-bold text-lg tracking-widest text-white uppercase hidden sm:block whitespace-nowrap">
    {settings.storeName}
  </span>
</Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Основная навигация">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.href || (link.href !== "/" && location.pathname.startsWith(link.href.split("?")[0]));
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`relative px-3 py-2 text-sm font-medium transition-colors duration-200 rounded-lg group ${
                    isActive ? "text-white" : "text-white/50 hover:text-white"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 bg-white/8 rounded-lg"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative">{link.label}</span>
                  {link.badge && (
                    <span className={`ml-1 text-[9px] font-bold px-1 rounded ${link.badge === "SALE" ? "bg-red-500/80 text-white" : "bg-white/20 text-white"}`}>
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Quick contacts */}
            <a
              href={settings.telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-xs px-3 py-2 rounded-lg hover:bg-white/5"
              aria-label="Telegram"
            >
              <Send size={15} />
              <span className="hidden xl:block whitespace-nowrap">Telegram</span>
            </a>
            <a
              href={contacts.maxUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-xs px-3 py-2 rounded-lg hover:bg-white/5"
              aria-label="MAX"
            >
              <MessageCircle size={15} />
              <span className="hidden xl:block whitespace-nowrap">MAX</span>
            </a>
            <a
              href={`tel:${settings.phoneClean}`}
              className="hidden md:flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-xs px-3 py-2 rounded-lg hover:bg-white/5"
              aria-label="Телефон"
            >
              <Phone size={15} />
              <span className="hidden xl:block whitespace-nowrap">{settings.phone}</span>
            </a>

            {/* Search */}
            <button
              onClick={search.open}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-white/50 hover:text-white hover:bg-white/8 transition-all"
              aria-label="Поиск"
            >
              <Search size={18} />
            </button>

            {/* Favorites */}
            <Link
              to="/favorites"
              className="relative w-9 h-9 flex items-center justify-center rounded-xl text-white/50 hover:text-white hover:bg-white/8 transition-all"
              aria-label="Избранное"
            >
              <Heart size={18} />
              {favCount > 0 && (
                <motion.span
                  key={favCount}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-white text-black text-[9px] font-bold rounded-full flex items-center justify-center"
                >
                  {favCount}
                </motion.span>
              )}
            </Link>

            {/* Mobile menu */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl text-white/50 hover:text-white hover:bg-white/8 transition-all"
              aria-label="Меню"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] lg:hidden"
          >
            <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setMenuOpen(false)} />
            <motion.nav
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute right-0 top-0 bottom-0 w-72 bg-black border-l border-white/8 flex flex-col pt-20 pb-8 px-6 overflow-y-auto"
              aria-label="Мобильная навигация"
            >
              <div className="flex flex-col gap-1">
                {navLinks.map((link, i) => {
                  const isActive = location.pathname === link.href;
                  return (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Link
                        to={link.href}
                        className={`flex items-center justify-between px-4 py-3.5 rounded-xl text-base font-medium transition-all ${
                          isActive ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <span>{link.label}</span>
                        {link.badge && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${link.badge === "SALE" ? "bg-red-500 text-white" : "bg-white/15 text-white"}`}>
                            {link.badge}
                          </span>
                        )}
                      </Link>
                    </motion.div>
                  );
                })}
              </div>

              {/* Contacts in menu */}
              <div className="mt-auto pt-6 border-t border-white/8 flex flex-col gap-3">
                <a href={`tel:${settings.phoneClean}`} className="flex items-center gap-3 text-white/60 hover:text-white text-sm transition-colors">
                  <Phone size={16} />
                  {settings.phone}
                </a>
                <a href={settings.whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-white/60 hover:text-white text-sm transition-colors">
                  <MessageCircle size={16} />
                  WhatsApp
                </a>
                <a href={settings.telegramUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-white/60 hover:text-white text-sm transition-colors">
                  <Send size={16} />
                  Telegram {settings.telegram}
                </a>
                <a href={contacts.maxUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-white/60 hover:text-white text-sm transition-colors">
                  <MessageCircle size={16} />
                  MAX
                   </a>
                <a href={settings.vkUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-white/60 hover:text-white text-sm transition-colors">
                  <MessageCircle size={16} />
                  VK
                </a>
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Modal */}
      <SearchModal search={search} />
    </>
  );
}
