import type { Product } from "./api";
import type { LineSnapshot } from "./cart";
import { getMaxQuantity, getSizeInfoByValue, hasSizes, UNKNOWN_STOCK_CAP } from "./stock";

/**
 * Сопоставление строк корзины / оформления заказа с актуальным каталогом.
 * Цена и остаток всегда берутся из каталога; "снимок" из корзины нужен только
 * для первой отрисовки, пока каталог не загрузился.
 */

export interface LineLike extends LineSnapshot {
  productId: string;
  size: string | null;
  color: string | null;
  quantity: number;
}

export type LineIssue = "product_missing" | "size_missing" | "out_of_stock" | "wb_only";

export interface ResolvedLine<T extends LineLike = LineLike> {
  source: T;
  product: Product | null;
  name: string;
  brand: string;
  image: string;
  /** Цена за единицу */
  price: number;
  /** Старая цена — только если она реально есть в данных товара и выше текущей */
  oldPrice: number;
  /** Максимум, который можно заказать (остаток в магазине) */
  max: number;
  /** max — не точный остаток, а общий предел (остаток неизвестен: нет каталога или у товара нет размеров) */
  maxIsCap: boolean;
  /** Проблема с позицией; null — позицию можно заказывать */
  issue: LineIssue | null;
  /** У товара есть размеры (значит, размер обязателен) */
  needsSize: boolean;
}

export function resolveLine<T extends LineLike>(
  source: T,
  catalog: ReadonlyMap<string, Product> | null
): ResolvedLine<T> {
  const product = catalog?.get(String(source.productId)) ?? null;

  // Каталог ещё не загружен (или недоступен) — показываем то, что сохранено при добавлении
  if (!catalog) {
    return {
      source,
      product: null,
      name: source.name,
      brand: source.brand,
      image: source.image,
      price: source.price,
      oldPrice: source.oldPrice > source.price ? source.oldPrice : 0,
      max: UNKNOWN_STOCK_CAP,
      maxIsCap: true,
      issue: null,
      needsSize: source.size !== null,
    };
  }

  if (!product) {
    return {
      source,
      product: null,
      name: source.name,
      brand: source.brand,
      image: source.image,
      price: source.price,
      oldPrice: 0,
      max: 0,
      maxIsCap: false,
      issue: "product_missing",
      needsSize: source.size !== null,
    };
  }

  const needsSize = hasSizes(product);
  const oldPrice = Number(product.oldPrice ?? 0);

  let issue: LineIssue | null = null;
  let max = getMaxQuantity(product, needsSize ? source.size : null);

  if (needsSize) {
    const info = getSizeInfoByValue(product, source.size);
    if (!source.size || !info) issue = "size_missing";
    else if (info.wbOnly) issue = "wb_only";
    else if (!info.orderable) issue = "out_of_stock";
  } else if (max <= 0) {
    issue = "out_of_stock";
  }

  if (issue) max = 0;

  return {
    source,
    product,
    name: product.name || source.name,
    brand: product.brand || "",
    image: product.images?.[0] ?? source.image,
    price: Number(product.price) || 0,
    oldPrice: oldPrice > product.price ? oldPrice : 0,
    max,
    maxIsCap: !needsSize,
    issue,
    needsSize,
  };
}

export function resolveLines<T extends LineLike>(
  sources: readonly T[],
  catalog: ReadonlyMap<string, Product> | null
): ResolvedLine<T>[] {
  return sources.map((source) => resolveLine(source, catalog));
}

export function issueText(line: Pick<ResolvedLine, "issue" | "needsSize">): string {
  switch (line.issue) {
    case "product_missing":
      return "Товар больше недоступен";
    case "size_missing":
      return "Выберите размер";
    case "wb_only":
      return "Этот размер есть только на Wildberries";
    case "out_of_stock":
      return line.needsSize ? "Размер закончился" : "Нет в наличии";
    default:
      return "";
  }
}

/** Эту позицию можно оформить (нет проблем, цена известна). */
export function isOrderable(line: ResolvedLine): boolean {
  return line.issue === null && line.max > 0;
}
