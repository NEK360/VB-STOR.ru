import { reviews, type Review } from "../store-data/reviews";
import { products as fallbackCatalogProducts } from "../store-data/products";
import { BACKEND_URL } from "./config";
import { sortProductSizes } from "./sizes";

export interface Product {
  id: string;
  article: string;

  name: string;
  brand: string;
  category: string;
  description: string;

  price: number;
  oldPrice?: number;
  discount?: number;

  images: string[];

  sizes: {
    value: string;
    status: "available" | "low" | "unavailable";
    stockOffline?: number;
    stockWB?: number;
  }[];

  colors: {
    name: string;
    code?: string;
    hex?: string;
  }[];

  gender: string;

  rating: number;
  reviewsCount: number;

  available: boolean;

  offlineOnly: boolean;
  wbOnly: boolean;
  bothAvailable: boolean;

  isNew: boolean;
  isFeatured: boolean;
  isSale: boolean;

  tags: string[];

  wbUrl: string;
}

interface ProductPayload {
  id?: string | number;
  article?: string;
  name?: string;
  brand?: string;
  category?: string;
  description?: string;
  price?: number | string;
  oldPrice?: number | string;
  discount?: number | string;
  images?: string[];
  size?: string;
  sizes?: Array<{
    value?: string;
    status?: string;
    stockOffline?: number;
    stockWB?: number;
  }>;
  colors?: Array<{
    name?: string;
    code?: string;
    hex?: string;
  }>;
  color?: string;
  gender?: string;
  rating?: number | string;
  reviewsCount?: number | string;
  available?: boolean;
  offlineOnly?: boolean;
  wbOnly?: boolean;
  bothAvailable?: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  isSale?: boolean;
  tags?: string[];
  wbUrl?: string;
}

const API_URL = `${BACKEND_URL}${BACKEND_URL.includes("?") ? "&" : "?"}action=catalog`;
const CACHE_KEY = "catalog_cache_v2";
const CATALOG_FRESH_MS = 30_000;
const CATALOG_REQUEST_TIMEOUT_MS = 10_000;
const CATALOG_RETRY_DELAY_MS = 15_000;

export type CatalogLoadStatus = "idle" | "loading" | "success" | "error";

let cacheProducts: Product[] | null = null;
let catalogPromise: Promise<Product[]> | null = null;
let freshAt = 0; // когда каталог последний раз был получен с сервера (а не из localStorage)
let retryAfter = 0;
let catalogStatus: CatalogLoadStatus = "idle";

/**
 * Собирает все возможные идентификаторы товара (id, артикул, артикул из ссылки WB и фото WB),
 * чтобы безошибочно сопоставлять отзывы с товарами.
 */
