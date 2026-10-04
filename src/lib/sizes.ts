export type SizeGroupKey = "shoes" | "clothing" | "items";

export interface GroupedSizes {
  shoes: string[];
  clothing: string[];
  items: string[];
}

export const SIZE_GROUP_LABELS: Record<SizeGroupKey, string> = {
  shoes: "Размеры обуви",
  clothing: "Размеры одежды",
  items: "Размеры товаров",
};

/**
 * Длина стельки по размерной сетке из карточки товара WB.
 * Показываем измерения только для целых размеров 36–46, которые есть у товара.
 */
const SHOE_INSOLE_LENGTHS_CM: Record<number, string> = {
  36: "23",
  37: "23,5",
  38: "24",
  39: "24,5",
  40: "25",
  41: "26",
  42: "26,5",
  43: "27",
  44: "28",
  45: "28,5",
  46: "29",
};

export function getShoeInsoleLength(sizeValue: string | number): string | null {
  const match = String(sizeValue)
    .trim()
    .match(/^(?:(?:EU|EUR)\s*)?(\d{2})(?:[.,]0+)?(?:\s*(?:р(?:азмер)?\.?))?$/i);
  if (!match) return null;

  return SHOE_INSOLE_LENGTHS_CM[Number(match[1])] ?? null;
}

const SHOE_CATEGORY_RE =
  /обув|кроссов|шлепан|шлёпан|лофер|ботильон|ботин|туфл|сабо|сандал|кед|тапоч|сапог|сланц|мокасин|балетк|угг|дутик|челси|оксфорд|дерби|эспадриль/i;

const CLOTHING_CATEGORY_RE =
  /одежд|джинс|футбол|куртк|топ|лонгслив|кардиган|брюк|штан|худи|свитшот|плать|костюм|шорт|рубашк|блуз|юбк|свитер|джемпер|пальто|пуховик|жилет|толстовк|майк|водолазк|ветровк|пиджак|жакет|леггинс|тайтс|комбинезон|бомбер|тренч|парка|халат|пижам/i;

const ITEM_CATEGORY_RE =
  /товар|аксессуар|геймпад|джойстик|станци|напальчник|сумк|рюкзак|очк|часы|ремн|ремен|шапк|кепк|бейсболк|носк|перчатк|шарф|украшен|бижутер|чехол|электроник|игр|кошел|зонт/i;

const LETTER_SIZE_ORDER: Record<string, number> = {
  "3XS": 1,
  XXXS: 1,
  "2XS": 2,
  XXS: 2,
  XS: 3,
  "XS-S": 4,
  "XS/S": 4,
  S: 5,
  "S-M": 6,
  "S/M": 6,
  M: 7,
  "M-L": 8,
  "M/L": 8,
  L: 9,
  "L-XL": 10,
  "L/XL": 10,
  XL: 11,
  "XL-XXL": 12,
  "XL/XXL": 12,
  "XL-2XL": 12,
  XXL: 13,
  "2XL": 13,
  "2XL-3XL": 14,
  XXXL: 15,
  "3XL": 15,
  XXXXL: 16,
  "4XL": 16,
  "5XL": 17,
  "6XL": 18,
};

const ITEM_SIZE_RE =
  /(\d+\s*шт\.?|^универсал|^единый|^без\s*размер|^one\s*size|^os$|^стандарт)/i;

