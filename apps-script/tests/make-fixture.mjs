// Генерирует fixtures/catalog.sample.json — каталог в том же формате, что отдаёт ?action=catalog:
// одна строка = один размер товара. Первые строки — реальные данные из API магазина (описания сокращены),
// строки TEST — синтетические граничные случаи для проверки корзины и заказов.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));

function row(base, size, extra = {}) {
  return {
    id: base.id,
    article: base.article ?? base.id,
    name: base.name,
    brand: base.brand ?? "",
    category: base.category,
    description: base.description ?? "Описание товара.",
    price: base.price,
    gender: base.gender ?? "Унисекс",
    images: base.images,
    sizes: size === null ? [] : [{ value: size.value, status: size.status ?? "available", stockOffline: size.shop ?? 0, stockWB: size.wb ?? 0 }],
    colors: base.colors ?? [],
    material: "",
    season: "",
    rating: 5,
    reviewsCount: 0,
    available: base.available ?? true,
    offlineOnly: false,
    wbOnly: false,
    bothAvailable: false,
    isNew: false,
    isFeatured: false,
    isSale: Boolean(base.oldPrice),
    oldPrice: base.oldPrice ?? 0,
    discount: 0,
    tags: [],
    wbUrl: base.wbUrl ?? "",
    ...extra,
  };
}

const wb = (n, vol, part, id) =>
  [1, 2, 3].map((i) => `https://basket-${n}.wbbasket.ru/vol${vol}/part${part}/${id}/images/big/${i}.webp`);

const crocs1 = { id: "537424389", name: "Cабо", brand: "CROCS", category: "Шлепанцы", price: 1890, images: wb(28, 5374, 537424, 537424389), wbUrl: "https://www.wildberries.ru/catalog/537424389/detail.aspx" };
const crocs2 = { id: "536953515", name: "Cабо", brand: "CROCS", category: "Шлепанцы", price: 1490, images: wb(28, 5369, 536953, 536953515), wbUrl: "https://www.wildberries.ru/catalog/536953515/detail.aspx" };
const slippers = { id: "88", article: "28604349", name: "Тапочки домашние", category: "Шлепанцы", gender: "Женский", price: 699, images: ["https://mow-basket-cdn-11.geobasket.ru/vol286/part28604/28604349/images/hq/1.webp"] };
const top = { id: "89", article: "365083242", name: "Топ вечерний с вырезом", category: "Одежда", gender: "Женский", price: 799, images: ["https://mow-basket-cdn-44.geobasket.ru/vol3650/part365083/365083242/images/big/1.webp"] };
const longsleeve = { id: "90", article: "177156061", name: "Лонгслив базовый в рубчик с длинным рукавом", category: "Одежда", gender: "Женский", price: 799, images: ["https://mow-basket-cdn-03.geobasket.ru/vol1771/part177156/177156061/images/big/1.webp"] };
const dock = { id: "91", article: "63753956", name: "Станция Dobe для джойстика контроллера PS4 Pro/Slim", category: "Товары", price: 499, images: ["https://mow-basket-cdn-58.geobasket.ru/vol637/part63753/63753956/images/big/1.webp"] };
const tshirt = { id: "283", article: "431911182", name: "Спортивная футболка для фитнеса", category: "Одежда", gender: "Женский", price: 799, images: ["https://mow-basket-cdn-44.geobasket.ru/vol4319/part431911/431911182/images/big/1.webp"] };
const cardigan = { id: "284", article: "GSW008409-1", name: "Молочный кардиган с контрастными линиями", category: "Одежда", gender: "Девочки", price: 699, images: ["https://storage-cdn10.gloria-jeans.ru/pictures/Molocnyj-kardigan-s-kontrastnymi-liniami_GSW008409-1_01_1200Wx1200H.webp?q=907769"] };

const jacket = { id: "9001", article: "TEST-9001", name: "TEST Куртка зимняя", brand: "TESTBRAND", category: "Одежда", gender: "Мужской", price: 3462, oldPrice: 4990, images: wb(10, 9001, 9001, 9001), wbUrl: "https://www.wildberries.ru/catalog/9001/detail.aspx" };
const sneakers = { id: "9002", article: "TEST-9002", name: "TEST Кроссовки беговые", brand: "RUNNER", category: "Кроссовки", gender: "Мужской", price: 5990, images: wb(11, 9002, 9002, 9002), wbUrl: "https://www.wildberries.ru/catalog/9002/detail.aspx" };
const accessory = { id: "9003", article: "TEST-9003", name: "TEST Аксессуар без размеров", category: "Товары", price: 250, images: wb(12, 9003, 9003, 9003) };
const colored = { id: "9004", article: "TEST-9004", name: "TEST Футболка в двух цветах", brand: "COLORS", category: "Одежда", gender: "Унисекс", price: 1200, images: wb(13, 9004, 9004, 9004), colors: [{ name: "Чёрный", code: "#000000", hex: "#000000" }, { name: "Белый", code: "#ffffff", hex: "#ffffff" }] };
const wbOnlyProduct = { id: "9005", article: "TEST-9005", name: "TEST Только на Wildberries", brand: "WBONLY", category: "Одежда", gender: "Женский", price: 2100, images: wb(14, 9005, 9005, 9005), wbUrl: "https://www.wildberries.ru/catalog/9005/detail.aspx" };

const rows = [
  row(crocs1, { value: "36-37", shop: 1, wb: 1 }),
  row(crocs1, { value: "37-38", shop: 2, wb: 2 }),
  row(crocs2, { value: "40", shop: 1, wb: 1 }),
  row(slippers, { value: "38", shop: 1, wb: 0 }),
  row(top, { value: "48", shop: 1, wb: 0 }),
  row(longsleeve, { value: "L", shop: 1, wb: 0 }),
  row(dock, { value: "1шт", shop: 1, wb: 0 }),
  row(tshirt, { value: "XL", shop: 1, wb: 0 }),
  row(cardigan, { value: "140", shop: 1, wb: 0 }),
  // TEST: куртка — несколько размеров, скидка (oldPrice), "мало", только WB, нет нигде
  row(jacket, { value: "M", shop: 3, wb: 0 }),
  row(jacket, { value: "L", shop: 2, wb: 0, status: "low" }),
  row(jacket, { value: "XL", shop: 0, wb: 4 }),
  row(jacket, { value: "S", shop: 0, wb: 0, status: "unavailable" }),
  // TEST: кроссовки — разный остаток, один размер только на WB
  row(sneakers, { value: "42", shop: 5, wb: 0 }),
  row(sneakers, { value: "43", shop: 1, wb: 0 }),
  row(sneakers, { value: "44", shop: 0, wb: 2 }),
  // TEST: товар без размеров
  row(accessory, null),
  // TEST: товар с цветами
  row(colored, { value: "M", shop: 4, wb: 0 }),
  // TEST: товар, который продаётся только на WB (в магазине нет ни одного размера)
  row(wbOnlyProduct, { value: "M", shop: 0, wb: 3 }),
  row(wbOnlyProduct, { value: "L", shop: 0, wb: 1 }),
];

fs.writeFileSync(path.join(dir, "fixtures", "catalog.sample.json"), JSON.stringify(rows, null, 1) + "\n");
console.log("rows:", rows.length);
