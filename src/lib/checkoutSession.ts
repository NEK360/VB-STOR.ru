import type { Product } from "./api";
import { makeCartKey, snapshotOf, type CartItem, type LineSnapshot } from "./cart";
import {
  EMPTY_DELIVERY,
  getAvailablePaymentMethods,
  type DeliverySelection,
  type DeliveryType,
  type PaymentMethod,
  PICKUP_POINTS,
  RUSSIA_SERVICES,
} from "./delivery";
import { createStore, persistStore, readJSON, useStore } from "./store";

/**
 * Сессия оформления заказа (живёт в sessionStorage вкладки).
 *
 * Два сценария:
 *  - "buy_now" — «Купить сейчас»: оформляется один товар, корзина не затрагивается;
 *  - "cart"    — оформление выбранных в корзине позиций.
 *
 * Здесь же хранится выбор доставки/оплаты, чтобы обновление страницы
 * не сбрасывало уже заполненную форму.
 */

const SESSION_KEY = "vb_store_checkout";

export interface CheckoutOrigin {
  /** Ключ позиции корзины, из которой взят товар */
  cartKey: string;
  /** Сколько единиц этой позиции оформляется */
  quantity: number;
}

export interface CheckoutLine extends LineSnapshot {
  productId: string;
  size: string | null;
  color: string | null;
  quantity: number;
  /**
   * Позиции корзины, из которых собрана эта строка (после оформления они
   * убираются из корзины). Для «Купить сейчас» — пустой список.
   */
  origins: CheckoutOrigin[];
}

export interface CheckoutForm {
  delivery: DeliverySelection;
  payment: PaymentMethod | null;
}

export interface CheckoutSession {
  mode: "buy_now" | "cart";
  lines: CheckoutLine[];
  form: CheckoutForm;
  createdAt: number;
}

const EMPTY_FORM: CheckoutForm = { delivery: EMPTY_DELIVERY, payment: null };

function asNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s ? s : null;
}

function parseForm(raw: unknown): CheckoutForm {
  if (!raw || typeof raw !== "object") return EMPTY_FORM;
  const form = raw as { delivery?: Record<string, unknown>; payment?: unknown };
  const d = form.delivery ?? {};

  const type: DeliveryType | null = d.type === "pickup" || d.type === "russia" ? d.type : null;
  const pickupAddress = asNullableString(d.pickupAddress);
  const service = asNullableString(d.service);

  const delivery: DeliverySelection = {
    type,
    pickupAddress:
      type === "pickup" && pickupAddress && PICKUP_POINTS.some((p) => p.address === pickupAddress)
        ? pickupAddress
        : null,
    service: type === "russia" && service && RUSSIA_SERVICES.includes(service) ? service : null,
  };

  const payment: PaymentMethod | null =
    (form.payment === "prepaid" || form.payment === "on_receipt") &&
    getAvailablePaymentMethods(delivery).includes(form.payment)
      ? form.payment
      : null;

  return { delivery, payment };
}

function parseLine(raw: unknown): CheckoutLine | null {
  if (!raw || typeof raw !== "object") return null;
  const line = raw as Record<string, unknown>;
  const productId = String(line.productId ?? "").trim();
  const quantity = Math.floor(Number(line.quantity));
  if (!productId || !Number.isFinite(quantity) || quantity < 1) return null;

  const price = Number(line.price);
  const oldPrice = Number(line.oldPrice);
  return {
    productId,
    size: asNullableString(line.size),
    color: asNullableString(line.color),
    quantity,
    origins: (Array.isArray(line.origins) ? line.origins : [])
      .map((o): CheckoutOrigin | null => {
        const origin = (o ?? {}) as Record<string, unknown>;
        const cartKey = asNullableString(origin.cartKey);
        const qty = Math.floor(Number(origin.quantity));
        return cartKey && Number.isFinite(qty) && qty > 0 ? { cartKey, quantity: qty } : null;
      })
      .filter((o): o is CheckoutOrigin => o !== null),
    name: String(line.name ?? "Товар"),
    brand: String(line.brand ?? ""),
    image: String(line.image ?? ""),
    price: Number.isFinite(price) && price >= 0 ? price : 0,
    oldPrice: Number.isFinite(oldPrice) && oldPrice > 0 ? oldPrice : 0,
  };
}

