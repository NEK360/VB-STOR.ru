export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  image?: string;
  description?: string;
  count?: number;
}

export const categories: Category[] = [
  { id: "sneakers", name: "Кроссовки", slug: "кроссовки", icon: "👟", description: "Спортивные и повседневные кроссовки" },
  { id: "loafers", name: "Лоферы", slug: "лоферы", icon: "👞", description: "Классические и стильные лоферы" },
  { id: "boots", name: "Ботильоны", slug: "ботильоны", icon: "👢", description: "Элегантные женские ботильоны" },
  { id: "jeans", name: "Джинсы", slug: "джинсы", icon: "👖", description: "Широкие и зауженные джинсы" },
  { id: "accessories", name: "Аксессуары для геймпадов", slug: "аксессуары для геймпадов", icon: "🎮", description: "Аксессуары для геймеров" },
];
