import { Link } from "react-router-dom";
import { describeDelivery, PAYMENT_LABELS } from "../../lib/delivery";
import type { Order } from "../../lib/orders";
import { formatPrice } from "../../lib/utils";

export function formatOrderDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Состав и условия заказа: товары (фото, название, размер, количество, цена),
 * суммы, доставка (ПВЗ или служба) и способ оплаты.
 * Используется на странице «Заказ оформлен» и в истории заказов.
 */
export default function OrderSummary({ order }: { order: Order }) {
  const delivery = describeDelivery({
    type: order.deliveryType,
    service: order.deliveryService,
    pickupAddress: order.pickupAddress,
  });

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {order.items.map((item, index) => (
          <li key={`${item.productId}-${item.size}-${index}`} className="flex items-center gap-3">
            <Link
              to={`/catalog/${encodeURIComponent(item.productId)}`}
              className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white/5"
              aria-label={item.name}
            >
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-xl text-white/10">
                  📦
                </span>
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm leading-snug text-white">{item.name}</p>
              <p className="mt-0.5 text-xs text-white/45">
                {item.size && <>Размер: {item.size} · </>}
                {item.color && <>Цвет: {item.color} · </>}
                {item.quantity} шт.
              </p>
            </div>
            <p className="shrink-0 text-sm font-bold text-white">
              {formatPrice(item.price * item.quantity)}
            </p>
          </li>
        ))}
      </ul>

      <dl className="flex flex-col gap-2 border-t border-white/8 pt-4 text-sm">
        {order.discount > 0 && (
          <>
            <Row label="Цена товаров" value={formatPrice(order.subtotal)} />
            <Row
              label={order.promoCode ? `Скидка (промокод ${order.promoCode})` : "Скидка"}
              value={`-${formatPrice(order.discount)}`}
              accent
            />
          </>
        )}
        <div className="flex items-baseline justify-between">
          <dt className="font-semibold text-white">Итого</dt>
          <dd className="text-lg font-bold text-white">{formatPrice(order.total)}</dd>
        </div>
      </dl>

      <dl className="flex flex-col gap-2 border-t border-white/8 pt-4 text-sm">
        <Row label="Доставка" value={delivery} />
        <Row label="Оплата" value={PAYMENT_LABELS[order.paymentMethod]} />
      </dl>
    </div>
  );
}

function Row({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-white/45">{label}</dt>
      <dd className={`min-w-0 text-right ${accent ? "font-medium text-emerald-400" : "text-white"}`}>
        {value}
      </dd>
    </div>
  );
}