function normalizeSizeToken(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function isLetterClothingSize(value: string): boolean {
  const token = normalizeSizeToken(value);
  return token in LETTER_SIZE_ORDER;
}

export function isItemSpecificSize(value: string): boolean {
  return ITEM_SIZE_RE.test(value.trim());
}

/**
 * Определяет макро-группу товара: обувь, одежда или товары/аксессуары.
 */
export function getProductMacroGroup(
  category?: string,
  productName?: string
): SizeGroupKey {
  const cat = (category ?? "").trim();
  const name = (productName ?? "").trim();

  if (SHOE_CATEGORY_RE.test(cat)) return "shoes";
  if (CLOTHING_CATEGORY_RE.test(cat)) return "clothing";
  if (ITEM_CATEGORY_RE.test(cat)) return "items";

  if (SHOE_CATEGORY_RE.test(name)) return "shoes";
  if (CLOTHING_CATEGORY_RE.test(name)) return "clothing";
  if (ITEM_CATEGORY_RE.test(name)) return "items";

  return "items";
}

/**
 * Классифицирует конкретный размер с учётом категории товара и самого значения размера.
 */
export function classifySize(
  sizeValue: string,
  category?: string,
  productName?: string
): SizeGroupKey {
  const trimmed = sizeValue.trim();
  if (!trimmed) return "items";

  // Явные размеры штучных товаров («1шт», «Универсальный» и т.д.)
  if (isItemSpecificSize(trimmed)) {
    return "items";
  }

  // Буквенные размеры одежды (XS, S, M, L, XL...)
  if (isLetterClothingSize(trimmed)) {
    return "clothing";
  }

  const macro = getProductMacroGroup(category, productName);
  if (macro === "shoes" || macro === "clothing") {
    return macro;
  }

  // Если категория товара «Товары» или не указана, определяем по числовому формату
  const nums = extractNumbers(trimmed);
  if (nums.length > 0) {
    const first = nums[0];
    if (first >= 34 && first <= 46) return "shoes";
    if (first >= 48 && first <= 176) return "clothing";
  }

  return "items";
}

function extractNumbers(value: string): number[] {
  const matches = value.match(/\d+(?:[.,]\d+)?/g);
  if (!matches) return [];
  return matches.map((m) => Number(m.replace(",", "."))).filter((n) => !Number.isNaN(n));
}

/**
 * Сортировка размеров обуви: 35, 36, 36-37, 37, 37-38, 38, 39, 40, 41, 42, 43, 44, 45...
 */
export function compareShoeSizes(a: string, b: string): number {
  const numsA = extractNumbers(a);
  const numsB = extractNumbers(b);

  if (numsA.length > 0 && numsB.length > 0) {
    if (numsA[0] !== numsB[0]) return numsA[0] - numsB[0];
    const secondA = numsA[1] ?? numsA[0];
    const secondB = numsB[1] ?? numsB[0];
    if (secondA !== secondB) return secondA - secondB;
  } else if (numsA.length > 0) {
    return -1;
  } else if (numsB.length > 0) {
    return 1;
  }

  return a.localeCompare(b, "ru", { numeric: true });
}

/**
 * Сортировка размеров одежды:
 * 1) Буквенные размеры (XXS, XS, S, M, L, XL, XXL, 3XL...)
 * 2) Взрослые числовые размеры (38, 40, 42, 44, 46, 48, 50, 52...)
 * 3) Детские ростовки (80...134, 140, 146, 152, 158, 164, 170...)
 */
export function compareClothingSizes(a: string, b: string): number {
  const tokenA = normalizeSizeToken(a);
  const tokenB = normalizeSizeToken(b);

  const rankA = LETTER_SIZE_ORDER[tokenA];
  const rankB = LETTER_SIZE_ORDER[tokenB];

  if (rankA !== undefined && rankB !== undefined) {
    return rankA - rankB;
  }
  if (rankA !== undefined) return -1;
  if (rankB !== undefined) return 1;

  const numsA = extractNumbers(a);
  const numsB = extractNumbers(b);

  if (numsA.length > 0 && numsB.length > 0) {
    if (numsA[0] !== numsB[0]) return numsA[0] - numsB[0];
    const secondA = numsA[1] ?? numsA[0];
    const secondB = numsB[1] ?? numsB[0];
    if (secondA !== secondB) return secondA - secondB;
  } else if (numsA.length > 0) {
    return -1;
  } else if (numsB.length > 0) {
    return 1;
  }

  return a.localeCompare(b, "ru", { numeric: true });
}

/**
 * Сортировка размеров товаров (1шт, 2шт, Универсальный и т.д.)
 */
export function compareItemSizes(a: string, b: string): number {
  return a.localeCompare(b, "ru", { numeric: true });
}

export function sortSizesByGroup(sizes: Iterable<string>, group: SizeGroupKey): string[] {
  const unique = Array.from(new Set(Array.from(sizes).map((s) => s.trim()).filter(Boolean)));
  switch (group) {
    case "shoes":
      return unique.sort(compareShoeSizes);
    case "clothing":
      return unique.sort(compareClothingSizes);
    case "items":
    default:
      return unique.sort(compareItemSizes);
  }
}

/**
 * Сортирует массив объектов размеров внутри карточки товара.
 */
export function sortProductSizes<T extends { value: string }>(
  sizes: readonly T[],
  category?: string,
  productName?: string
): T[] {
  const group = getProductMacroGroup(category, productName);
  return [...sizes].sort((a, b) => {
    const gA = classifySize(a.value, category, productName);
    const gB = classifySize(b.value, category, productName);
    if (gA === "clothing" || gB === "clothing" || group === "clothing") {
      return compareClothingSizes(a.value, b.value);
    }
    if (gA === "shoes" || gB === "shoes" || group === "shoes") {
      return compareShoeSizes(a.value, b.value);
    }
    return compareItemSizes(a.value, b.value);
  });
}
