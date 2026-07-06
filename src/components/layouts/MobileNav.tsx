import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Grid3X3, Tag, Heart, Phone } from "lucide-react";
import { useFavorites } from "../../hooks/useFavorites";

const navItems = [
  { href: "/", label: "Главная", icon: Home },
  { href: "/catalog", label: "Каталог", icon: Grid3X3 },
  { href: "/sale", label: "Скидки", icon: Tag },
  { href: "/favorites", label: "Избранное", icon: Heart, showBadge: true },
  { href: "/contacts", label: "Контакты", icon: Phone },
];

export default function MobileNav() {
  const location = useLocation();
  const { count } = useFavorites();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[80] lg:hidden"
      aria-label="Мобильная навигация"
    >
      <div className="glass-dark border-t border-white/8 px-2 py-2 pb-safe">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href || (item.href !== "/" && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                to={item.href}
                className="relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all"
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
              >
                <div className="relative">
                  <motion.div
                    animate={{ scale: isActive ? 1.1 : 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <Icon
                      size={20}
                      className={`transition-colors ${isActive ? "text-white" : "text-white/35"}`}
                      strokeWidth={isActive ? 2.5 : 1.5}
                    />
                  </motion.div>
                  {item.showBadge && count > 0 && (
                    <motion.span
                      key={count}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white text-black text-[9px] font-bold rounded-full flex items-center justify-center"
                    >
                      {count}
                    </motion.span>
                  )}
                </div>
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-dot"
                    className="w-1 h-1 rounded-full bg-white"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                {!isActive && <div className="w-1 h-1" />}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
