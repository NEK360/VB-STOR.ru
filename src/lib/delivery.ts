/**
 * Способы доставки и оплаты — единый источник правды для интерфейса.
 *
 * ВАЖНО: на сайте нет онлайн-оплаты и нет интеграций с API служб доставки.
 * Выбор способа доставки только сохраняется в заказе и передаётся владельцу
 * магазина. Этот же список продублирован в apps-script/VBStoreApi.gs —
 * сервер не примет адрес/службу, которых нет в его списке.
 */

import { formatPrice } from "./utils";

export type DeliveryType = "pickup" | "russia";
export type PaymentMethod = "prepaid" | "on_receipt";

export interface PickupPoint {
  id: string;
  address: string;
  /** Это пункт выдачи Wildberries: именно для них доступна оплата при получении */
  isWildberries: boolean;
}

export const PICKUP_POINTS: readonly PickupPoint[] = [
  { id: "kirova-2a", address: "г. Изобильный, Улица Кирова 2а", isWildberries: true },
  { id: "lenina-66", address: "г. Изобильный, Улица Ленина 66", isWildberries: true },
  {
    id: "luxemburg-3b",
    address: "г. Изобильный, Улица Розы Люксембург 3б",
    isWildberries: true,
  },
];

export const RUSSIA_SERVICES: readonly string[] = [
  "Wildberries",
  "OZON",
  "Яндекс",
  "CDEK",
  "Почта России",
];

/**
 * Стоимость доставки, ₽.
 *  - Пункт выдачи — бесплатно.
 *  - У служб указана МИНИМАЛЬНАЯ цена («от»): точную сумму менеджер подтверждает при согласовании заказа.
 *  - В сумму заказа («Итого») стоимость доставки не входит — она показывается отдельной строкой.
 *
 * Этот же список продублирован в apps-script/VBStoreApi.gs (CONFIG.DELIVERY_PRICES): стоимость доставки
 * в заказ записывает сервер по своему списку, подменить её с сайта нельзя.
 */
export const RUSSIA_SERVICE_PRICES: Readonly<Record<string, number>> = {
  Wildberries: 96,
  OZON: 144,
  Яндекс: 225,
  CDEK: 290,
  "Почта России": 249,
};

export const PICKUP_PRICE_LABEL = "Бесплатно";

/** «от 96 ₽» */
function fromPrice(value: number): string {
  return `от ${formatPrice(value)}`;
}

/** Самая низкая цена среди служб — подпись у пункта «Доставка по России» до выбора службы. */
export function getRussiaPriceFromLabel(): string {
  return fromPrice(Math.min(...Object.values(RUSSIA_SERVICE_PRICES)));
}

/**
 * Стоимость выбранной доставки: «Бесплатно» или «от 290 ₽».
 * null — пока назвать нельзя (доставка по России без выбранной службы, либо способ не выбран).
 */
export function getDeliveryPriceLabel(delivery: {
  type: DeliveryType | string | null;
  service?: string | null;
}): string | null {
  if (delivery.type === "pickup") return PICKUP_PRICE_LABEL;
  if (delivery.type === "russia" && delivery.service) {
    const price = RUSSIA_SERVICE_PRICES[delivery.service];
    return price > 0 ? fromPrice(price) : null;
  }
  return null;
}

export const DELIVERY_TYPE_LABELS: Record<DeliveryType, string> = {
  pickup: "Пункт выдачи",
  russia: "Доставка по России",
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  prepaid: "Сразу",
  on_receipt: "При получении",
};

/** Что сообщаем покупателю после оформления в зависимости от способа оплаты. */
export const PAYMENT_NOTES: Record<PaymentMethod, string> = {
  prepaid: "Мы свяжемся с вами для подтверждения способа оплаты.",
  on_receipt: "Оплата при получении.",
};

export interface DeliverySelection {
  type: DeliveryType | null;
  /** Служба доставки (для «Доставка по России») */
  service: string | null;
  /** Адрес пункта выдачи (для «Пункт выдачи») */
  pickupAddress: string | null;
}

export const EMPTY_DELIVERY: DeliverySelection = {
  type: null,
  service: null,
  pickupAddress: null,
};

export function findPickupPoint(address: string | null | undefined): PickupPoint | undefined {
  return PICKUP_POINTS.find((p) => p.address === address);
}

/**
 * Динамический список способов оплаты.
 *  - «Сразу» доступна всегда;
 *  - «При получении» — ТОЛЬКО если выбран один из ПВЗ Wildberries.
 *
 * Для WB-доставки по России, OZON, Яндекс, CDEK и Почты России
 * «При получении» не показывается.
 */
export function getAvailablePaymentMethods(delivery: DeliverySelection): PaymentMethod[] {
  const methods: PaymentMethod[] = ["prepaid"];
  if (delivery.type === "pickup") {
    const point = findPickupPoint(delivery.pickupAddress);
    if (point?.isWildberries) methods.push("on_receipt");
  }
  return methods;
}

export function isDeliveryComplete(delivery: DeliverySelection): boolean {
  if (delivery.type === "pickup") return Boolean(findPickupPoint(delivery.pickupAddress));
  if (delivery.type === "russia") {
    return Boolean(delivery.service && RUSSIA_SERVICES.includes(delivery.service));
  }
  return false;
}

/** Короткая строка для показа: «Пункт выдачи: г. Изобильный…» / «Доставка по России: CDEK» */
export function describeDelivery(delivery: {
  type: DeliveryType | string | null;
  service?: string | null;
  pickupAddress?: string | null;
}): string {
  if (delivery.type === "pickup") {
    return delivery.pickupAddress
      ? `Пункт выдачи: ${delivery.pickupAddress}`
      : DELIVERY_TYPE_LABELS.pickup;
  }
  if (delivery.type === "russia") {
    return delivery.service
      ? `Доставка по России: ${delivery.service}`
      : DELIVERY_TYPE_LABELS.russia;
  }
  return "—";
}
