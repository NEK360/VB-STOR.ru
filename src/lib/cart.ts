import type { Product } from "./api";
import { addFavorite } from "../hooks/useFavorites";
import { findPromo, type PromoDefinition } from "./promo";
import { getMaxQuantity, hasSizes } from "./stock";
import {
  createStore,
  persistStore,
  readJSON,
  useStore,
  useStoreSelector,
} from "./store";

/**
 * Корзина.
 *
 * ХРАНЕНИЕ: только в localStorage браузера (ключ vb_store_cart) — это временное
 * состояние до оформления. Заказы и пользователи хранятся на сервере.
 *
 * Строка корзины однозначно определяется товаром + размером (+ цветом, если у
 * товара есть цвета): тот же товар с тем же размером не дублируется, а
 * увеличивает количество. Вместе со ссылкой на товар хранится "снимок"
 * (название/фото/цена) — только чтобы корзина мгновенно отрисовалась до
 * загрузки каталога; актуальные цена и остаток всегда берутся из каталога.
 */

const CART_KEY = "vb_store_cart";

export interface LineSnapshot {
  name: string;
  brand: string;
  image: string;
  price: number;
  oldPrice: number;
}

export interface CartItem extends LineSnapshot {
  key: string;
  productId: string;
  size: string | null;
  color: string | null;
  quantity: number;
  addedAt: number;
}

interface CartState {
  items: CartItem[];
  /** Ключи позиций, у которых пользователь снял галочку (по умолчанию выбрано всё) */
  unselected: string[];
  promoCode: string | null;
}

const EMPTY_STATE: CartState = { items: [], unselected: [], promoCode: null };

export function makeCartKey(
  productId: string,
  size: string | null | undefined,
  color: string | null | undefined
): string {
  return [String(productId), size ?? "", color ?? ""].join("::");
}

export function snapshotOf(product: Product): LineSnapshot {
  const oldPrice = Number(product.oldPrice ?? 0);
  return {
    name: product.name || "Товар",
    brand: product.brand || "",
    image: product.images?.[0] ?? "",
    price: Number(product.price) || 0,
    oldPrice: oldPrice > product.price ? oldPrice : 0,
  };
}

function asNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s ? s : null;
}

function parseItem(raw: unknown): CartItem | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;

  const productId = String(item.productId ?? "").trim();
  const quantity = Math.floor(Number(item.quantity));
  if (!productId || !Number.isFinite(quantity) || quantity < 1) return null;

  const size = asNullableString(item.size);
  const color = asNullableString(item.color);
  const price = Number(item.price);
  const oldPrice = Number(item.oldPrice);

  return {
    key: makeCartKey(productId, size, color),
    productId,
    size,
    color,
    quantity,
    addedAt: Number.isFinite(Number(item.addedAt)) ? Number(item.addedAt) : Date.now(),
    name: String(item.name ?? "Товар"),
    brand: String(item.brand ?? ""),
    image: String(item.image ?? ""),
    price: Number.isFinite(price) && price >= 0 ? price : 0,
    oldPrice: Number.isFinite(oldPrice) && oldPrice > 0 ? oldPrice : 0,
  };
}

function parseCart(raw: unknown): CartState {
  if (!raw || typeof raw !== "object") return EMPTY_STATE;
  const data = raw as Record<string, unknown>;

  // склеиваем возможные дубли по ключу — на случай ручной правки хранилища
  const merged = new Map<string, CartItem>();
  for (const candidate of Array.isArray(data.items) ? data.items : []) {
    const item = parseItem(candidate);
    if (!item) continue;
    const existing = merged.get(item.key);
    if (existing) existing.quantity += item.quantity;
    else merged.set(item.key, item);
  }

  const items = [...merged.values()];
  const keys = new Set(items.map((i) => i.key));
  const unselected = (Array.isArray(data.unselected) ? data.unselected : [])
    .map(String)
    .filter((key) => keys.has(key));

  // сохранённый промокод оставляем, только если он по-прежнему существует
  const promo = findPromo(typeof data.promoCode === "string" ? data.promoCode : null);

  return { items, unselected, promoCode: promo ? promo.code : null };
}

const cartStore = createStore<CartState>(parseCart(readJSON(CART_KEY)));
persistStore(cartStore, CART_KEY, parseCart);

// ---------------------------------------------------------------------------
// Чтение
// ---------------------------------------------------------------------------

export function getCartItems(): CartItem[] {
  return cartStore.get().items;
}

