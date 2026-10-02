import type { Product } from "./api";

type ProductSize = Product["sizes"][number];

/**
 * Для товаров без размеров точный остаток в данных неизвестен.
 * Это не "придуманный остаток", а верхняя граница количества в одной позиции.
 */
export const UNKNOWN_STOCK_CAP = 10;

export interface SizeInfo {
  value: string;
  /** Остаток в магазине (stockOffline) */
  shop: number;
  /** Остаток на Wildberries (stockWB) */
  wb: number;
  /** Можно заказать через сайт (есть остаток в магазине) */
  orderable: boolean;
  /** Размер есть только на Wildberries */
  wbOnly: boolean;
  /** Размера нет нигде */
  unavailable: boolean;
  /** Осталось мало */
  low: boolean;
}

function toQty(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * Логика полностью повторяет ту, что уже была на карточке товара:
 *   shopQty = Number(stockOffline ?? 0), wbQty = Number(stockWB ?? 0).
 */
export function getSizeInfo(size: ProductSize): SizeInfo {
  const shop = toQty(size.stockOffline);
  const wb = toQty(size.stockWB);
  const unavailable = size.status === "unavailable" || shop + wb <= 0;

  return {
    value: String(size.value),
    shop,
    wb,
    orderable: !unavailable && shop > 0,
    wbOnly: !unavailable && shop <= 0 && wb > 0,
    unavailable,
    low: size.status === "low",
  };
}

export function hasSizes(product: Product): boolean {
  return Array.isArray(product.sizes) && product.sizes.length > 0;
}

export function findSize(product: Product, value: string | null | undefined): ProductSize | undefined {
  if (value === null || value === undefined) return undefined;
  return product.sizes.find((s) => String(s.value) === String(value));
}

export function getSizeInfoByValue(product: Product, value: string | null | undefined): SizeInfo | null {
  const size = findSize(product, value);
  return size ? getSizeInfo(size) : null;
}

/** Хотя бы один размер можно заказать через сайт (или у товара нет размеров, но он в наличии). */
export function isProductOrderable(product: Product): boolean {
  if (!hasSizes(product)) return Boolean(product.available);
  return product.sizes.some((s) => getSizeInfo(s).orderable);
}

/** Хотя бы один размер есть на Wildberries. */
export function hasWbStock(product: Product): boolean {
  return product.sizes.some((s) => {
    const info = getSizeInfo(s);
    return info.wbOnly || (!info.unavailable && info.wb > 0);
  });
}

/**
 * Максимальное количество, которое можно заказать через сайт.
 * 0 — заказать нельзя (размера нет / закончился / он есть только на WB).
 */
export function getMaxQuantity(product: Product, size: string | null): number {
  if (!hasSizes(product)) {
    return product.available ? UNKNOWN_STOCK_CAP : 0;
  }
  const info = getSizeInfoByValue(product, size);
  return info && info.orderable ? info.shop : 0;
}
