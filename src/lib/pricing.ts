import { calculatePromoDiscount, type PromoDefinition } from "./promo";

export interface PricedLine {
  /** Цена за единицу, ₽ */
  price: number;
  quantity: number;
}

export interface OrderTotals {
  /** Количество позиций (строк) */
  positions: number;
  /** Общее количество единиц товара */
  quantity: number;
  /** Цена товаров без скидки */
  subtotal: number;
  /** Скидка по промокоду, ₽ */
  discount: number;
  /** Процент промокода (0, если промокод не применён) */
  discountPercent: number;
  /** Итого к оплате */
  total: number;
  promo: PromoDefinition | null;
}

/**
 * ЕДИНСТВЕННАЯ функция расчёта сумм заказа.
 * Используется на карточке товара, в корзине, при оформлении и для сверки с
 * сервером — нигде больше сумма не пересчитывается "вручную".
 */
export function calculateTotals(
  lines: readonly PricedLine[],
  promoCode?: string | null
): OrderTotals {
  let quantity = 0;
  let subtotal = 0;

  for (const line of lines) {
    const qty = Math.max(0, Math.floor(Number(line.quantity) || 0));
    const price = Math.max(0, Number(line.price) || 0);
    quantity += qty;
    subtotal += price * qty;
  }

  const { promo, discount } = calculatePromoDiscount(subtotal, promoCode);

  return {
    positions: lines.length,
    quantity,
    subtotal,
    discount,
    discountPercent: promo ? promo.percent : 0,
    total: subtotal - discount,
    promo,
  };
}
