export interface PageSEO {
  title: string;
  description: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
}

export const seo: Record<string, PageSEO> = {
  home: {
    title: "VB STORE — Premium Fashion & Accessories",
    description: "VB STORE — премиальный интернет-магазин обуви и аксессуаров с доставкой по России. г. Изобильный.",
    keywords: "VB STORE, кроссовки, одежда, аксессуары, купить, интернет-магазин, Изобильный",
    ogTitle: "VB STORE — Premium Fashion",
    ogDescription: "Обувь и аксессуары с доставкой по России",
  },
  catalog: {
    title: "Каталог товаров — VB STORE",
    description: "Полный каталог товаров VB STORE. Кроссовки, ботильоны, лоферы, джинсы и аксессуары по лучшим ценам.",
    keywords: "каталог, кроссовки, ботильоны, лоферы, джинсы, аксессуары",
  },
  sale: {
    title: "Распродажа — VB STORE",
    description: "Скидки до 43% на кроссовки, обувь и аксессуары в VB STORE. Успейте купить по выгодным ценам.",
    keywords: "распродажа, скидки, акции, VB STORE",
  },
  reviews: {
    title: "Отзывы покупателей — VB STORE",
    description: "Реальные отзывы покупателей VB STORE. Узнайте, что говорят наши клиенты о качестве товаров и сервисе.",
    keywords: "отзывы, покупатели, VB STORE",
  },
  contacts: {
    title: "Контакты — VB STORE",
    description: "Контакты VB STORE. г. Изобильный, ул. Кирова, 2Г. Телефон: +7 918 797-02-30. WhatsApp, Telegram.",
    keywords: "контакты, адрес, телефон, VB STORE",
  },
  faq: {
    title: "FAQ — Частые вопросы | VB STORE",
    description: "Ответы на частые вопросы о заказе, доставке, оплате и возврате товаров в VB STORE.",
    keywords: "FAQ, вопросы, ответы, доставка, оплата, возврат",
  },
};
