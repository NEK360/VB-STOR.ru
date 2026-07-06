export interface ProductSize {
  value: string;
  status: "available" | "low" | "unavailable";
  stockOffline?: number;
  stockWB?: number;
}

export interface ProductColor {
  name: string;
  hex: string;
  images?: string[];
}

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
  sizes: ProductSize[];
  colors: ProductColor[];
  season?: string;
  gender?: "Мужской" | "Женский" | "Унисекс" | "";
  material?: string;
  isNew: boolean;
  isFeatured: boolean;
  isSale: boolean;
  rating: number;
  reviewsCount: number;
  available: boolean;
  offlineOnly: boolean;
  wbOnly: boolean;
  bothAvailable: boolean;
  wbUrl?: string;
  tags: string[];
}

export const products: Product[] = [
  {
    id: "859564588",
    article: "859564588",
    name: "Напальчники для игр, для телефона",
    brand: "VB STORE",
    category: "Аксессуары для геймпадов",
    description:
      "Напальчники прекрасно подходят для игры на телефоне и многих других устройствах. Напалечник можно легко включить в игровой набор для телефона или аксессуары для геймеров. Они значительно упрощают управление персонажем в игре и позволяют быстро и легко переключаться между оружием и другими элементами интерфейса, что особенно важно при игре на мобильных устройствах и консолях.",
    price: 299,
    oldPrice: 499,
    discount: 40,
    images: [
      "https://basket-38.wbbasket.ru/vol8595/part859564/859564588/images/big/1.webp",
      "https://basket-38.wbbasket.ru/vol8595/part859564/859564588/images/big/2.webp",
      "https://basket-38.wbbasket.ru/vol8595/part859564/859564588/images/big/3.webp",
      "https://basket-38.wbbasket.ru/vol8595/part859564/859564588/images/big/4.webp",
      "https://basket-38.wbbasket.ru/vol8595/part859564/859564588/images/big/5.webp",
    ],
    sizes: [
      { value: "Универсальный", status: "available", stockOffline: 15, stockWB: 20 },
    ],
    colors: [{ name: "Синий", hex: "#3B82F6" }],
    season: "Всесезонный",
    gender: "",
    isNew: true,
    isFeatured: true,
    isSale: true,
    rating: 4.8,
    reviewsCount: 124,
    available: true,
    offlineOnly: false,
    wbOnly: false,
    bothAvailable: true,
    wbUrl: "https://www.wildberries.ru/catalog/859564588/detail.aspx",
    tags: ["геймер", "телефон", "игры", "аксессуары", "напальчники"],
  },
  {
    id: "861605837",
    article: "861605837",
    name: "Ботильоны чулки женские демисезонные",
    brand: "VB STORE",
    category: "Ботильоны",
    description:
      "Ботильоны чулки женские. Ботильоны таби — один из самых актуальных трендов этого сезона. Ботильоны женские демисезонные — настоящая находка на весну. Черные ботильоны женские весна выполнены из долговечной и простой в уходе экокожи, а подкладка и стелька из мягкой байки обеспечат тепло и комфорт в прохладную погоду. Ботильоны на низком каблуке гармонично дополнят как повседневные, так и нарядные образы.",
    price: 3490,
    oldPrice: 5990,
    discount: 42,
    images: [
      "https://basket-38.wbbasket.ru/vol8616/part861605/861605837/images/big/1.webp",
      "https://basket-38.wbbasket.ru/vol8616/part861605/861605837/images/big/2.webp",
      "https://basket-38.wbbasket.ru/vol8616/part861605/861605837/images/big/3.webp",
      "https://basket-38.wbbasket.ru/vol8616/part861605/861605837/images/big/4.webp",
      "https://basket-38.wbbasket.ru/vol8616/part861605/861605837/images/big/5.webp",
    ],
    sizes: [
      { value: "36", status: "available", stockOffline: 2, stockWB: 5 },
      { value: "37", status: "low", stockOffline: 1, stockWB: 2 },
      { value: "38", status: "available", stockOffline: 3, stockWB: 7 },
      { value: "39", status: "unavailable", stockOffline: 0, stockWB: 0 },
      { value: "40", status: "low", stockOffline: 1, stockWB: 1 },
    ],
    colors: [{ name: "Чёрный", hex: "#1a1a1a" }],
    season: "Демисезон",
    gender: "Женский",
    material: "Экокожа, байка",
    isNew: true,
    isFeatured: true,
    isSale: true,
    rating: 4.7,
    reviewsCount: 89,
    available: true,
    offlineOnly: false,
    wbOnly: false,
    bothAvailable: true,
    wbUrl: "https://www.wildberries.ru/catalog/861605837/detail.aspx",
    tags: ["ботильоны", "женская обувь", "весна", "демисезон", "экокожа", "таби"],
  },
  {
    id: "861613454",
    article: "861613454",
    name: "Лоферы кожаные из натуральных материалов",
    brand: "VB STORE",
    category: "Лоферы",
    description:
      "Классические однотонные мужские туфли выполнены из натуральной глянцевой кожи российского производства. Модные лоферы подойдут в качестве повседневной, офисной, деловой, вечерней, свадебной обуви, а также школьной и выпускной подростковой для старшеклассников.",
    price: 4290,
    oldPrice: 7490,
    discount: 43,
    images: [
      "https://basket-38.wbbasket.ru/vol8616/part861613/861613454/images/big/1.webp",
      "https://basket-38.wbbasket.ru/vol8616/part861613/861613454/images/big/2.webp",
      "https://basket-38.wbbasket.ru/vol8616/part861613/861613454/images/big/3.webp",
      "https://basket-38.wbbasket.ru/vol8616/part861613/861613454/images/big/4.webp",
      "https://basket-38.wbbasket.ru/vol8616/part861613/861613454/images/big/5.webp",
    ],
    sizes: [
      { value: "39", status: "low", stockOffline: 1, stockWB: 2 },
      { value: "40", status: "available", stockOffline: 3, stockWB: 5 },
      { value: "41", status: "available", stockOffline: 4, stockWB: 8 },
      { value: "42", status: "available", stockOffline: 2, stockWB: 6 },
      { value: "43", status: "low", stockOffline: 1, stockWB: 1 },
      { value: "44", status: "unavailable", stockOffline: 0, stockWB: 0 },
      { value: "45", status: "available", stockOffline: 2, stockWB: 3 },
    ],
    colors: [{ name: "Чёрный", hex: "#1a1a1a" }],
    season: "Всесезонный",
    gender: "Мужской",
    material: "Натуральная кожа",
    isNew: true,
    isFeatured: true,
    isSale: true,
    rating: 4.9,
    reviewsCount: 156,
    available: true,
    offlineOnly: false,
    wbOnly: false,
    bothAvailable: true,
    wbUrl: "https://www.wildberries.ru/catalog/861613454/detail.aspx",
    tags: ["лоферы", "мужская обувь", "натуральная кожа", "офис", "деловой стиль"],
  },
  {
    id: "861667530",
    article: "861667530",
    name: "Джинсы широкие прямые с вышивкой",
    brand: "VB STORE",
    category: "Джинсы",
    description:
      "Стильные широкие прямые джинсы с эксклюзивной вышивкой. Высококачественный деним, современный крой, актуальный силуэт. Идеально для повседневного образа и casual-стиля.",
    price: 3990,
    oldPrice: 6490,
    discount: 39,
    images: [],
    sizes: [
      { value: "38", status: "available", stockOffline: 3, stockWB: 0 },
      { value: "40", status: "available", stockOffline: 2, stockWB: 0 },
      { value: "42", status: "low", stockOffline: 1, stockWB: 0 },
      { value: "44", status: "available", stockOffline: 2, stockWB: 0 },
      { value: "46", status: "unavailable", stockOffline: 0, stockWB: 0 },
    ],
    colors: [
      { name: "Чёрный", hex: "#1a1a1a" },
      { name: "Чёрный графит", hex: "#2d2d2d" },
      { name: "Тёмно-серый", hex: "#4a4a4a" },
    ],
    season: "Всесезонный",
    gender: "Мужской",
    material: "Деним",
    isNew: false,
    isFeatured: false,
    isSale: true,
    rating: 4.6,
    reviewsCount: 43,
    available: true,
    offlineOnly: true,
    wbOnly: false,
    bothAvailable: false,
    wbUrl: undefined,
    tags: ["джинсы", "деним", "широкие", "вышивка", "мужской стиль"],
  },
  {
    id: "869807411",
    article: "869807411",
    name: "Кроссовки мужские спортивные",
    brand: "VB STORE",
    category: "Кроссовки",
    description:
      "Современные спортивные кроссовки с амортизирующей подошвой. Легкий верх из дышащего материала, надёжная фиксация стопы. Подходят для занятий спортом и активного отдыха.",
    price: 5490,
    oldPrice: 8990,
    discount: 39,
    images: [],
    sizes: [
      { value: "40", status: "available", stockOffline: 3, stockWB: 5 },
      { value: "41", status: "available", stockOffline: 4, stockWB: 8 },
      { value: "42", status: "low", stockOffline: 1, stockWB: 3 },
      { value: "43", status: "available", stockOffline: 2, stockWB: 6 },
      { value: "44", status: "available", stockOffline: 3, stockWB: 4 },
      { value: "45", status: "low", stockOffline: 1, stockWB: 1 },
    ],
    colors: [
      { name: "Белый", hex: "#ffffff" },
      { name: "Чёрный", hex: "#1a1a1a" },
    ],
    season: "Всесезонный",
    gender: "Мужской",
    material: "Текстиль, резина",
    isNew: false,
    isFeatured: true,
    isSale: true,
    rating: 4.5,
    reviewsCount: 67,
    available: true,
    offlineOnly: false,
    wbOnly: false,
    bothAvailable: true,
    wbUrl: "https://www.wildberries.ru/catalog/869807411/detail.aspx",
    tags: ["кроссовки", "спорт", "мужская обувь", "фитнес"],
  },
];

export const getFeaturedProducts = () => products.filter((p) => p.isFeatured);
export const getNewProducts = () => products.filter((p) => p.isNew);
export const getSaleProducts = () => products.filter((p) => p.isSale);
export const getProductById = (id: string) => products.find((p) => p.id === id);
export const getProductsByCategory = (category: string) =>
  products.filter((p) => p.category === category);
export const searchProducts = (query: string) => {
  const q = query.toLowerCase();
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
  );
};