export function countQuantity(items: readonly { quantity: number }[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function useCart() {
  const state = useStore(cartStore);
  const count = countQuantity(state.items);

  return {
    items: state.items,
    promoCode: state.promoCode,
    unselected: state.unselected,
    /** Общее количество единиц товара — для бейджа на иконке корзины */
    count,
    positions: state.items.length,
    isSelected: (key: string) => !state.unselected.includes(key),
  };
}

/** Лёгкая подписка только на счётчик (для иконок в шапке и нижней навигации). */
export function useCartCount(): number {
  return useStoreSelector(cartStore, (state) => countQuantity(state.items));
}

// ---------------------------------------------------------------------------
// Добавление
// ---------------------------------------------------------------------------

export type AddToCartResult =
  | { status: "added" | "increased"; quantity: number; max: number }
  | { status: "max_reached"; quantity: number; max: number }
  | { status: "size_required" }
  | { status: "unavailable" };

export function addToCart(
  product: Product,
  options: { size: string | null; color?: string | null; quantity?: number }
): AddToCartResult {
  const size = options.size ?? null;
  const color = options.color ? options.color : null;
  const amount = Math.max(1, Math.floor(options.quantity ?? 1));

  if (hasSizes(product) && !size) return { status: "size_required" };

  const max = getMaxQuantity(product, hasSizes(product) ? size : null);
  if (max <= 0) return { status: "unavailable" };

  const key = makeCartKey(product.id, hasSizes(product) ? size : null, color);
  const state = cartStore.get();
  const existing = state.items.find((item) => item.key === key);
  const snapshot = snapshotOf(product);

  if (existing) {
    if (existing.quantity >= max) {
      return { status: "max_reached", quantity: existing.quantity, max };
    }
    const quantity = Math.min(existing.quantity + amount, max);
    cartStore.set({
      ...state,
      items: state.items.map((item) =>
        item.key === key ? { ...item, ...snapshot, quantity } : item
      ),
      unselected: state.unselected.filter((k) => k !== key),
    });
    return { status: "increased", quantity, max };
  }

  const quantity = Math.min(amount, max);
  const item: CartItem = {
    ...snapshot,
    key,
    productId: String(product.id),
    size: hasSizes(product) ? size : null,
    color,
    quantity,
    addedAt: Date.now(),
  };
  cartStore.set({ ...state, items: [...state.items, item] });
  return { status: "added", quantity, max };
}

// ---------------------------------------------------------------------------
// Изменение / удаление
// ---------------------------------------------------------------------------

/** Устанавливает количество в пределах [1, max]. */
export function setQuantity(key: string, quantity: number, max: number): number {
  const state = cartStore.get();
  const item = state.items.find((i) => i.key === key);
  if (!item) return 0;

  const next = Math.max(1, Math.min(Math.floor(quantity), Math.max(1, Math.floor(max))));
  if (next !== item.quantity) {
    cartStore.set({
      ...state,
      items: state.items.map((i) => (i.key === key ? { ...i, quantity: next } : i)),
    });
  }
  return next;
}

export interface RemovedItem {
  item: CartItem;
  index: number;
  wasSelected: boolean;
}

export function removeItem(key: string): RemovedItem | null {
  const state = cartStore.get();
  const index = state.items.findIndex((i) => i.key === key);
  if (index < 0) return null;

  const item = state.items[index];
  cartStore.set({
    ...state,
    items: state.items.filter((i) => i.key !== key),
    unselected: state.unselected.filter((k) => k !== key),
  });
  return { item, index, wasSelected: !state.unselected.includes(key) };
}

/** Отмена удаления («Отменить» в уведомлении). */
export function restoreItem(removed: RemovedItem): void {
  const state = cartStore.get();
  if (state.items.some((i) => i.key === removed.item.key)) return;

  const items = [...state.items];
  items.splice(Math.min(removed.index, items.length), 0, removed.item);
  cartStore.set({
    ...state,
    items,
    unselected: removed.wasSelected
      ? state.unselected
      : [...state.unselected, removed.item.key],
  });
}

/**
 * «Перенести в избранное»: товар добавляется в существующее избранное сайта
 * (без дублей) и удаляется из корзины. Счётчики обновляются сразу, т.к. оба
 * хранилища общие.
 */
export function moveToFavorites(
  key: string
): { moved: boolean; alreadyFavorite: boolean; item?: CartItem } {
  const item = cartStore.get().items.find((i) => i.key === key);
  if (!item) return { moved: false, alreadyFavorite: false };

  const added = addFavorite(item.productId);
  removeItem(key);
  return { moved: true, alreadyFavorite: !added, item };
}

/** Смена размера позиции. Если позиция с таким размером уже есть — количество суммируется. */
export function changeItemSize(key: string, newSize: string, max: number): void {
  const state = cartStore.get();
  const index = state.items.findIndex((i) => i.key === key);
  if (index < 0) return;

  const item = state.items[index];
  const newKey = makeCartKey(item.productId, newSize, item.color);
  if (newKey === key) return;

  const cap = Math.max(1, Math.floor(max));
  const target = state.items.find((i) => i.key === newKey);
  const wasUnselected = state.unselected.includes(key);
  const unselectedWithoutOld = state.unselected.filter((k) => k !== key);

  if (target) {
    cartStore.set({
      ...state,
      items: state.items
        .filter((i) => i.key !== key)
        .map((i) =>
          i.key === newKey ? { ...i, quantity: Math.min(i.quantity + item.quantity, cap) } : i
        ),
      unselected: unselectedWithoutOld,
    });
    return;
  }

  const items = [...state.items];
  items[index] = { ...item, key: newKey, size: newSize, quantity: Math.min(item.quantity, cap) };
  cartStore.set({
    ...state,
    items,
    unselected: wasUnselected ? [...unselectedWithoutOld, newKey] : unselectedWithoutOld,
  });
}

// ---------------------------------------------------------------------------
// Выбор позиций (галочки)
// ---------------------------------------------------------------------------

export function setSelected(key: string, selected: boolean): void {
  const state = cartStore.get();
  const isUnselected = state.unselected.includes(key);
  if (selected && isUnselected) {
    cartStore.set({ ...state, unselected: state.unselected.filter((k) => k !== key) });
  } else if (!selected && !isUnselected && state.items.some((i) => i.key === key)) {
    cartStore.set({ ...state, unselected: [...state.unselected, key] });
  }
}

export function setAllSelected(keys: readonly string[], selected: boolean): void {
  const state = cartStore.get();
  const keySet = new Set(keys);
  const rest = state.unselected.filter((k) => !keySet.has(k));
  cartStore.set({ ...state, unselected: selected ? rest : [...rest, ...keys] });
}

// ---------------------------------------------------------------------------
// Промокод (общий для карточки товара, корзины и оформления заказа)
// ---------------------------------------------------------------------------

export type ApplyPromoResult =
  | { ok: true; promo: PromoDefinition }
  | { ok: false; reason: "empty" | "unknown" };

export function applyPromoCode(input: string): ApplyPromoResult {
  if (!input.trim()) return { ok: false, reason: "empty" };

  // промокод применяется только если он существует в системе (единая функция findPromo)
  const promo = findPromo(input);
  if (!promo) return { ok: false, reason: "unknown" };

  cartStore.set((state) => ({ ...state, promoCode: promo.code }));
  return { ok: true, promo };
}

export function clearPromoCode(): void {
  cartStore.set((state) => (state.promoCode === null ? state : { ...state, promoCode: null }));
}

// ---------------------------------------------------------------------------
// После оформления заказа
// ---------------------------------------------------------------------------

export interface OrderedLineRef {
  /** Ключ позиции в корзине, из которой взят товар (null — «Купить сейчас») */
  cartKey: string | null;
  productId: string;
  size: string | null;
  color: string | null;
  quantity: number;
}

/**
 * Убирает из корзины ТОЛЬКО оформленные товары: у позиции вычитается
 * заказанное количество (если ничего не осталось — позиция удаляется).
 * Остальные товары остаются в корзине.
 */
export function removeOrdered(lines: readonly OrderedLineRef[]): void {
  let state = cartStore.get();

  for (const line of lines) {
    const key = line.cartKey ?? makeCartKey(line.productId, line.size, line.color);
    const item = state.items.find((i) => i.key === key);
    if (!item) continue;

    const left = item.quantity - line.quantity;
    state =
      left > 0
        ? { ...state, items: state.items.map((i) => (i.key === key ? { ...i, quantity: left } : i)) }
        : {
            ...state,
            items: state.items.filter((i) => i.key !== key),
            unselected: state.unselected.filter((k) => k !== key),
          };
  }

  cartStore.set(state);
}

export function clearCart(): void {
  cartStore.set(EMPTY_STATE);
}
