export const settings = {
  storeName: "STORE",
  storeSlogan: "Выгодный магазин",
  currency: "₽",
  currencyCode: "RUB",
  phone: "+7 918 797-02-30",
  phoneClean: "79187970230",
  email: "vbshop456@gmail.com",
  telegram: "@VB_STORE_IZOB",
  telegramUrl: "https://t.me/VB_STORE_IZOB",
  whatsapp: "+7 918 797-02-30",
  whatsappUrl: "https://wa.me/79187970230",
  vk: "vbstore",
  vkUrl: "https://vk.com/vbstore",
  max: "VB_STORE",
  maxUrl: "https://vk.ru/away.php?to=https%3A%2F%2Fmax.ru%2Fjoin%2FZNvdah2gh1uWvju7mh49FLZ3bF8hVo5SOUd5ADrO0Ok&utf=1",
  address: "г. Изобильный, Ставропольский край, ул. Кирова, 2Г",
  city: "г. Изобильный",
  region: "Ставропольский край",
  street: "ул. Кирова, 2Г",
  workingHours: "Пн–Вс: 9:00 – 20:00",
  logo: "/images/icons/logo.svg",
  favicon: "/images/icons/favicon.ico",
};

export const paymentMethods = [
  { id: "cash", name: "Наличные при получении", icon: "💵" },
  { id: "card", name: "Банковская карта", icon: "💳" },
  { id: "transfer", name: "Перевод на карту", icon: "📱" },
  { id: "wildberries", name: "Оплата на Wildberries", icon: "🛍️" },
];

export const deliveryMethods = [
  { id: "pickup", name: "Самовывоз из магазина", description: "г. Изобильный, ул. Кирова, 2Г", price: 0, icon: "🏪" },
  { id: "cdek", name: "СДЭК", description: "Доставка по всей России", price: 350, icon: "📦" },
  { id: "post", name: "Почта России", description: "Доставка по всей России", price: 250, icon: "📮" },
  { id: "wildberries", name: "Wildberries", description: "Доставка через маркетплейс", price: 0, icon: "🛍️" },
];

export const orderMethods = [
  { id: "form", name: "Оставить заявку", icon: "📝" },
  { id: "whatsapp", name: "WhatsApp", icon: "💬", url: "https://wa.me/79187970230" },
  { id: "telegram", name: "Telegram", icon: "✈️", url: "https://t.me/VB_STORE_IZOB" },
  { id: "wildberries", name: "Wildberries", icon: "🛍️" },
];
