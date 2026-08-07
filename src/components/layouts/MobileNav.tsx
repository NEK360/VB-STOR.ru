import { navLink } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Grid3x3, Heart, MessageSquareText, User } from "lucide-react";
import { useFavorites } from "../../hooks/useFavorites";

const navItems = [
  { href: "/", label: "Главная", icon: Home },
  { href: "/catalog", label: "Каталог", icon: Grid3x3 },
  { href: "/favorites", label: "Избранное", icon: Heart },
  { href: "/reviews", label: "Отзывы", icon: MessageSquareText },
  { href: "/contacts", label: "Контакты", icon: User },
];

export default function MobileNav() {
  const { count } = useFavorites();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-black/90 backdrop-blur-xl border-t border-white/8 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex items-center justify-between px-2 py-2">
        <div className="flex items-center justify-around">
         {navItems.map((item) => {
  const Icon = item.icon;

  return (
    <NavLink
      key={item.href}
      to={item.href}
      end={item.href === "/"}
      className={({ isActive }) =>
        `relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
          isActive ? "text-white" : "text-white/35"
        }`
      }
    >
      {({ isActive }) => (
        <>
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

          {item.href === "/favorites" && count > 0 && (
            <motion.span
              key={count}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white text-black text-[9px] font-bold rounded-full flex items-center justify-center"
            >
              {count}
            </motion.span>
          )}

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