function parseSession(raw: unknown): CheckoutSession | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const lines = (Array.isArray(data.lines) ? data.lines : [])
    .map(parseLine)
    .filter((line): line is CheckoutLine => line !== null);
  if (lines.length === 0) return null;

  return {
    mode: data.mode === "cart" ? "cart" : "buy_now",
    lines,
    form: parseForm(data.form),
    createdAt: Number.isFinite(Number(data.createdAt)) ? Number(data.createdAt) : Date.now(),
  };
}

const sessionStore = createStore<CheckoutSession | null>(
  parseSession(readJSON(SESSION_KEY, "session"))
);
persistStore(sessionStore, SESSION_KEY, parseSession, "session");

export function getCheckoutSession(): CheckoutSession | null {
  return sessionStore.get();
}

export function useCheckoutSession(): CheckoutSession | null {
  return useStore(sessionStore);
}

export function clearCheckoutSession(): void {
  sessionStore.set(null);
}

/** Прошлый выбор доставки/оплаты переносим в новую сессию — не заставляем вводить заново. */
function carriedForm(): CheckoutForm {
  return sessionStore.get()?.form ?? EMPTY_FORM;
}

/** «Купить сейчас»: оформляется только этот товар, корзина не меняется. */
export function startBuyNow(
  product: Product,
  options: { size: string | null; color?: string | null }
): void {
  const size = options.size ?? null;
  const color = options.color ? options.color : null;
  sessionStore.set({
    mode: "buy_now",
    lines: [
      {
        ...snapshotOf(product),
        productId: String(product.id),
        size,
        color,
        quantity: 1,
        origins: [],
      },
    ],
    form: carriedForm(),
    createdAt: Date.now(),
  });
}

/** Оформление выбранных в корзине позиций. */
export function startCartCheckout(items: readonly CartItem[]): void {
  if (items.length === 0) return;
  sessionStore.set({
    mode: "cart",
    lines: items.map((item) => ({
      name: item.name,
      brand: item.brand,
      image: item.image,
      price: item.price,
      oldPrice: item.oldPrice,
      productId: item.productId,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      origins: [{ cartKey: item.key, quantity: item.quantity }],
    })),
    form: carriedForm(),
    createdAt: Date.now(),
  });
}

function updateForm(update: (form: CheckoutForm) => CheckoutForm): void {
  sessionStore.set((session) => (session ? { ...session, form: update(session.form) } : session));
}

/** Меняет доставку и пересчитывает допустимую оплату: недоступный способ сбрасывается. */
export function setDelivery(delivery: DeliverySelection): void {
  updateForm((form) => {
    const allowed = getAvailablePaymentMethods(delivery);
    return {
      delivery,
      payment: form.payment && allowed.includes(form.payment) ? form.payment : null,
    };
  });
}

export function setPayment(payment: PaymentMethod | null): void {
  updateForm((form) => ({ ...form, payment }));
}

/** Смена размера в позиции оформления. Одинаковые позиции объединяются. */
export function changeLineSize(index: number, size: string, max: number): void {
  sessionStore.set((session) => {
    if (!session || !session.lines[index]) return session;

    const cap = Math.max(1, Math.floor(max));
    const line = session.lines[index];
    const key = makeCartKey(line.productId, size, line.color);
    const twinIndex = session.lines.findIndex(
      (other, i) => i !== index && makeCartKey(other.productId, other.size, other.color) === key
    );

    if (twinIndex >= 0) {
      // объединяем строки; исходные позиции корзины обеих строк сохраняем,
      // чтобы после заказа из корзины убрались обе
      const lines = session.lines
        .map((other, i) =>
          i === twinIndex
            ? {
                ...other,
                quantity: Math.min(other.quantity + line.quantity, cap),
                origins: [...other.origins, ...line.origins],
              }
            : other
        )
        .filter((_, i) => i !== index);
      return { ...session, lines };
    }

    const lines = session.lines.map((other, i) =>
      i === index ? { ...other, size, quantity: Math.min(other.quantity, cap) } : other
    );
    return { ...session, lines };
  });
}

/** Убирает строку из оформления (товар недоступен). Корзина при этом не меняется. */
export function removeCheckoutLine(index: number): void {
  sessionStore.set((session) => {
    if (!session || !session.lines[index]) return session;
    const lines = session.lines.filter((_, i) => i !== index);
    return lines.length > 0 ? { ...session, lines } : null;
  });
}
