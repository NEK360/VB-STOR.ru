import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Check, ChevronRight, ClipboardList, Heart, LogOut, ShoppingBag, UserRound } from "lucide-react";
import { getErrorMessage } from "../lib/backend";
import { logoutUser, updateProfileName, useAuth } from "../lib/auth";
import { useCartCount } from "../lib/cart";
import { formatPhone } from "../lib/phone";
import { toast } from "../lib/toast";
import { useFavorites } from "../hooks/useFavorites";
import AuthPanel from "../components/ui/AuthPanel";

/** Профиль: вход без авторизации и редактирование имени после входа. */
export default function ProfilePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { isAuthenticated, phone, name } = useAuth();
  const cartCount = useCartCount();
  const { count: favoritesCount } = useFavorites();
  const [nameDraft, setNameDraft] = useState(name);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    document.title = (isAuthenticated ? "Мой профиль" : "Вход и регистрация") + " — VB STORE";
  }, [isAuthenticated]);

  useEffect(() => {
    setNameDraft(name);
  }, [name]);

  const saveName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingName) return;
    setNameError("");
    const normalized = nameDraft.trim().replace(/\s+/g, " ");
    if (!normalized) {
      setNameError("Введите имя");
      return;
    }
    if (normalized === name) {
      toast.info("Имя не изменилось");
      return;
    }

    setSavingName(true);
    try {
      await updateProfileName(normalized);
      toast.success("Имя профиля сохранено");
    } catch (error) {
      setNameError(getErrorMessage(error));
    } finally {
      setSavingName(false);
    }
  };

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

        <form onSubmit={saveName} className="glass mb-6 rounded-2xl p-4">
          <label htmlFor="profile-name" className="mb-2 block text-xs font-medium text-white/45">
            Имя профиля
          </label>
          <div className="flex gap-2">
            <input
              id="profile-name"
              type="text"
              value={nameDraft}
              onChange={(event) => {
                setNameDraft(event.target.value);
                setNameError("");
              }}
              maxLength={60}
              autoComplete="name"
              placeholder="Как к вам обращаться"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/30"
            />
            <button
              type="submit"
              disabled={savingName || !nameDraft.trim() || nameDraft.trim().replace(/\s+/g, " ") === name}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-3.5 py-3 text-sm font-semibold text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35"
            >
              {savingName ? "Сохраняем…" : <><Check size={16} /> Сохранить</>}
            </button>
          </div>
          {nameError && <p role="alert" className="mt-2 text-xs text-rose-300">{nameError}</p>}
          {!name && !nameError && (
            <p className="mt-2 text-xs text-white/35">Добавьте имя — оно будет отображаться в отзывах.</p>
          )}
        </form>

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
