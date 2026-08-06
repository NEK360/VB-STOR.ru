import { reviews } from "../store-data/reviews";

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

const API_URL =
  "https://script.google.com/macros/s/AKfycbzjrIaEGBIaQtD67GKYfi712ZN5c2VILKYrmEyIONMOK_W2cWr4IudBrmzEMc3wb9U82w/exec?action=catalog";
const CACHE_KEY = "catalog_cache";

let cacheProducts: Product[] | null = null;
let cachePromise: Promise<Product[]> | null = null;
function getProductRating(product: {
  id: string;
  article: string;
}) {

  const productReviews = reviews.filter(
    (r) =>
      String(r.productId) === String(product.id) ||
      String(r.productId) === String(product.article)
  );

  if (!productReviews.length) {
    return {
      rating: 5,
      reviewsCount: 0,
    };
  }

  const rating =
    productReviews.reduce(
      (sum, r) => sum + r.rating,
      0
    ) / productReviews.length;

  return {
    rating: Number(rating.toFixed(1)),
    reviewsCount: productReviews.length,
  };
}
function getProductRating(product: { id: string; article: string }) {
  const productReviews = reviews.filter(
    (r) => String(r.productId) === String(product.id) || String(r.productId) === String(product.article)
  );

  if (!productReviews.length) {
    return { rating: 5, reviewsCount: 0 };
  }

  const rating = productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length;

  return {
    rating: Number(rating.toFixed(1)),
    reviewsCount: productReviews.length,
  };
}
function normalizeProduct(p: ProductPayload): Product {
  const images = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
 const reviewInfo = getProductRating({
  id: String(p.id ?? ""),
  article: String(p.article ?? ""),
} as unknown as Product);
  const normalizedSizes = Array.isArray(p.sizes)
    ? p.sizes
        .filter((size) => size?.value)
        .map((size) => ({
          value: String(size.value ?? ""),
          status:
            size.status === "low"
              ? "low" as const
              : size.status === "unavailable"
                ? "unavailable" as const
                : "available" as const,
          stockOffline: size.stockOffline,
          stockWB: size.stockWB,
        }))
    : p.size
      ? [{ value: String(p.size), status: "available" as const }]
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
    discount: oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : Number(p.discount ?? 0) || 0,
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
function buildProducts(): Product[] {
  return RAW_PRODUCTS.map((p) => {
    const reviewInfo = getProductRating({ id: p.id, article: p.article });
    return {
      ...p,
      rating: reviewInfo.rating,
      reviewsCount: reviewInfo.reviewsCount,
    };
  });
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

  const identity = [product.name, product.brand, product.category, product.description, product.images[0] ?? ""]
    .filter(Boolean)
    .join("::")
    .toLowerCase();

  return identity || `${product.name}::${product.brand}`.toLowerCase();
}

function mergeSize(existing: Product["sizes"][number], incoming: Product["sizes"][number]) {
  const status: Product["sizes"][number]["status"] = existing.status === "available" || incoming.status === "available"
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
    existing.oldPrice = existing.oldPrice && existing.oldPrice > 0 ? existing.oldPrice : product.oldPrice;
    existing.discount = existing.discount && existing.discount > 0 ? existing.discount : product.discount;

    existing.images = dedupeImages([...(existing.images ?? []), ...(product.images ?? [])]);
    existing.colors = dedupeColors([...(existing.colors ?? []), ...(product.colors ?? [])]);
    existing.tags = [...new Set([...(existing.tags ?? []), ...(product.tags ?? [])])];
    existing.wbUrl = existing.wbUrl || product.wbUrl;

    existing.isNew = existing.isNew || product.isNew;
    existing.isFeatured = existing.isFeatured || product.isFeatured;
    existing.isSale = existing.isSale || product.isSale;
    existing.available = existing.available || product.available;

    const mergedOffline = existing.offlineOnly || product.offlineOnly || existing.sizes.some((size) => (size.stockOffline ?? 0) > 0) || product.available;
    const mergedWB = existing.wbOnly || product.wbOnly || existing.wbUrl || existing.sizes.some((size) => (size.stockWB ?? 0) > 0);
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
    .map((product) => ({
      ...product,
      sizes: [...product.sizes].sort((a, b) => Number(a.value) - Number(b.value) || a.value.localeCompare(b.value)),
      available: product.available || product.sizes.some((size) => size.status === "available" || size.status === "low"),
    }))
    .filter((product) => product.name || product.brand);
}

export async function loadProducts(): Promise<Product[]> {
  if (cacheProducts) return cacheProducts;
  if (cachePromise) return cachePromise;

  cachePromise = new Promise<Product[]>((resolve) => {
    // Simulate a tiny async delay so loading states remain meaningful.
    setTimeout(() => {
      cacheProducts = buildProducts();
      cachePromise = null;
      resolve(cacheProducts);
    }, 120);
  });

  return cachePromise;
}

    try {
      const res = await fetch(API_URL, {
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        throw new Error(`Failed to load products: ${res.status}`);
      }

      const data = (await res.json()) as ProductPayload[];
     console.log("API DATA", data[0]);
      if (!Array.isArray(data)) {
        return cacheProducts ?? [];
      }

      const normalized = data.map(normalizeProduct);
      console.log("NORMALIZED", normalized[0]);
      const grouped = groupProducts(normalized);
      cacheProducts = grouped;

      if (typeof window !== "undefined") {
        window.localStorage.setItem(CACHE_KEY, JSON.stringify(grouped));
      }

      return grouped;
    } finally {
      cachePromise = null;
    }
  })();

  return cachePromise;
}

export async function preloadProduct(id: string): Promise<void> {
  const products = await loadProducts();
  const product = products.find((item) => String(item.id) === String(id));
  if (product) {
    void product;
  }
}

export async function getProductById(id: string): Promise<Product | undefined> {
  const products = await loadProducts();

  return products.find((p) => String(p.id) === String(id));
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
