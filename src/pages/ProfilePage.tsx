import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronRight, ClipboardList, Heart, LogOut, ShoppingBag, UserRound } from "lucide-react";
import { logoutUser, useAuth } from "../lib/auth";
import { useCartCount } from "../lib/cart";
import { formatPhone } from "../lib/phone";
import { toast } from "../lib/toast";
import { useFavorites } from "../hooks/useFavorites";
import AuthPanel from "../components/ui/AuthPanel";

/**
 * Профиль. Без входа — вход и регистрация; после входа — «Мой профиль»
 * с телефоном и короткими ссылками (без лишних разделов).
 */
export default function ProfilePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { isAuthenticated, phone } = useAuth();
  const cartCount = useCartCount();
  const { count: favoritesCount } = useFavorites();

  useEffect(() => {
    document.title = (isAuthenticated ? "Мой профиль" : "Вход и регистрация") + " — VB STORE";
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen pb-[calc(var(--vb-mobile-nav-h,0px)+6rem)] pt-20">
        <div className="mx-auto max-w-md px-4 sm:px-6">
          <header className="pb-5 pt-6 sm:pt-10">
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              Вход и регистрация
            </h1>
            <p className="mt-2 text-sm text-white/40">
              Аккаунт нужен, чтобы оформлять заказы и смотреть их историю.
            </p>
          </header>
          <AuthPanel initialTab={params.get("tab") === "register" ? "register" : "login"} />
        </div>
      </main>
    );
  }

  const links = [
    { to: "/orders", label: "Мои заказы", icon: ClipboardList, badge: 0 },
    { to: "/favorites", label: "Избранное", icon: Heart, badge: favoritesCount },
    { to: "/cart", label: "Корзина", icon: ShoppingBag, badge: cartCount },
  ];

  return (
    <main className="min-h-screen pb-[calc(var(--vb-mobile-nav-h,0px)+6rem)] pt-20">
      <div className="mx-auto max-w-md px-4 sm:px-6">
        <header className="pb-5 pt-6 sm:pt-10">
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            Мой профиль
          </h1>
        </header>

        <div className="glass mb-3 flex items-center gap-4 rounded-2xl p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10">
            <UserRound size={22} className="text-white/70" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-white/40">Телефон</p>
            <p className="truncate text-lg font-bold text-white">{formatPhone(phone)}</p>
          </div>
        </div>

        <nav className="glass mb-6 overflow-hidden rounded-2xl" aria-label="Разделы профиля">
          {links.map(({ to, label, icon: Icon, badge }, index) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 px-4 py-4 transition-colors hover:bg-white/5 ${
                index > 0 ? "border-t border-white/8" : ""
              }`}
            >
              <Icon size={20} className="shrink-0 text-white/50" />
              <span className="flex-1 text-sm font-medium text-white">{label}</span>
              {badge > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[11px] font-bold text-black">
                  {badge}
                </span>
              )}
              <ChevronRight size={18} className="shrink-0 text-white/30" />
            </Link>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => {
            logoutUser();
            toast.info("Вы вышли из аккаунта");
            navigate("/", { replace: true });
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 py-4 text-sm font-semibold text-white/80 transition-colors hover:bg-white/8 hover:text-white"
        >
          <LogOut size={17} />
          Выйти
        </button>
      </div>
    </main>
  );
}
