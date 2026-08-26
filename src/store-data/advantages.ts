export interface Advantage {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export const advantages: Advantage[] = [
  {
    id: "1",
    icon: "✓",
    title: "Проверенный ассортимент",
    description: "Подбираем товары с удобным выбором размера и актуальными остатками.",
  },
  {
    id: "2",
    icon: "⚡",
    title: "Быстрая доставка",
    description: "Отправляем заказы в день оформления. Доставка по всей России через Wildberries, OZON, Яндекс, СДЭК и Почту России.",
  },
  {
    id: "3",
    icon: "↩",
    title: "Лёгкий возврат",
    description: "Возврат и обмен в течение 14 дней без лишних вопросов. Ваш комфорт — наш приоритет.",
  },
  {
    id: "4",
    icon: "💬",
    title: "Поддержка 24/7",
    description: "Консультируем по MAX, WhatsApp и Telegram. Поможем с выбором размера и оформлением заказа.",
  },
  {
    id: "5",
    icon: "🏪",
    title: "Офлайн магазин",
    description: "Приходите к нам в г. Изобильный, ул. Кирова, 2Г. Можно примерить и выбрать вживую.",
  },
  {
    id: "6",
    icon: "🛍️",
    title: "Wildberries",
    description: "Многие товары доступны на Wildberries. Удобная оплата и доставка через маркетплейс.",
  },
];
