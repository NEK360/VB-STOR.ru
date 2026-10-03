import { ApiError } from "./backend";
import { authedPost } from "./auth";
import type { DeliveryType, PaymentMethod } from "./delivery";

/**
 * Заказы создаются и хранятся на сервере (Google Apps Script → лист ORDERS в Google Таблице).
 * В браузере заказы не сохраняются: страница «Заказ оформлен» получает заказ из ответа
 * сервера (через состояние роутера), история заказов всегда запрашивается с сервера.
 */

export interface OrderItem {
  productId: string;
  name: string;
  brand: string;
  image: string;
  size: string | null;
  color: string | null;
  quantity: number;
  price: number;
}

export interface Order {
  orderId: string;
  /** ISO-дата создания */
  createdAt: string;
  userPhone: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  promoCode: string | null;
  deliveryType: DeliveryType;
  deliveryService: string | null;
  pickupAddress: string | null;
  /** «Бесплатно» или «от 290 ₽» — записывается сервером; в сумму заказа не входит */
  deliveryPrice: string | null;
  paymentMethod: PaymentMethod;
  /** Статус из таблицы — владелец может менять его вручную */
  status: string;
}

export interface CreateOrderInput {
  items: {
    productId: string;
    size: string | null;
    color: string | null;
    quantity: number;
  }[];
  promoCode: string | null;
  delivery: {
    type: DeliveryType;
    service: string | null;
    pickupAddress: string | null;
  };
  paymentMethod: PaymentMethod;
  /** Суммы, которые видел пользователь: сервер сверяет их со своим расчётом */
  clientTotals: { subtotal: number; discount: number; total: number };
  /** Защита от двойного нажатия: повторный запрос с тем же id не создаст второй заказ */
  requestId: string;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : value === null || value === undefined ? fallback : String(value);
}

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asNullableString(value: unknown): string | null {
  const s = asString(value).trim();
  return s ? s : null;
}

function parseOrderItem(raw: unknown): OrderItem | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const productId = asString(item.productId);
  if (!productId) return null;

  return {
    productId,
    name: asString(item.name, "Товар"),
    brand: asString(item.brand),
    image: asString(item.image),
    size: asNullableString(item.size),
    color: asNullableString(item.color),
    quantity: Math.max(1, Math.floor(asNumber(item.quantity, 1))),
    price: Math.max(0, asNumber(item.price)),
  };
}

export function parseOrder(raw: unknown): Order | null {
  if (!raw || typeof raw !== "object") return null;
  const order = raw as Record<string, unknown>;
  const orderId = asString(order.orderId);
  if (!orderId) return null;

  const items = (Array.isArray(order.items) ? order.items : [])
    .map(parseOrderItem)
    .filter((item): item is OrderItem => item !== null);

  const deliveryType: DeliveryType = order.deliveryType === "russia" ? "russia" : "pickup";
  const paymentMethod: PaymentMethod = order.paymentMethod === "on_receipt" ? "on_receipt" : "prepaid";

  return {
    orderId,
    createdAt: asString(order.createdAt),
    userPhone: asString(order.userPhone),
    items,
    subtotal: asNumber(order.subtotal),
    discount: asNumber(order.discount),
    total: asNumber(order.total),
    promoCode: asNullableString(order.promoCode),
    deliveryType,
    deliveryService: asNullableString(order.deliveryService),
    pickupAddress: asNullableString(order.pickupAddress),
    deliveryPrice: asNullableString(order.deliveryPrice),
    paymentMethod,
    status: asString(order.status),
  };
}

/** Создаёт заказ на сервере. Телефон берётся сервером из токена сессии, а не из запроса. */
export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const data = await authedPost<{ order?: unknown }>("createOrder", { order: input }, 45_000);
  const order = parseOrder(data?.order);
  if (!order) throw new ApiError("BAD_RESPONSE");
  return order;
}

/** История заказов текущего пользователя (новые — первыми). */
export async function fetchMyOrders(): Promise<Order[]> {
  const data = await authedPost<{ orders?: unknown[] }>("myOrders", {}, 30_000);
  return (Array.isArray(data?.orders) ? data.orders : [])
    .map(parseOrder)
    .filter((order): order is Order => order !== null);
}

export function createRequestId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // небезопасный контекст
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random()
    .toString(36)
    .slice(2)}`;
}
