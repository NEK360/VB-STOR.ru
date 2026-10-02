import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, LoaderCircle } from "lucide-react";
import { useAuth } from "../lib/auth";
import { PAYMENT_NOTES } from "../lib/delivery";
import { fetchMyOrders, type Order } from "../lib/orders";
import OrderSummary, { formatOrderDate } from "../components/ui/OrderSummary";

/**
 * «Заказ оформлен». Данные заказа приходят с сервера сразу после создания (через состояние
 * роутера — оно переживает обновление страницы). Если страницу открыли «с нуля»
 * (например, по ссылке в новой вкладке) — заказ запрашивается у сервера.
 */
export default function OrderSuccessPage() {
  const { orderId = "" } = useParams<{ orderId: string }>();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const [order, setOrder] = useState<Order | null>(() => {
    const fromState = (location.state as { order?: Order } | null)?.order;
    return fromState && fromState.orderId === orderId ? fromState : null;
  });
  const [loading, setLoading] = useState(order === null);

  useEffect(() => {
    document.title = "Заказ оформлен — VB STORE";
  }, []);

  useEffect(() => {
    if (order || !isAuthenticated) {
      setLoading(false);
      return;
    }
    let active = true;
    fetchMyOrders()
      .then((orders) => {
        if (active) setOrder(orders.find((o) => o.orderId === orderId) ?? null);
      })
      .catch(() => {
        // сообщение «Заказ не найден» ниже подскажет, где искать заказ
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [order, orderId, isAuthenticated]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center pb-32 pt-20">
        <LoaderCircle size={28} className="animate-spin text-white/40" aria-label="Загрузка" />
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-screen pb-[calc(var(--vb-mobile-nav-h,0px)+6rem)] pt-20">
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <p className="mb-2 text-xl text-white/70">Заказ не найден</p>
          <p className="mb-8 text-sm text-white/35">
            Если вы только что оформили заказ, найдите его в разделе «Мои заказы».
          </p>
          <Link
            to="/orders"
            className="inline-flex rounded-2xl bg-white px-8 py-4 font-semibold text-black transition-colors hover:bg-white/90"
          >
            Мои заказы
          </Link>
        </div>
      </main>
    );
  }

  const created = formatOrderDate(order.createdAt);

  return (
    <main className="min-h-screen pb-[calc(var(--vb-mobile-nav-h,0px)+6rem)] pt-20">
      <div className="mx-auto max-w-xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="pb-6 pt-8 text-center sm:pt-12"
        >
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15">
            <Check size={30} className="text-emerald-400" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            Заказ оформлен
          </h1>
          <p className="mt-3 text-xl font-bold text-white">№{order.orderId}</p>
          {created && <p className="mt-1 text-xs text-white/35">{created}</p>}
          <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-white/60">
            Мы свяжемся с вами по номеру телефона для подтверждения заказа.
          </p>
        </motion.div>

        <div className="glass rounded-3xl p-4 sm:p-6">
          <h2 className="mb-4 text-base font-bold text-white">Состав заказа</h2>
          <OrderSummary order={order} />

          <p className="mt-5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-snug text-white/80">
            {PAYMENT_NOTES[order.paymentMethod]}
          </p>
          {order.status && (
            <p className="mt-3 text-xs text-white/35">
              Статус заказа: <span className="text-white/60">{order.status}</span>
            </p>
          )}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Link
            to="/orders"
            className="rounded-2xl bg-white py-4 text-center text-sm font-bold text-black transition-colors hover:bg-white/90"
          >
            Мои заказы
          </Link>
          <Link
            to="/catalog"
            className="rounded-2xl border border-white/15 py-4 text-center text-sm font-semibold text-white transition-colors hover:bg-white/8"
          >
            Продолжить покупки
          </Link>
        </div>
      </div>
    </main>
  );
}
