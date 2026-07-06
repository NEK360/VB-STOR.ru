export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  href: string;
  badge?: string;
  bgColor: string;
}

export const banners: Banner[] = [
  {
    id: "1",
    badge: "Хит сезона",
    title: "Ботильоны таби",
    subtitle: "Скидка до 42%",
    image: "https://basket-38.wbbasket.ru/vol8616/part861605/861605837/images/big/2.webp",
    href: "/catalog/861605837",
    bgColor: "#1a1a2e",
  },
  {
    id: "2",
    badge: "Для геймеров",
    title: "Напальчники",
    subtitle: "Улучши игру",
    image: "https://basket-38.wbbasket.ru/vol8595/part859564/859564588/images/big/1.webp",
    href: "/catalog/859564588",
    bgColor: "#0f3460",
  },
  {
    id: "3",
    badge: "Натуральная кожа",
    title: "Лоферы",
    subtitle: "Российское производство",
    image: "https://basket-38.wbbasket.ru/vol8616/part861613/861613454/images/big/1.webp",
    href: "/catalog/861613454",
    bgColor: "#16213e",
  },
];
