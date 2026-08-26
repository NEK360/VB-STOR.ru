export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  badge?: string;
  primaryButton: { label: string; href: string };
  secondaryButton?: { label: string; href: string };
  image: string;
  imageMobile?: string;
  accentColor: string;
}

export const heroSlides: HeroSlide[] = [
  {
    id: "1",
    badge: "Новая коллекция 2026",
    title: "VB STORE",
    subtitle: "Выгодный магазин",
    description: "Обувь, одежда и аксессуары в современном стиле. Выбирайте удобные и актуальные модели.",
    primaryButton: { label: "Смотреть каталог", href: "/catalog" },
    secondaryButton: { label: "Хиты продаж", href: "/catalog?filter=featured" },
    image: "https://basket-38.wbbasket.ru/vol8616/part861613/861613454/images/big/1.webp",
    accentColor: "#ffffff",
  },
  {
    id: "2",
    badge: "Скидки до 43%",
    title: "Распродажа",
    subtitle: "Лучшие цены",
    description: "Ботильоны, лоферы, джинсы по специальным ценам. Только сейчас.",
    primaryButton: { label: "Смотреть распродажу", href: "/sale" },
    image: "https://basket-38.wbbasket.ru/vol8616/part861605/861605837/images/big/1.webp",
    accentColor: "#ffffff",
  },
];
