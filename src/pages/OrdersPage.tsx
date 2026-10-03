import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ClipboardList, LoaderCircle } from "lucide-react";
import { useAuth } from "../lib/auth";
import { getErrorMessage } from "../lib/backend";
import { fetchMyOrders, type Order } from "../lib/orders";
import { formatPrice } from "../lib/utils";
import AuthPanel from "../components/ui/AuthPanel";
import OrderSummary, { formatOrderDate } from "../components/ui/OrderSummary";

/** «Мои заказы» — история заказов текущего пользователя (берётся с сервера, из листа ORDERS). */
export default function OrdersPage() {
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Мои заказы — VB STORE";
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setOrders(await fetchMyOrders());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) void load();
    else {
      setOrders(null);
      setError("");
    }
  }, [isAuthenticated, load]);

  return (
    <main className="min-h-screen pb-[calc(var(--vb-mobile-nav-h,0px)+6rem)] pt-20">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <header className="pb-5 pt-6 sm:pt-10">
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">Мои заказы</h1>
        </header>

        {!isAuthenticated ? (
          <div className="mx-auto max-w-md">
            <p className="mb-4 text-sm text-white/50">
              Войдите в аккаунт, чтобы увидеть историю заказов.
            </p>
            <AuthPanel />
          </div>
        ) : loading && !orders ? (
          <div className="flex justify-center py-20">
            <LoaderCircle size={28} className="animate-spin text-white/40" aria-label="Загрузка" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-5 text-center">
            <p role="alert" className="mb-4 text-sm leading-snug text-rose-300">
              {error}
            </p>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-white/90"
            >
              Повторить
            </button>
          </div>
        ) : orders && orders.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
              <ClipboardList size={32} className="text-white/25" />
            </div>
            <p className="mb-2 text-xl text-white/60">У вас пока нет заказов</p>
            <p className="mb-8 text-sm text-white/30">Оформленные заказы появятся здесь</p>
            <Link
              to="/catalog"
              className="inline-flex rounded-2xl bg-white px-8 py-4 font-semibold text-black transition-colors hover:bg-white/90"
            >
              Перейти в каталог
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {(orders ?? []).map((order) => {
              const open = openId === order.orderId;
              const thumbs = order.items.filter((item) => item.image).slice(0, 3);
              return (
                <li key={order.orderId} className="glass overflow-hidden rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : order.orderId)}
                    aria-expanded={open}
                    className="flex w-full flex-col gap-3 p-4 text-left"
                  >
                    {/* 1. Номер заказа и статус */}
                    <div className="flex items-center justify-between gap-3">
                      <p className="whitespace-nowrap text-base font-bold text-white">
                        Заказ №{order.orderId}
                      </p>
                      {order.status && (
                        <span
                          className={`min-w-0 truncate rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                            order.status === "Ожидает оплаты"
                              ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                              : "border-white/15 bg-white/8 text-white/70"
                          }`}
                        >
                          {order.status}
                        </span>
                      )}
                    </div>

                    {/* 2. Дата */}
                    <p className="-mt-1.5 text-xs text-white/40">
                      {formatOrderDate(order.createdAt)}
                    </p>

                    {/* 3. Фото товаров, сумма, раскрыть */}
                    <div className="flex items-center gap-3">
                      <div className="flex shrink-0 -space-x-3">
                        {thumbs.length > 0 ? (
                          thumbs.map((item, index) => (
                            <img
                              key={`${item.productId}-${index}`}
                              src={item.image}
                              alt=""
                              loading="lazy"
                              className="h-11 w-11 rounded-xl border-2 border-black bg-white/5 object-cover"
                            />
                          ))
                        ) : (
                          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-lg text-white/20">
                            📦
                          </span>
                        )}
                      </div>
                      <p className="min-w-0 flex-1 text-xs text-white/40">
                        {order.items.reduce((sum, item) => sum + item.quantity, 0)} шт.
                      </p>
                      <p className="shrink-0 text-base font-bold text-white">
                        {formatPrice(order.total)}
                      </p>
                      <ChevronDown
                        size={18}
                        className={`shrink-0 text-white/30 transition-transform ${
                          open ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {open && (
                    <div className="border-t border-white/8 p-4">
                      <OrderSummary order={order} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