export function getProductIdentifiers(product: {
  id?: string | number;
  article?: string;
  wbUrl?: string;
  images?: string[];
}): Set<string> {
  const ids = new Set<string>();

  const add = (val: unknown) => {
    const s = String(val ?? "").trim();
    if (s) ids.add(s);
  };

  add(product.id);
  add(product.article);

  if (product.wbUrl) {
    const m = String(product.wbUrl).match(/catalog\/(\d+)/i);
    if (m?.[1]) add(m[1]);
  }

  if (Array.isArray(product.images)) {
    for (const img of product.images) {
      if (!img) continue;
      const m = String(img).match(/\/part\d+\/(\d+)\//i);
      if (m?.[1]) add(m[1]);
    }
  }

  return ids;
}

export function getReviewsForProduct(product: {
  id?: string | number;
  article?: string;
  wbUrl?: string;
  images?: string[];
}): Review[] {
  const ids = getProductIdentifiers(product);
  if (ids.size === 0) return [];
  return reviews.filter((r) => r.productId && ids.has(String(r.productId).trim()));
}

function getProductRating(product: {
  id?: string | number;
  article?: string;
  wbUrl?: string;
  images?: string[];
  rating?: number | string;
  reviewsCount?: number | string;
}) {
  const productReviews = getReviewsForProduct(product);

  if (productReviews.length > 0) {
    const rating =
      productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length;

    return {
      rating: Number(rating.toFixed(1)),
      reviewsCount: productReviews.length,
    };
  }

  const rawCount = Number(product.reviewsCount ?? 0);
  const rawRating = Number(product.rating ?? 0);
  if (Number.isFinite(rawCount) && rawCount > 0) {
    return {
      rating: Number.isFinite(rawRating) && rawRating > 0 ? Number(rawRating.toFixed(1)) : 5,
      reviewsCount: Math.floor(rawCount),
    };
  }

  return {
    rating: 0,
    reviewsCount: 0,
  };
}

function normalizeProduct(p: ProductPayload): Product {
  const images = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
  const reviewInfo = getProductRating({
    id: p.id,
    article: p.article,
    wbUrl: p.wbUrl,
    images,
    rating: p.rating,
    reviewsCount: p.reviewsCount,
  });

  const normalizedSizes = Array.isArray(p.sizes)
    ? p.sizes
        .filter((size) => size?.value)
        .map((size) => ({
          value: String(size.value ?? ""),
          status:
            size.status === "low"
              ? ("low" as const)
              : size.status === "unavailable"
                ? ("unavailable" as const)
                : ("available" as const),
          stockOffline: size.stockOffline,
          stockWB: size.stockWB,
        }))
    : p.size
      ? [
          {
            value: String(p.size),
            status: "available" as const,
            stockOffline: undefined,
            stockWB: undefined,
          },
        ]
      : [];

  const colors = Array.isArray(p.colors)
    ? p.colors.map((color) => ({
        name: String(color.name ?? ""),
        code: color.code ?? color.hex,
        hex: color.hex ?? color.code,
      }))
    : p.color
      ? [{ name: String(p.color), code: String(p.color), hex: String(p.color) }]
      : [];

  const price = Number(p.price ?? 0);
  const oldPrice = Number(p.oldPrice ?? 0);
  const hasOfflineStock = normalizedSizes.some((size) => (size.stockOffline ?? 0) > 0);
  const hasWBStock = normalizedSizes.some((size) => (size.stockWB ?? 0) > 0);
  const hasOffline = Boolean(p.available) || Boolean(p.offlineOnly) || hasOfflineStock;
  const hasWB = Boolean(p.wbUrl) || Boolean(p.wbOnly) || Boolean(p.bothAvailable) || hasWBStock;

  return {
    id: String(p.id ?? ""),
    article: String(p.article ?? ""),
    name: String(p.name ?? ""),
    brand: String(p.brand ?? ""),
    category: String(p.category ?? ""),
    description: String(p.description ?? ""),
    price,
    oldPrice,
    discount:
      oldPrice > price
        ? Math.round(((oldPrice - price) / oldPrice) * 100)
        : Number(p.discount ?? 0) || 0,
    images,
    sizes: normalizedSizes,
    colors,
    gender: String(p.gender ?? ""),
    available: Boolean(p.available),
    offlineOnly: hasOffline && !hasWB,
    rating: reviewInfo.rating,
    reviewsCount: reviewInfo.reviewsCount,
    wbOnly: !hasOffline && hasWB,
    bothAvailable: hasOffline && hasWB,
    isNew: Boolean(p.isNew),
    isFeatured: Boolean(p.isFeatured),
    isSale: Boolean(p.isSale) || oldPrice > price,
    tags: Array.isArray(p.tags) ? p.tags : [],
    wbUrl: String(p.wbUrl ?? ""),
  };
}

function getProductKey(product: Product): string {
  const id = String(product.id || product.article || "").trim();
  if (id) {
    return `id:${id}`;
  }

  const wbUrl = String(product.wbUrl || "").trim();
  if (wbUrl) {
    return `wb:${wbUrl}`;
  }

  const identity = [
    product.name,
    product.brand,
    product.category,
    product.description,
    product.images[0] ?? "",
  ]
    .filter(Boolean)
    .join("::")
    .toLowerCase();

  return identity || `${product.name}::${product.brand}`.toLowerCase();
}

function mergeSize(
  existing: Product["sizes"][number],
  incoming: Product["sizes"][number]
) {
  const status: Product["sizes"][number]["status"] =
    existing.status === "available" || incoming.status === "available"
      ? "available"
      : existing.status === "low" || incoming.status === "low"
        ? "low"
        : "unavailable";

  return {
    value: existing.value,
    status,
    stockOffline: Math.max(existing.stockOffline ?? 0, incoming.stockOffline ?? 0),
    stockWB: Math.max(existing.stockWB ?? 0, incoming.stockWB ?? 0),
  };
}

function dedupeImages(images: string[]): string[] {
  const seen = new Set<string>();

  return images.filter((image) => {
    const normalized = (image ?? "").trim();
    if (!normalized || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

function dedupeColors(colors: Product["colors"]): Product["colors"] {
  const seen = new Set<string>();

  return colors.filter((color) => {
    const normalizedKey = `${color.name ?? ""}-${color.code ?? ""}-${color.hex ?? ""}`.toLowerCase();
    if (!normalizedKey || seen.has(normalizedKey)) {
      return false;
    }

    seen.add(normalizedKey);
    return true;
  });
}

function groupProducts(products: Product[]): Product[] {
  const map = new Map<string, Product>();

  for (const product of products) {
    const key = getProductKey(product);
    const existing = map.get(key);

    if (!existing) {
      map.set(key, {
        ...product,
        sizes: [...product.sizes],
        colors: dedupeColors(product.colors ?? []),
        images: dedupeImages(product.images ?? []),
        tags: [...(product.tags ?? [])],
      });
      continue;
    }

    existing.id = existing.id || product.id;
    existing.article = existing.article || product.article;
    existing.name = existing.name || product.name;
    existing.brand = existing.brand || product.brand;
    existing.category = existing.category || product.category;
    existing.description = existing.description || product.description;
    existing.price = existing.price > 0 ? existing.price : product.price;
    existing.oldPrice =
      existing.oldPrice && existing.oldPrice > 0 ? existing.oldPrice : product.oldPrice;
    existing.discount =
      existing.discount && existing.discount > 0 ? existing.discount : product.discount;

    existing.images = dedupeImages([...(existing.images ?? []), ...(product.images ?? [])]);
    existing.colors = dedupeColors([...(existing.colors ?? []), ...(product.colors ?? [])]);
    existing.tags = [...new Set([...(existing.tags ?? []), ...(product.tags ?? [])])];
    existing.wbUrl = existing.wbUrl || product.wbUrl;

    existing.isNew = existing.isNew || product.isNew;
    existing.isFeatured = existing.isFeatured || product.isFeatured;
    existing.isSale = existing.isSale || product.isSale;
    existing.available = existing.available || product.available;

    const mergedOffline =
      existing.offlineOnly ||
      product.offlineOnly ||
      existing.sizes.some((size) => (size.stockOffline ?? 0) > 0) ||
      product.available;
    const mergedWB =
      existing.wbOnly ||
      product.wbOnly ||
      Boolean(existing.wbUrl) ||
      existing.sizes.some((size) => (size.stockWB ?? 0) > 0);
    existing.offlineOnly = mergedOffline && !mergedWB;
    existing.wbOnly = !mergedOffline && mergedWB;
    existing.bothAvailable = mergedOffline && mergedWB;

    for (const size of product.sizes) {
      const current = existing.sizes.find((item) => item.value === size.value);
      if (!current) {
        existing.sizes.push(size);
      } else {
        const merged = mergeSize(current, size);
        existing.sizes[existing.sizes.indexOf(current)] = merged;
      }
    }
  }

  return Array.from(map.values())
    .map((product) => {
      const reviewInfo = getProductRating({
        id: product.id,
        article: product.article,
        wbUrl: product.wbUrl,
        images: product.images,
        rating: product.rating,
        reviewsCount: product.reviewsCount,
      });

      return {
        ...product,
        rating: reviewInfo.rating,
        reviewsCount: reviewInfo.reviewsCount,
        sizes: sortProductSizes(product.sizes, product.category, product.name),
        available:
          product.available ||
          product.sizes.some((size) => size.status === "available" || size.status === "low"),
      };
    })
    .filter((product) => product.name || product.brand);
}

/**
 * Даёт каталог синхронно для первого рендера: сначала память, затем localStorage,
 * а при первом визите/ошибке — небольшой встроенный резервный каталог.
 */
export function getInitialProducts(): Product[] {
  if (cacheProducts?.length) return cacheProducts;

  try {
    const cached =
      typeof window !== "undefined" ? window.localStorage.getItem(CACHE_KEY) : null;
    if (cached) {
      const parsed = JSON.parse(cached) as ProductPayload[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        const grouped = groupProducts(parsed.map((item) => normalizeProduct(item)));
        if (grouped.length > 0) {
          cacheProducts = grouped;
          return grouped;
        }
      }
    }
  } catch {
    // Повреждённый/недоступный localStorage не должен блокировать каталог.
  }

  cacheProducts = groupProducts(
    (fallbackCatalogProducts as unknown as ProductPayload[]).map(normalizeProduct)
  );
  return cacheProducts;
}

export function getCatalogStatus(): CatalogLoadStatus {
  return catalogStatus;
}

function persistCatalogWhenIdle(products: Product[]) {
  if (typeof window === "undefined") return;
  window.setTimeout(() => {
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(products));
    } catch {
      // Переполнен/недоступен localStorage — каталог уже доступен в памяти.
    }
  }, 0);
}

function requestCatalog(force = false): Promise<Product[]> {
  const initialProducts = getInitialProducts();
  if (catalogPromise) return catalogPromise;

  if (
    !force &&
    freshAt > 0 &&
    Date.now() - freshAt < CATALOG_FRESH_MS
  ) {
    return Promise.resolve(cacheProducts ?? initialProducts);
  }

  if (!force && Date.now() < retryAfter) {
    return Promise.resolve(cacheProducts ?? initialProducts);
  }

  catalogStatus = "loading";
  catalogPromise = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      CATALOG_REQUEST_TIMEOUT_MS
    );

    try {
      const response = await fetch(API_URL, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Catalog request failed: HTTP ${response.status}`);
      }

      const data = (await response.json()) as unknown;
      if (!Array.isArray(data)) {
        throw new Error("Unexpected catalog response format");
      }

      const grouped = groupProducts(
        (data as ProductPayload[]).map((item) => normalizeProduct(item))
      );
      if (grouped.length === 0) {
        throw new Error("Catalog response contained no products");
      }

      cacheProducts = grouped;
      freshAt = Date.now();
      retryAfter = 0;
      catalogStatus = "success";
      persistCatalogWhenIdle(grouped);
      return grouped;
    } catch (error) {
      catalogStatus = "error";
      retryAfter = Date.now() + CATALOG_RETRY_DELAY_MS;
      // Оставляем last-known-good/резервный каталог на экране вместо пустой страницы.
      console.warn("Каталог не обновился; показываем сохранённые товары.", error);
      return cacheProducts ?? initialProducts;
    } finally {
      clearTimeout(timeout);
      catalogPromise = null;
    }
  })();

  return catalogPromise;
}

/**
 * Быстро возвращает сохранённый/резервный список UI сразу после первого рендера,
 * а сетевой запрос ограничен таймаутом и дедуплицируется для всех потребителей.
 */
export function loadProducts(): Promise<Product[]> {
  return requestCatalog(false);
}

/** Актуальный каталог для корзины и оформления заказа. */
export function refreshProducts(
  options: { force?: boolean } = {}
): Promise<Product[]> {
  return requestCatalog(Boolean(options.force));
}

export async function preloadProduct(id: string): Promise<void> {
  const products = await loadProducts();
  const product = products.find((item) => String(item.id) === String(id));
  if (product) {
    void product;
  }
}

export async function getProductById(
  id: string,
  options: { force?: boolean } = {}
): Promise<Product | undefined> {
  const findProduct = (products: Product[]) =>
    products.find(
      (product) =>
        String(product.id) === String(id) || String(product.article) === String(id)
    );

  if (!options.force) {
    const cachedProduct = findProduct(getInitialProducts());
    if (cachedProduct) {
      // Сразу показываем уже сохранённый товар, а каталог обновляем в фоне.
      void loadProducts();
      return cachedProduct;
    }
  }

  const products = options.force
    ? await refreshProducts({ force: true })
    : await loadProducts();
  return findProduct(products);
}

export async function getNewProducts(): Promise<Product[]> {
  const products = await loadProducts();

  return products.filter((p) => p.isNew);
}

export async function getSaleProducts(): Promise<Product[]> {
  const products = await loadProducts();

  return products.filter((p) => p.isSale);
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const products = await loadProducts();

  return products.filter((p) => p.isFeatured);
}
