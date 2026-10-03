import { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Grid3x3, Heart, MessageSquareText, ShoppingBag, User } from "lucide-react";
import { useFavorites } from "../../hooks/useFavorites";
import { useCartCount } from "../../lib/cart";

const navItems = [
  { href: "/", label: "Главная", icon: Home },
  { href: "/catalog", label: "Каталог", icon: Grid3x3 },
  { href: "/cart", label: "Корзина", icon: ShoppingBag },
  { href: "/favorites", label: "Избранное", icon: Heart },
  { href: "/reviews", label: "Отзывы", icon: MessageSquareText },
  { href: "/contacts", label: "Контакты", icon: User },
];

export default function MobileNav() {
  const { count: favoritesCount } = useFavorites();
  const cartCount = useCartCount();
  const navRef = useRef<HTMLElement>(null);

  // Сообщаем странице реальную высоту навигации: закреплённые панели корзины и
  // оформления заказа встают ровно над ней и ничего не перекрывают.
  useEffect(() => {
    const element = navRef.current;
    if (!element) return;

    const root = document.documentElement;
    const update = () => root.style.setProperty("--vb-mobile-nav-h", `${element.offsetHeight}px`);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      root.style.removeProperty("--vb-mobile-nav-h");
    };
  }, []);

  return (
    <nav
      ref={navRef}
      className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-black/90 backdrop-blur-xl border-t border-white/8 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex items-center justify-around px-1 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const badge =
            item.href === "/favorites" ? favoritesCount : item.href === "/cart" ? cartCount : 0;

          return (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === "/"}
              className={({ isActive }) =>
                `relative flex min-w-0 flex-1 flex-col items-center gap-1 px-0.5 py-2 rounded-xl transition-all ${
                  isActive ? "text-white" : "text-white/35"
                }`
              }
            >
             {({ isActive }) => (
  <>
    {/* счётчик закреплён на иконке: на корзине и избранном */}
    <span className="relative">
      <motion.div
        animate={{ scale: isActive ? 1.1 : 1 }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 25,
        }}
      >
        <Icon
          size={20}
          className={isActive ? "text-white" : "text-white/35"}
          strokeWidth={isActive ? 2.5 : 1.5}
        />
      </motion.div>

      {badge > 0 && (
        <motion.span
          key={badge}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          aria-label={`${badge} шт.`}
          className="absolute -top-2 -right-2.5 min-w-4 h-4 px-1 bg-white text-black text-[9px] font-bold rounded-full flex items-center justify-center"
        >
          {badge > 99 ? "99+" : badge}
        </motion.span>
      )}
    </span>

    <span className="text-[10px] font-medium whitespace-nowrap">
      {item.label}
    </span>

    {isActive ? (
      <motion.div
        layoutId="mobile-nav-dot"
        className="w-1 h-1 rounded-full bg-white"
      />
    ) : (
      <div className="w-1 h-1" />
    )}
  </>
)}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
