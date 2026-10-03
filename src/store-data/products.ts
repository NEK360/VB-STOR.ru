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
  gender?: "Мужской" | "Женский" | "Унисекс" | "Мальчики" | "Девочки" | "";
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
    category: "Товары",
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
    gender: "Унисекс",
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
    id: "537424389",
    article: "537424389",
    name: "Сабо классические",
    brand: "CROCS",
    category: "Шлепанцы",
    description:
      "Лёгкие и удобные сабо для повседневной носки, пляжа и отдыха. Выполнены из мягкого износостойкого материала.",
    price: 1890,
    oldPrice: 2490,
    discount: 24,
    images: [
      "https://basket-28.wbbasket.ru/vol5374/part537424/537424389/images/big/1.webp",
      "https://basket-28.wbbasket.ru/vol5374/part537424/537424389/images/big/2.webp",
      "https://basket-28.wbbasket.ru/vol5374/part537424/537424389/images/big/3.webp",
    ],
    sizes: [
      { value: "36-37", status: "available", stockOffline: 1, stockWB: 1 },
      { value: "37-38", status: "available", stockOffline: 2, stockWB: 2 },
      { value: "38-39", status: "available", stockOffline: 2, stockWB: 1 },
      { value: "40", status: "available", stockOffline: 1, stockWB: 1 },
    ],
    colors: [{ name: "Белый", hex: "#ffffff" }],
    season: "Лето",
    gender: "Унисекс",
    isNew: false,
    isFeatured: true,
    isSale: true,
    rating: 0,
    reviewsCount: 0,
    available: true,
    offlineOnly: false,
    wbOnly: false,
    bothAvailable: true,
    wbUrl: "https://www.wildberries.ru/catalog/537424389/detail.aspx",
    tags: ["сабо", "crocs", "шлепанцы", "лето"],
  },
  {
    id: "227073601",
    article: "227073601",
    name: "Кроссовки мужские спортивные демисезонные",
    brand: "VB STORE",
    category: "Кроссовки",
    description:
      "Современные спортивные кроссовки с амортизирующей подошвой. Легкий верх из дышащего материала, надёжная фиксация стопы. Подходят для занятий спортом и активного отдыха.",
    price: 5490,
    oldPrice: 8990,
    discount: 39,
    images: [
      "https://basket-28.wbbasket.ru/vol5369/part536953/536953515/images/big/1.webp",
    ],
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
    rating: 5,
    reviewsCount: 9,
    available: true,
    offlineOnly: false,
    wbOnly: false,
    bothAvailable: true,
    wbUrl: "https://www.wildberries.ru/catalog/227073601/detail.aspx",
    tags: ["кроссовки", "спорт", "мужская обувь", "фитнес"],
  },
  {
    id: "89",
    article: "365083242",
    name: "Топ вечерний с вырезом",
    brand: "VB STORE",
    category: "Одежда",
    description:
      "Элегантный женский вечерний топ с фигурным вырезом. Мягкая эластичная ткань отлично держит форму и подчеркивает силуэт.",
    price: 799,
    oldPrice: 1290,
    discount: 38,
    images: [
      "https://mow-basket-cdn-44.geobasket.ru/vol3650/part365083/365083242/images/big/1.webp",
    ],
    sizes: [
      { value: "S", status: "available", stockOffline: 2, stockWB: 0 },
      { value: "M", status: "available", stockOffline: 2, stockWB: 0 },
      { value: "48", status: "available", stockOffline: 1, stockWB: 0 },
    ],
    colors: [{ name: "Чёрный", hex: "#1a1a1a" }],
    season: "Всесезонный",
    gender: "Женский",
    isNew: true,
    isFeatured: false,
    isSale: true,
    rating: 0,
    reviewsCount: 0,
    available: true,
    offlineOnly: true,
    wbOnly: false,
    bothAvailable: false,
    tags: ["топ", "одежда", "женская одежда"],
  },
  {
    id: "90",
    article: "177156061",
    name: "Лонгслив базовый в рубчик с длинным рукавом",
    brand: "VB STORE",
    category: "Одежда",
    description:
      "Базовый женский лонгслив в рубчик с длинным рукавом. Приятный к телу хлопок с добавлением эластана.",
    price: 799,
    oldPrice: 1190,
    discount: 33,
    images: [
      "https://mow-basket-cdn-03.geobasket.ru/vol1771/part177156/177156061/images/big/1.webp",
    ],
    sizes: [
      { value: "S", status: "available", stockOffline: 1, stockWB: 0 },
      { value: "M", status: "available", stockOffline: 2, stockWB: 0 },
      { value: "L", status: "available", stockOffline: 1, stockWB: 0 },
      { value: "XL", status: "available", stockOffline: 1, stockWB: 0 },
    ],
    colors: [{ name: "Бежевый", hex: "#d6c7b2" }],
    season: "Всесезонный",
    gender: "Женский",
    isNew: false,
    isFeatured: true,
    isSale: true,
    rating: 5,
    reviewsCount: 0,
    available: true,
    offlineOnly: true,
    wbOnly: false,
    bothAvailable: false,
    tags: ["лонгслив", "одежда", "базовый"],
  },
  {
    id: "283",
    article: "431911182",
    name: "Спортивная футболка для фитнеса",
    brand: "VB STORE",
    category: "Одежда",
    description: "Удобная дышащая спортивная футболка для фитнеса и тренировок.",
    price: 799,
    oldPrice: 1290,
    discount: 38,
    images: [
      "https://mow-basket-cdn-44.geobasket.ru/vol4319/part431911/431911182/images/big/1.webp",
    ],
    sizes: [
      { value: "M", status: "available", stockOffline: 2, stockWB: 0 },
      { value: "L", status: "available", stockOffline: 1, stockWB: 0 },
      { value: "XL", status: "available", stockOffline: 1, stockWB: 0 },
    ],
    colors: [{ name: "Чёрный", hex: "#1a1a1a" }],
    season: "Всесезонный",
    gender: "Женский",
    isNew: false,
    isFeatured: false,
    isSale: true,
    rating: 0,
    reviewsCount: 0,
    available: true,
    offlineOnly: true,
    wbOnly: false,
    bothAvailable: false,
    tags: ["футболка", "фитнес", "одежда"],
  },
  {
    id: "284",
    article: "GSW008409-1",
    name: "Молочный кардиган с контрастными линиями",
    brand: "GLORIA JEANS",
    category: "Одежда",
    description: "Мягкий вязаный кардиган молочного оттенка с контрастной отделкой.",
    price: 699,
    oldPrice: 1299,
    discount: 46,
    images: [
      "https://storage-cdn10.gloria-jeans.ru/pictures/Molocnyj-kardigan-s-kontrastnymi-liniami_GSW008409-1_01_1200Wx1200H.webp?q=907769",
    ],
    sizes: [
      { value: "134", status: "available", stockOffline: 1, stockWB: 0 },
      { value: "140", status: "available", stockOffline: 1, stockWB: 0 },
      { value: "146", status: "available", stockOffline: 1, stockWB: 0 },
    ],
    colors: [{ name: "Молочный", hex: "#f5f2eb" }],
    season: "Демисезон",
    gender: "Девочки",
    isNew: true,
    isFeatured: false,
    isSale: true,
    rating: 0,
    reviewsCount: 0,
    available: true,
    offlineOnly: true,
    wbOnly: false,
    bothAvailable: false,
    tags: ["кардиган", "девочки", "одежда"],
  },
  {
    id: "861667530",
    article: "861667530",
    name: "Джинсы широкие прямые с вышивкой",
    brand: "VB STORE",
    category: "Одежда",
    description:
      "Стильные широкие прямые джинсы с эксклюзивной вышивкой. Высококачественный деним, современный крой, актуальный силуэт. Идеально для повседневного образа и casual-стиля.",
    price: 3990,
    oldPrice: 6490,
    discount: 39,
    images: [
      "https://basket-38.wbbasket.ru/vol8616/part861613/861613454/images/big/2.webp",
    ],
    sizes: [
      { value: "40", status: "available", stockOffline: 2, stockWB: 0 },
      { value: "42", status: "low", stockOffline: 1, stockWB: 0 },
      { value: "44", status: "available", stockOffline: 2, stockWB: 0 },
      { value: "46", status: "available", stockOffline: 1, stockWB: 0 },
      { value: "48", status: "available", stockOffline: 2, stockWB: 0 },
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
    id: "91",
    article: "63753956",
    name: "Станция Dobe для джойстика контроллера PS4 Pro/Slim",
    brand: "DOBE",
    category: "Товары",
    description:
      "Зарядная док-станция Dobe для одновременной зарядки двух геймпадов DualShock 4 PS4 / PS4 Slim / PS4 Pro.",
    price: 499,
    oldPrice: 799,
    discount: 38,
    images: [
      "https://mow-basket-cdn-58.geobasket.ru/vol637/part63753/63753956/images/big/1.webp",
    ],
    sizes: [{ value: "1шт", status: "available", stockOffline: 2, stockWB: 0 }],
    colors: [{ name: "Чёрный", hex: "#1a1a1a" }],
    season: "Всесезонный",
    gender: "Унисекс",
    isNew: false,
    isFeatured: false,
    isSale: true,
    rating: 0,
    reviewsCount: 0,
    available: true,
    offlineOnly: true,
    wbOnly: false,
    bothAvailable: false,
    tags: ["станция", "ps4", "джойстик", "товары"],
  },
  {
    id: "88",
    article: "28604349",
    name: "Тапочки домашние мягкие",
    brand: "VB STORE",
    category: "Шлепанцы",
    description: "Уютные мягкие домашние тапочки на нескользящей подошве.",
    price: 699,
    oldPrice: 990,
    discount: 29,
    images: [
      "https://mow-basket-cdn-11.geobasket.ru/vol286/part28604/28604349/images/hq/1.webp",
    ],
    sizes: [
      { value: "37", status: "available", stockOffline: 1, stockWB: 0 },
      { value: "38", status: "available", stockOffline: 2, stockWB: 0 },
      { value: "39", status: "available", stockOffline: 1, stockWB: 0 },
    ],
    colors: [{ name: "Розовый", hex: "#f472b6" }],
    season: "Всесезонный",
    gender: "Женский",
    isNew: false,
    isFeatured: false,
    isSale: true,
    rating: 0,
    reviewsCount: 0,
    available: true,
    offlineOnly: true,
    wbOnly: false,
    bothAvailable: false,
    tags: ["тапочки", "домашние", "шлепанцы"],
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
