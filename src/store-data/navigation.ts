export interface NavLink {
  label: string;
  href: string;
  badge?: string;
}

export const navLinks: NavLink[] = [
  { label: "Главная", href: "/" },
  { label: "Каталог", href: "/catalog" },
  { label: "Новинки", href: "/catalog?filter=new", badge: "NEW" },
  { label: "Распродажа", href: "/sale", badge: "SALE" },
  { label: "Отзывы", href: "/reviews" },
  { label: "Контакты", href: "/contacts" },
  { label: "FAQ", href: "/faq" },
];

export const mobileNavLinks: NavLink[] = [
  { label: "Главная", href: "/" },
  { label: "Каталог", href: "/catalog" },
  { label: "Распродажа", href: "/sale" },
  { label: "Избранное", href: "/favorites" },
  { label: "Контакты", href: "/contacts" },
];
