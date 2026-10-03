/**
 * ЕДИНСТВЕННОЕ место, где описаны промокоды сайта.
 *
 * Раньше список {SKFU, VB5} был захардкожен прямо в ProductPage. Теперь и
 * карточка товара, и корзина, и оформление заказа берут скидку отсюда
 * (через calculateTotals из ./pricing).
 *
 * Значение — процент скидки. Чтобы добавить промокод, допишите его здесь и
 * в PROMO_CODES в apps-script/VBStoreApi.gs: сервер перепроверяет промокод
 * при создании заказа и не примет код, которого у него нет.
 */
const PROMO_CODES: Readonly<Record<string, number>> = {
  VB5: 5,
  SKFU: 5,
};

export interface PromoDefinition {
  code: string;
  percent: number;
}

/** Приводит ввод пользователя к виду, в котором коды хранятся: без пробелов, ЗАГЛАВНЫМИ. */
export function normalizePromoCode(input: string | null | undefined): string {
  return String(input ?? "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

/** Возвращает промокод, только если он действительно существует в системе. */
export function findPromo(input: string | null | undefined): PromoDefinition | null {
  const code = normalizePromoCode(input);
  if (!code || !Object.prototype.hasOwnProperty.call(PROMO_CODES, code)) return null;
  return { code, percent: PROMO_CODES[code] };
}

/**
 * Единая функция расчёта скидки по промокоду.
 * Скидка считается от общей суммы и округляется до рубля —
 * например, 11 085 ₽ при 5% → скидка 554 ₽, итого 10 531 ₽.
 */
export function calculatePromoDiscount(
  subtotal: number,
  promoInput: string | null | undefined
): { promo: PromoDefinition | null; discount: number } {
  const promo = findPromo(promoInput);
  if (!promo || !(subtotal > 0)) return { promo, discount: 0 };

  const discount = Math.min(subtotal, Math.round((subtotal * promo.percent) / 100));
  return { promo, discount };
}
