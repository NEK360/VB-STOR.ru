// ============================================================
// VB STORE — Analytics Module
// Подключи нужные инструменты, раскомментировав блоки.
// ============================================================

// ---- Google Analytics 4 ----
// Добавь в index.html:
// <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
// const GA_ID = "G-XXXXXXXXXX";

// ---- Яндекс Метрика ----
// const YM_ID = 12345678;

// ---- Meta Pixel ----
// const META_PIXEL_ID = "XXXXXXXXXXXXXXXXXX";

// ---- TikTok Pixel ----
// const TIKTOK_PIXEL_ID = "XXXXXXXXXXXXXXXXXX";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    ym?: (id: number, method: string, ...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    ttq?: { track: (...args: unknown[]) => void };
    dataLayer?: unknown[];
  }
}

export const analytics = {
  // Page view
  pageView: (url: string) => {
    // GA4
    // window.gtag?.("config", GA_ID, { page_path: url });
    // YM
    // window.ym?.(YM_ID, "hit", url);
    console.debug("[Analytics] pageView:", url);
  },

  // Product view
  viewProduct: (productId: string, productName: string, price: number) => {
    // window.gtag?.("event", "view_item", { items: [{ item_id: productId, item_name: productName, price }] });
    // window.fbq?.("track", "ViewContent", { content_ids: [productId], value: price, currency: "RUB" });
    console.debug("[Analytics] viewProduct:", productId, productName, price);
  },

  // Add to favorites
  addToFavorites: (productId: string) => {
    // window.gtag?.("event", "add_to_wishlist", { items: [{ item_id: productId }] });
    console.debug("[Analytics] addToFavorites:", productId);
  },

  // Order submit
  submitOrder: (productId: string, productName: string, price: number) => {
    // window.gtag?.("event", "begin_checkout", { items: [{ item_id: productId, item_name: productName, price }] });
    // window.fbq?.("track", "InitiateCheckout", { content_ids: [productId], value: price, currency: "RUB" });
    console.debug("[Analytics] submitOrder:", productId, productName, price);
  },

  // Search
  search: (query: string) => {
    // window.gtag?.("event", "search", { search_term: query });
    console.debug("[Analytics] search:", query);
  },

  // Click WB link
  clickWildberries: (productId: string) => {
    // window.gtag?.("event", "click_wildberries", { item_id: productId });
    console.debug("[Analytics] clickWildberries:", productId);
  },

  // Click contact
  clickContact: (method: string) => {
    // window.gtag?.("event", "click_contact", { method });
    console.debug("[Analytics] clickContact:", method);
  },

  // Promo code applied (раньше метод вызывался на карточке товара, но не был определён)
  applyPromo: (code: string, success: boolean) => {
    // window.gtag?.("event", "apply_promo", { promo_code: code, success });
    console.debug("[Analytics] applyPromo:", code, success);
  },

  // Cart
  addToCart: (productId: string, productName: string, price: number) => {
    // window.gtag?.("event", "add_to_cart", { items: [{ item_id: productId, item_name: productName, price }] });
    // window.fbq?.("track", "AddToCart", { content_ids: [productId], value: price, currency: "RUB" });
    console.debug("[Analytics] addToCart:", productId, productName, price);
  },

  removeFromCart: (productId: string) => {
    // window.gtag?.("event", "remove_from_cart", { items: [{ item_id: productId }] });
    console.debug("[Analytics] removeFromCart:", productId);
  },

  // Checkout
  beginCheckout: (itemsCount: number, total: number) => {
    // window.gtag?.("event", "begin_checkout", { value: total, currency: "RUB" });
    console.debug("[Analytics] beginCheckout:", itemsCount, total);
  },

  purchase: (orderId: string, total: number) => {
    // window.gtag?.("event", "purchase", { transaction_id: orderId, value: total, currency: "RUB" });
    console.debug("[Analytics] purchase:", orderId, total);
  },
};
