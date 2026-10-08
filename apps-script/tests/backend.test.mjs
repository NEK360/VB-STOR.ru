// Автотесты серверной части (apps-script/VBStoreApi.gs). Запуск из корня репозитория:
//   node --test apps-script/tests/backend.test.mjs
// Тесты исполняют настоящий код .gs в Node.js с имитацией сервисов Google (см. gas-shim.mjs).
import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { createGasEnv, derivePasswordProof, loadFixtureCatalog } from "./gas-shim.mjs";

const PHONE = "+79181234567";
const PASSWORD = "correct horse battery";
const PVZ = "г. Изобильный, Улица Кирова 2а";
const requestId = (() => { let n = 0; return () => `req-test-${String(++n).padStart(6, "0")}`; })();

let env;
beforeEach(() => {
  env = createGasEnv({ catalogRows: loadFixtureCatalog() });
});

function register(phone = PHONE, password = PASSWORD) {
  return env.call({ action: "register", phone, proof: derivePasswordProof(phone, password) });
}
function login(phone = PHONE, password = PASSWORD) {
  return env.call({ action: "login", phone, proof: derivePasswordProof(phone, password) });
}
function session() {
  const res = register();
  assert.equal(res.ok, true, JSON.stringify(res));
  return res.data;
}

/** Собирает заказ с разумными значениями по умолчанию; суммы считает как сайт. */
function orderInput(overrides = {}) {
  return {
    items: [{ productId: "9002", size: "42", color: null, quantity: 1 }],
    promoCode: null,
    delivery: { type: "pickup", service: null, pickupAddress: PVZ },
    paymentMethod: "on_receipt",
    clientTotals: { subtotal: 5990, discount: 0, total: 5990 },
    requestId: requestId(),
    ...overrides,
  };
}
function createOrder(token, order) {
  return env.call({ action: "createOrder", token, order });
}
function setOrderStatus(orderId, status) {
  const sheet = env.sheet("ORDERS");
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rows = env.rows("ORDERS");
  const index = rows.findIndex((row) => String(row.orderId) === String(orderId));
  if (index < 0) throw new Error(`Order ${orderId} not found in fixture`);
  sheet.getRange(index + 2, headers.indexOf("status") + 1).setValue(status);
}

describe("нормализация телефона", () => {
  const cases = [
    ["+7 (918) 123-45-67", "+79181234567"],
    ["89181234567", "+79181234567"],
    ["8 918 123 45 67", "+79181234567"],
    ["9181234567", "+79181234567"],
    ["79181234567", "+79181234567"],
    ["+7 (863) 245-12-34", "+78632451234"], // городской номер
    ["+380501234567", null], // иностранный
    ["+7 (018) 123-45-67", null],
    ["12345", null],
    ["", null],
    ["abc", null],
  ];
  for (const [input, expected] of cases) {
    it(`${JSON.stringify(input)} → ${expected}`, () => {
      assert.equal(env.api._internals.normalizePhone(input), expected);
    });
  }
});

describe("регистрация и вход", () => {
  it("регистрирует, сразу выдаёт токен, и токен работает", () => {
    const res = register();
    assert.equal(res.ok, true);
    assert.equal(res.data.phone, PHONE);
    assert.match(res.data.token, /^v1\.[0-9a-f]+\.[0-9a-f]{64}$/);
    assert.ok(res.data.expiresAt > Date.now() / 1000);

    const me = env.call({ action: "me", token: res.data.token });
    assert.deepEqual(me, { ok: true, data: { phone: PHONE, name: "" } });
  });

  it("пароль нигде не хранится в открытом виде; телефон в таблице — текст с «+»", () => {
    register();
    const proof = derivePasswordProof(PHONE, PASSWORD);
    const sheet = env.sheet("USERS");
    const dump = JSON.stringify([...sheet.cells.values()].map((c) => c.value));

    assert.ok(!dump.includes(PASSWORD), "в таблице найден пароль");
    assert.ok(!dump.includes(proof), "в таблице найден ключ, присланный браузером");

    const [user] = env.rows("USERS");
    assert.equal(user.phone, PHONE); // строка "+7918…", а не число
    assert.match(user.passwordHash, /^[0-9a-f]{64}$/);
    assert.match(user.salt, /^[0-9a-f]{32}$/);
    assert.notEqual(user.passwordHash, proof);
  });

  it("у двух пользователей с одинаковым паролем разные соль и хэш", () => {
    register("+79181234567", PASSWORD);
    register("+79187654321", PASSWORD);
    const [a, b] = env.rows("USERS");
    assert.notEqual(a.salt, b.salt);
    assert.notEqual(a.passwordHash, b.passwordHash);
  });

  it("повторная регистрация того же номера (в любой записи) → PHONE_EXISTS", () => {
    register("+79181234567");
    for (const variant of ["+79181234567", "89181234567", "+7 (918) 123-45-67"]) {
      const res = register(variant);
      assert.equal(res.ok, false);
      assert.equal(res.error.code, "PHONE_EXISTS");
    }
    assert.equal(env.rows("USERS").length, 1);
  });

  it("некорректный номер / ключ → INVALID_PHONE / VALIDATION", () => {
    assert.equal(env.call({ action: "register", phone: "123", proof: "a".repeat(64) }).error.code, "INVALID_PHONE");
    assert.equal(env.call({ action: "register", phone: PHONE, proof: "short" }).error.code, "VALIDATION");
    assert.equal(env.call({ action: "register", phone: PHONE }).error.code, "VALIDATION");
  });

  it("вход: верный пароль, неверный пароль, неизвестный номер", () => {
    register();
    const ok = login();
    assert.equal(ok.ok, true);
    assert.equal(ok.data.phone, PHONE);

    assert.equal(login(PHONE, "wrong password").error.code, "INVALID_CREDENTIALS");
    assert.equal(login("+79990000000", PASSWORD).error.code, "INVALID_CREDENTIALS");
    // нельзя отличить «нет такого номера» от «неверный пароль»
    assert.deepEqual(login(PHONE, "wrong").error, login("+79990000000", "wrong").error);
  });

  it("5 неверных паролей → блокировка, затем снова можно", () => {
    register();
    for (let i = 0; i < 5; i++) assert.equal(login(PHONE, "bad" + i).error.code, "INVALID_CREDENTIALS");
    assert.equal(login(PHONE, "bad-again").error.code, "TOO_MANY_ATTEMPTS");
    // даже верный пароль не пускает, пока действует блокировка
    assert.equal(login().error.code, "TOO_MANY_ATTEMPTS");
    env.advanceClock(16 * 60 * 1000);
    assert.equal(login().ok, true);
  });

  it("подделанный, чужой и просроченный токен не принимаются", () => {
    const { token } = session();
    const [v, payload, sig] = token.split(".");

    const forgedSig = `${v}.${payload}.${"0".repeat(64)}`;
    assert.equal(env.call({ action: "me", token: forgedSig }).error.code, "UNAUTHORIZED");

    // подмена номера в полезной нагрузке без пересчёта подписи
    const hex = Buffer.from(JSON.stringify({ p: "+79990000000", e: 9999999999, v: 1, i: 1 })).toString("hex");
    assert.equal(env.call({ action: "me", token: `v1.${hex}.${sig}` }).error.code, "UNAUTHORIZED");

    assert.equal(env.call({ action: "me", token: "garbage" }).error.code, "UNAUTHORIZED");
    assert.equal(env.call({ action: "me" }).error.code, "UNAUTHORIZED");

    env.advanceClock(31 * 24 * 3600 * 1000);
    assert.equal(env.call({ action: "me", token }).error.code, "UNAUTHORIZED");
  });

  it("токен перестаёт действовать, если пользователя удалили из таблицы", () => {
    const { token } = session();
    const sheet = env.sheet("USERS");
    for (const key of [...sheet.cells.keys()]) if (key.startsWith("2,")) sheet.cells.delete(key);
    assert.equal(env.call({ action: "me", token }).error.code, "UNAUTHORIZED");
  });

  it("изменяет имя профиля, нормализует пробелы и возвращает имя при me и новом входе", () => {
    const { token } = session();
    const saved = env.call({ action: "updateProfile", token, name: "  Анна   Петрова\n" });
    assert.deepEqual(saved, { ok: true, data: { phone: PHONE, name: "Анна Петрова" } });
    assert.deepEqual(env.call({ action: "me", token }), {
      ok: true,
      data: { phone: PHONE, name: "Анна Петрова" },
    });
    assert.equal(login().data.name, "Анна Петрова");
    assert.equal(env.rows("USERS")[0].displayName, "Анна Петрова");
  });

  it("не принимает пустое или слишком длинное имя профиля и не меняет его без входа", () => {
    const { token } = session();
    assert.equal(env.call({ action: "updateProfile", token, name: "   " }).error.code, "VALIDATION");
    assert.equal(env.call({ action: "updateProfile", token, name: "я".repeat(61) }).error.code, "VALIDATION");
    assert.equal(env.call({ action: "updateProfile", name: "Новый пользователь" }).error.code, "UNAUTHORIZED");
  });
});

describe("создание заказа", () => {
  it("без входа заказ создать нельзя", () => {
    assert.equal(createOrder(undefined, orderInput()).error.code, "UNAUTHORIZED");
    assert.equal(createOrder("v1.bad.token", orderInput()).error.code, "UNAUTHORIZED");
    assert.equal(env.rows("ORDERS").length, 0);
  });

  it("сценарий 1: ПВЗ Wildberries + «При получении» → заказ в ORDERS со всеми полями", () => {
    const { token } = session();
    const res = createOrder(token, orderInput());
    assert.equal(res.ok, true, JSON.stringify(res));

    const order = res.data.order;
    assert.equal(order.orderId, "10001");
    assert.equal(order.userPhone, PHONE);
    assert.equal(order.total, 5990);
    assert.equal(order.deliveryType, "pickup");
    assert.equal(order.pickupAddress, PVZ);
    assert.equal(order.deliveryService, null);
    assert.equal(order.paymentMethod, "on_receipt");
    assert.equal(order.status, "Новый");
    assert.equal(order.items[0].size, "42");

    const [row] = env.rows("ORDERS");
    assert.equal(row.orderId, 10001);
    assert.ok(row.createdAt instanceof Date);
    assert.equal(row.userPhone, PHONE); // телефон сохранён строкой с «+»
    assert.match(row.items, /TEST Кроссовки беговые.*размер 42 × 1 = 5990 ₽/);
    assert.equal(row.total, 5990);
    assert.equal(row.promoCode, "");
    assert.equal(row.discount, 0);
    assert.equal(row.deliveryType, "Пункт выдачи");
    assert.equal(row.deliveryService, "");
    assert.equal(row.pickupAddress, PVZ);
    assert.equal(row.paymentMethod, "При получении");
    assert.equal(row.status, "Новый");
  });

  it("сценарий 2: CDEK → «Сразу» → статус «Ожидает оплаты»; «При получении» недоступна", () => {
    const { token } = session();

    const bad = createOrder(token, orderInput({
      delivery: { type: "russia", service: "CDEK", pickupAddress: null },
      paymentMethod: "on_receipt",
    }));
    assert.equal(bad.error.code, "PAYMENT_NOT_ALLOWED");

    const ok = createOrder(token, orderInput({
      delivery: { type: "russia", service: "CDEK", pickupAddress: null },
      paymentMethod: "prepaid",
    }));
    assert.equal(ok.ok, true, JSON.stringify(ok));
    assert.equal(ok.data.order.status, "Ожидает оплаты");

    const [row] = env.rows("ORDERS");
    assert.equal(row.deliveryType, "Доставка по России");
    assert.equal(row.deliveryService, "CDEK");
    assert.equal(row.pickupAddress, "");
    assert.equal(row.paymentMethod, "Сразу");
    assert.equal(row.status, "Ожидает оплаты");
  });

  it("«При получении» разрешена только для ПВЗ: ни одна служба доставки по России её не даёт", () => {
    const { token } = session();
    for (const service of ["Wildberries", "OZON", "Яндекс", "CDEK", "Почта России"]) {
      const res = createOrder(token, orderInput({
        delivery: { type: "russia", service, pickupAddress: null },
        paymentMethod: "on_receipt",
      }));
      assert.equal(res.error.code, "PAYMENT_NOT_ALLOWED", service);
    }
    assert.equal(env.rows("ORDERS").length, 0);
  });

  it("все три ПВЗ принимают оплату при получении; чужой адрес и служба — отклоняются", () => {
    const { token } = session();
    for (const address of env.api._internals.CONFIG.PICKUP_POINTS) {
      const res = createOrder(token, orderInput({ delivery: { type: "pickup", service: null, pickupAddress: address } }));
      assert.equal(res.ok, true, address);
    }
    const wrongAddress = createOrder(token, orderInput({ delivery: { type: "pickup", service: null, pickupAddress: "г. Москва, Тверская 1" } }));
    assert.equal(wrongAddress.error.code, "DELIVERY_INVALID");
    const wrongService = createOrder(token, orderInput({ delivery: { type: "russia", service: "DHL", pickupAddress: null }, paymentMethod: "prepaid" }));
    assert.equal(wrongService.error.code, "DELIVERY_INVALID");
    const noDelivery = createOrder(token, orderInput({ delivery: null }));
    assert.equal(noDelivery.error.code, "DELIVERY_INVALID");
  });

  it("сценарий 6: промокод VB5 даёт скидку 5%, считается на сервере", () => {
    const { token } = session();
    // куртка M × 2 (3462 × 2 = 6924) + кроссовки 42 (5990) = 12914; 5% → 646 (округление до рубля), итого 12268
    const items = [
      { productId: "9001", size: "M", color: null, quantity: 2 },
      { productId: "9002", size: "42", color: null, quantity: 1 },
    ];
    const res = createOrder(token, orderInput({
      items,
      promoCode: "VB5",
      clientTotals: { subtotal: 12914, discount: 646, total: 12268 },
    }));
    assert.equal(res.ok, true, JSON.stringify(res));
    assert.equal(res.data.order.discount, 646);
    assert.equal(res.data.order.total, 12268);
    assert.equal(res.data.order.promoCode, "VB5");

    const [row] = env.rows("ORDERS");
    assert.equal(row.promoCode, "VB5");
    assert.equal(row.discount, 646);
    assert.equal(row.total, 12268);
    assert.equal(row.subtotal, 12914);
  });

  it("промокод в любом регистре; несуществующий промокод отклоняется и не даёт скидку", () => {
    const { token } = session();
    const lower = createOrder(token, orderInput({
      promoCode: " vb5 ",
      clientTotals: { subtotal: 5990, discount: 300, total: 5690 },
    }));
    assert.equal(lower.ok, true, JSON.stringify(lower));
    assert.equal(lower.data.order.promoCode, "VB5");

    const bad = createOrder(token, orderInput({
      promoCode: "FAKE50",
      clientTotals: { subtotal: 5990, discount: 2995, total: 2995 },
    }));
    assert.equal(bad.error.code, "PROMO_INVALID");
  });

  it("сумму нельзя подменить: расхождение с расчётом сервера → PRICE_CHANGED", () => {
    const { token } = session();
    const res = createOrder(token, orderInput({ clientTotals: { subtotal: 1, discount: 0, total: 1 } }));
    assert.equal(res.error.code, "PRICE_CHANGED");
    assert.equal(res.error.details.total, 5990);
    assert.equal(env.rows("ORDERS").length, 0);
  });

  it("цена берётся из каталога, а не из запроса", () => {
    const { token } = session();
    const res = createOrder(token, orderInput({
      items: [{ productId: "9002", size: "42", color: null, quantity: 1, price: 1 }],
    }));
    assert.equal(res.ok, true);
    assert.equal(res.data.order.items[0].price, 5990);
  });

  describe("наличие и размеры", () => {
    const attempt = (token, item) =>
      createOrder(token, orderInput({
        items: [{ color: null, quantity: 1, ...item }],
        clientTotals: { subtotal: 0, discount: 0, total: 0 },
      }));

    it("больше, чем есть в магазине → OUT_OF_STOCK с понятным текстом", () => {
      const { token } = session();
      const res = attempt(token, { productId: "9002", size: "43", quantity: 2 });
      assert.equal(res.error.code, "OUT_OF_STOCK");
      assert.match(res.error.message, /TEST Кроссовки беговые.*размер 43.*только 1 шт/);
    });

    it("размер только на Wildberries / размера нет нигде → OUT_OF_STOCK", () => {
      const { token } = session();
      assert.equal(attempt(token, { productId: "9002", size: "44" }).error.code, "OUT_OF_STOCK");
      assert.equal(attempt(token, { productId: "9001", size: "XL" }).error.code, "OUT_OF_STOCK");
      assert.equal(attempt(token, { productId: "9001", size: "S" }).error.code, "OUT_OF_STOCK");
      assert.equal(attempt(token, { productId: "9005", size: "M" }).error.code, "OUT_OF_STOCK");
    });

    it("несуществующий размер / товар, размер не указан → SIZE_UNAVAILABLE / PRODUCT_NOT_FOUND", () => {
      const { token } = session();
      assert.equal(attempt(token, { productId: "9002", size: "99" }).error.code, "SIZE_UNAVAILABLE");
      assert.equal(attempt(token, { productId: "9002", size: null }).error.code, "SIZE_UNAVAILABLE");
      assert.equal(attempt(token, { productId: "nope", size: "42" }).error.code, "PRODUCT_NOT_FOUND");
    });

    it("одинаковые строки суммируются при проверке остатка", () => {
      const { token } = session();
      const res = createOrder(token, orderInput({
        items: [
          { productId: "9002", size: "43", color: null, quantity: 1 },
          { productId: "9002", size: "43", color: null, quantity: 1 },
        ],
        clientTotals: { subtotal: 0, discount: 0, total: 0 },
      }));
      assert.equal(res.error.code, "OUT_OF_STOCK");
    });

    it("остаток считается как на сайте: максимум по строкам одного размера (Crocs 37-38: 2 шт.)", () => {
      const { token } = session();
      const ok = createOrder(token, orderInput({
        items: [{ productId: "537424389", size: "37-38", color: null, quantity: 2 }],
        clientTotals: { subtotal: 3780, discount: 0, total: 3780 },
      }));
      assert.equal(ok.ok, true, JSON.stringify(ok));
      const tooMany = attempt(token, { productId: "537424389", size: "37-38", quantity: 3 });
      assert.equal(tooMany.error.code, "OUT_OF_STOCK");
    });

    it("товар без размеров: заказывается без размера, не больше предела", () => {
      const { token } = session();
      const ok = createOrder(token, orderInput({
        items: [{ productId: "9003", size: null, color: null, quantity: 2 }],
        clientTotals: { subtotal: 500, discount: 0, total: 500 },
      }));
      assert.equal(ok.ok, true, JSON.stringify(ok));
      assert.equal(ok.data.order.items[0].size, null);
      assert.equal(attempt(token, { productId: "9003", size: null, quantity: 11 }).error.code, "OUT_OF_STOCK");
    });

    it("цвет сохраняется в заказе", () => {
      const { token } = session();
      const res = createOrder(token, orderInput({
        items: [{ productId: "9004", size: "M", color: "Чёрный", quantity: 1 }],
        clientTotals: { subtotal: 1200, discount: 0, total: 1200 },
      }));
      assert.equal(res.ok, true, JSON.stringify(res));
      assert.equal(res.data.order.items[0].color, "Чёрный");
      assert.match(env.rows("ORDERS")[0].items, /цвет Чёрный/);
    });
  });

  it("пустая корзина и слишком много позиций → EMPTY_CART / VALIDATION", () => {
    const { token } = session();
    assert.equal(createOrder(token, orderInput({ items: [] })).error.code, "EMPTY_CART");
    const many = Array.from({ length: 31 }, (_, i) => ({ productId: "9002", size: `S${i}`, color: null, quantity: 1 }));
    assert.equal(createOrder(token, orderInput({ items: many })).error.code, "VALIDATION");
  });

  it("повторная отправка того же заказа не создаёт дубль (защита от двойного нажатия)", () => {
    const { token } = session();
    const input = orderInput({ requestId: "dup-request-0001" });
    const first = createOrder(token, input);
    const second = createOrder(token, input);
    assert.equal(first.data.order.orderId, second.data.order.orderId);
    assert.equal(env.rows("ORDERS").length, 1);

    const third = createOrder(token, orderInput());
    assert.equal(third.data.order.orderId, "10002");
    assert.equal(env.rows("ORDERS").length, 2);
  });

  it("телефон заказа берётся из токена, а не из запроса", () => {
    const { token } = session();
    const res = env.call({
      action: "createOrder",
      token,
      phone: "+79990000000",
      order: { ...orderInput(), userPhone: "+79990000000", phone: "+79990000000" },
    });
    assert.equal(res.data.order.userPhone, PHONE);
    assert.equal(env.rows("ORDERS")[0].userPhone, PHONE);
  });

  it("нумерация продолжается после существующих заказов (…12344 → №12345)", () => {
    const { token } = session();
    // владелец уже вёл лист ORDERS вручную: создаём лист и строку с заказом 12344
    const first = createOrder(token, orderInput());
    assert.equal(first.ok, true);
    env.properties.delete("ORDER_SEQ"); // имитируем потерю счётчика
    const sheet = env.sheet("ORDERS");
    sheet.getRange(2, 1).setValue(12344);

    const next = createOrder(token, orderInput());
    assert.equal(next.data.order.orderId, "12345");
  });

  it("лимит заказов в час защищает от спама", () => {
    const { token } = session();
    for (let i = 0; i < 10; i++) assert.equal(createOrder(token, orderInput()).ok, true);
    assert.equal(createOrder(token, orderInput()).error.code, "TOO_MANY_ATTEMPTS");
  });

  it("сбой чтения каталога → SERVER_ERROR без технических подробностей", () => {
    const { token } = session();
    env.breakCatalog();
    const res = createOrder(token, orderInput());
    assert.deepEqual(res, { ok: false, error: { code: "SERVER_ERROR" } });
    assert.equal(env.rows("ORDERS").length, 0);
  });

  it("уведомление владельцу отправляется один раз на заказ (и не на повтор)", () => {
    const notified = [];
    env.sandbox.VBStoreNotify = { newOrder: (order, text) => notified.push({ order, text }) };
    const { token } = session();
    const input = orderInput({ requestId: "notify-0001" });
    createOrder(token, input);
    createOrder(token, input); // повтор
    assert.equal(notified.length, 1);
    assert.match(notified[0].text, /TEST Кроссовки беговые/);
  });

  it("ошибка уведомления не ломает создание заказа", () => {
    env.sandbox.VBStoreNotify = { newOrder: () => { throw new Error("mail quota exceeded"); } };
    const { token } = session();
    const res = createOrder(token, orderInput());
    assert.equal(res.ok, true);
    assert.equal(env.rows("ORDERS").length, 1);
  });
});

describe("история заказов", () => {
  it("пользователь видит только свои заказы, новые — первыми", () => {
    const a = session();
    const bRes = register("+79187654321");
    const b = bRes.data;

    createOrder(a.token, orderInput());
    createOrder(b.token, orderInput());
    createOrder(a.token, orderInput({
      items: [{ productId: "9001", size: "M", color: null, quantity: 1 }],
      clientTotals: { subtotal: 3462, discount: 0, total: 3462 },
    }));

    const mine = env.call({ action: "myOrders", token: a.token }).data.orders;
    assert.deepEqual(mine.map((o) => o.orderId), ["10003", "10001"]);
    assert.ok(mine.every((o) => o.userPhone === PHONE));
    assert.equal(mine[0].items[0].name, "TEST Куртка зимняя");
    assert.equal(mine[0].paymentMethod, "on_receipt");
    assert.equal(mine[0].deliveryType, "pickup");

    const theirs = env.call({ action: "myOrders", token: b.token }).data.orders;
    assert.deepEqual(theirs.map((o) => o.orderId), ["10002"]);
  });

  it("без входа историю не показываем; пустая история — пустой список", () => {
    assert.equal(env.call({ action: "myOrders" }).error.code, "UNAUTHORIZED");
    const { token } = session();
    assert.deepEqual(env.call({ action: "myOrders", token }).data, { orders: [] });
  });

  it("статус, который владелец изменил в таблице, виден покупателю", () => {
    const { token } = session();
    createOrder(token, orderInput());
    const sheet = env.sheet("ORDERS");
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    sheet.getRange(2, headers.indexOf("status") + 1).setValue("Выдан");

    const [order] = env.call({ action: "myOrders", token }).data.orders;
    assert.equal(order.status, "Выдан");
  });
});

describe("совместимость с существующим скриптом", () => {
  it("чужие POST-запросы (не JSON, неизвестное действие) пропускаются: handlePost возвращает null", () => {
    assert.equal(env.call("not json at all"), null);
    assert.equal(env.call({ action: "somethingElse" }), null);
    assert.equal(env.call({ foo: "bar" }), null);
    assert.equal(env.sandbox.vbStoreHandlePost_({}), null);
  });

  it("проверочный GET ?action=vbPing отвечает, остальное отдаётся прежнему doGet", () => {
    const ping = env.sandbox.vbStoreHandleGet_({ parameter: { action: "vbPing" } });
    assert.equal(JSON.parse(ping.getContent()).ok, true);
    assert.equal(env.sandbox.vbStoreHandleGet_({ parameter: { action: "catalog" } }), null);
  });

  it("vbStoreSetup создаёт листы с нужными колонками, vbStoreSelfTest читает каталог", () => {
    env.sandbox.vbStoreSetup();
    const sheet = env.sheet("ORDERS");
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    assert.deepEqual(headers.slice(0, 12), [
      "orderId", "createdAt", "userPhone", "items", "total", "promoCode", "discount",
      "deliveryType", "deliveryService", "pickupAddress", "paymentMethod", "status",
    ]);
    assert.ok(env.sheet("USERS"));
    assert.ok(env.properties.get("TOKEN_SECRET"));
    assert.ok(env.properties.get("PASSWORD_PEPPER"));
    assert.match(env.sandbox.vbStoreSelfTest(), /товаров 1[0-9]/);
  });

  it("существующие колонки владельца на листе ORDERS не затираются, недостающие добавляются", () => {
    const sheet = env.spreadsheet.insertSheet("ORDERS");
    sheet.getRange(1, 1, 1, 3).setValues([["orderId", "Комментарий менеджера", "status"]]);
    const { token } = session();
    const res = createOrder(token, orderInput());
    assert.equal(res.ok, true, JSON.stringify(res));

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    assert.equal(headers[1], "Комментарий менеджера");
    const [row] = env.rows("ORDERS");
    assert.equal(row["Комментарий менеджера"], "");
    assert.equal(row.userPhone, PHONE);
    assert.equal(row.status, "Новый");
  });
});

describe("Блокировки и журнал выполнения", () => {
  it("register: если блокировку записи надолго занял другой запрос — быстрый ответ SERVER_BUSY, а не зависание", () => {
    env.sandbox.vbStoreSetup(); // секреты и листы уже есть — значит, ждём именно блокировку записи
    env.holdUserLock();

    const res = register();
    assert.equal(res.ok, false);
    assert.equal(res.error.code, "SERVER_BUSY");
    assert.equal(env.rows("USERS").length, 0, "строка пользователя не должна создаться");
    assert.ok(env.logs.some((l) => /блокировка пользователя занята/.test(l) && /register/.test(l)), env.logs.join("\n"));

    env.releaseUserLock(); // запрос закончился — та же регистрация проходит, блокировка не «залипла»
    assert.equal(register().ok, true);
    assert.equal(env.rows("USERS").length, 1);
  });

  it("createOrder: занятая блокировка записи → SERVER_BUSY, заказ не создан; повтор с тем же requestId даёт ровно один заказ", () => {
    const { token } = session();
    const input = orderInput();
    env.holdUserLock();

    const busy = createOrder(token, input);
    assert.equal(busy.ok, false);
    assert.equal(busy.error.code, "SERVER_BUSY");
    assert.equal(env.rows("ORDERS").length, 0);

    env.releaseUserLock();
    assert.equal(createOrder(token, input).ok, true);
    assert.equal(createOrder(token, input).ok, true); // повторная отправка — тот же заказ
    assert.equal(env.rows("ORDERS").length, 1);
  });

  it("секретов ещё нет и блокировка записи занята → SERVER_BUSY (без вложенного ожидания)", () => {
    env.holdUserLock();
    const res = env.call({ action: "me", token: "garbage" });
    assert.equal(res.ok, false);
    assert.equal(res.error.code, "SERVER_BUSY");
    assert.ok(env.logs.some((l) => /getSecret/.test(l)), env.logs.join("\n"));
  });

  it("регистрация, вход, заказ и история НЕ зависят от общей блокировки скрипта: её может надолго держать ваша синхронизация", () => {
    env.holdScriptLock(); // как будто синхронизация каталога по триггеру держит её минутами
    const { token } = session();
    assert.equal(login().ok, true);
    const order = createOrder(token, orderInput());
    assert.equal(order.ok, true, JSON.stringify(order));
    const mine = env.call({ action: "myOrders", token });
    assert.equal(mine.ok, true);
    assert.equal(mine.data.orders.length, 1);
    assert.ok(!env.logs.some((l) => /блокировка .* занята/.test(l)), env.logs.join("\n"));
  });

  it("то же, если ваш doGet при чтении каталога берёт общую блокировку скрипта и не отпускает до конца запуска", () => {
    const { token } = session();
    const originalDoGet = env.sandbox.doGet;
    env.sandbox.doGet = (e) => {
      env.sandbox.LockService.getScriptLock().waitLock(1000); // берёт и не отпускает
      return originalDoGet(e);
    };
    const order = createOrder(token, orderInput());
    assert.equal(order.ok, true, JSON.stringify(order));
    assert.equal(env.rows("ORDERS").length, 1);
  });

  it("каждый запрос пишет в журнал действие, итог и время", () => {
    register();
    const line = env.logs.find((l) => l.startsWith("VBStoreApi register: ok"));
    assert.ok(line, env.logs.join("\n"));
    assert.match(line, /всего \d+ мс/);

    login(PHONE, "wrong password");
    assert.ok(
      env.logs.some((l) => /^VBStoreApi login: ошибка INVALID_CREDENTIALS, всего \d+ мс/.test(l)),
      env.logs.join("\n")
    );
  });

  it("vbStoreSelfTest показывает скорость таблицы и состояние обеих блокировок, ничего не меняя", () => {
    env.sandbox.vbStoreSetup();
    const before = JSON.stringify(env.rows("USERS"));
    env.sandbox.vbStoreSelfTest();
    const line = env.logs.find((l) => /Скорость таблицы/.test(l));
    assert.ok(line, env.logs.join("\n"));
    assert.match(line, /блокировка скрипта \(её может держать ваш код\): до каталога — свободна, после — свободна/);
    assert.match(line, /блокировка пользователя \(её берут регистрация и заказы\): до каталога — свободна, после — свободна/);
    assert.match(line, /Блокировки свободны\./);
    assert.equal(JSON.stringify(env.rows("USERS")), before);
  });

  it("vbStoreSelfTest: общую блокировку держит другое выполнение — так и сказано, а регистрация и заказы от неё не зависят", () => {
    env.sandbox.vbStoreSetup();
    env.holdScriptLock();
    env.sandbox.vbStoreSelfTest();
    const line = env.logs.find((l) => /Скорость таблицы/.test(l));
    assert.match(line, /блокировка скрипта .*: до каталога — ЗАНЯТА \(ждали \d+ мс\), после — ЗАНЯТА/);
    assert.match(line, /блокировка пользователя .*: до каталога — свободна, после — свободна/);
    assert.match(line, /Общую блокировку скрипта держит ДРУГОЕ выполнение вашего проекта/);
  });

  it("vbStoreSelfTest: если общую блокировку берёт сам ваш doGet — различает это и не винит другое выполнение", () => {
    env.sandbox.vbStoreSetup();
    const originalDoGet = env.sandbox.doGet;
    env.sandbox.doGet = (e) => {
      env.sandbox.LockService.getScriptLock().waitLock(1000);
      return originalDoGet(e);
    };
    env.sandbox.vbStoreSelfTest();
    const line = env.logs.find((l) => /Скорость таблицы/.test(l));
    assert.match(line, /блокировка скрипта .*: до каталога — свободна, после — ЗАНЯТА/);
    assert.match(line, /Общую блокировку скрипта берёт ваш код чтения каталога \(doGet\)/);
  });

  it("vbStoreSelfTest: блокировка записи занята — предупреждает, что регистрация и заказы будут отвечать «Сервер сейчас занят»", () => {
    env.sandbox.vbStoreSetup();
    env.holdUserLock();
    env.sandbox.vbStoreSelfTest();
    const line = env.logs.find((l) => /Скорость таблицы/.test(l));
    assert.match(line, /блокировка пользователя .*: до каталога — ЗАНЯТА/);
    assert.match(line, /они будут отвечать «Сервер сейчас занят»/);
  });
});

describe("Уведомление о заказе на почту", () => {
  it("vbStoreNotifyTest отправляет тестовое письмо на адрес владельца (так же выдаётся разрешение на почту)", () => {
    env.loadScript("VBStoreNotify.gs");
    const message = env.sandbox.vbStoreNotifyTest();
    assert.equal(env.mails.length, 1);
    assert.match(env.mails[0].subject, /новый заказ №ТЕСТ/);
    assert.match(env.mails[0].body, /Телефон: \+79180000000/);
    assert.match(env.mails[0].body, /Скидка \(промокод VB5\)/);
    assert.match(message, /Тестовое письмо отправлено на .+@/);
  });

  it("настоящий заказ при подключённом VBStoreNotify.gs отправляет письмо с составом заказа", () => {
    env.loadScript("VBStoreNotify.gs");
    const { token } = session();
    const res = createOrder(token, orderInput());
    assert.equal(res.ok, true, JSON.stringify(res));
    assert.equal(env.mails.length, 1);
    assert.match(env.mails[0].subject, new RegExp(`новый заказ №${res.data.order.orderId}`));
    assert.match(env.mails[0].body, /Телефон: \+79181234567/);
  });
});

describe("Запись заказа в таблицу: место, чужие столбцы, проверка", () => {
  it("заказ пишется в первую свободную строку по номеру заказа, а не под самой нижней ячейкой листа; ваши столбцы не затираются", () => {
    env.sandbox.vbStoreSetup();
    const sheet = env.sheet("ORDERS");
    const owner = sheet.getLastColumn() + 1; // ваш столбец справа от наших
    sheet.getRange(1, owner).setValue("Менеджер");
    for (let row = 2; row <= 40; row++) sheet.getRange(row, owner).setValue(`заметка ${row}`); // заметки до 40-й строки

    const { token } = session();
    const first = createOrder(token, orderInput());
    assert.equal(first.ok, true, JSON.stringify(first));
    const second = createOrder(token, orderInput());
    assert.equal(second.ok, true, JSON.stringify(second));

    // раньше заказ уезжал под 40-ю строку и «пропадал» из виду; теперь он в строках 2 и 3
    assert.equal(sheet.getRange(2, 1).getValue(), Number(first.data.order.orderId));
    assert.equal(sheet.getRange(3, 1).getValue(), Number(second.data.order.orderId));
    assert.equal(sheet.getRange(41, 1).getValue(), "");
    // заметки владельца на месте (раньше запись на всю ширину листа затирала их пустыми значениями)
    assert.equal(sheet.getRange(2, owner).getValue(), "заметка 2");
    assert.equal(sheet.getRange(3, owner).getValue(), "заметка 3");
    assert.equal(sheet.getRange(40, owner).getValue(), "заметка 40");
  });

  it("регистрация не затирает ваши столбцы на листе USERS и не уводит пользователя вниз", () => {
    env.sandbox.vbStoreSetup();
    const sheet = env.sheet("USERS");
    const owner = sheet.getLastColumn() + 1;
    sheet.getRange(1, owner).setValue("Комментарий");
    for (let row = 2; row <= 15; row++) sheet.getRange(row, owner).setValue(`важно ${row}`);

    assert.equal(register().ok, true);
    assert.equal(sheet.getRange(2, 1).getValue(), PHONE);
    assert.equal(sheet.getRange(2, owner).getValue(), "важно 2");
    assert.equal(sheet.getRange(16, 1).getValue(), "");
    assert.equal(login().ok, true); // вход находит пользователя
  });

  it("если строки в листе закончились, строки добавляются, а не «Не удалось оформить заказ»", () => {
    env.sandbox.vbStoreSetup();
    const sheet = env.sheet("ORDERS");
    sheet.maxRows = 2; // в листе остались заголовок и одна строка
    const { token } = session();
    for (let i = 0; i < 3; i++) assert.equal(createOrder(token, orderInput()).ok, true);
    assert.equal(env.rows("ORDERS").length, 3);
    assert.ok(sheet.getMaxRows() >= 4);
  });

  it("если запись не появилась в таблице, заказ не подтверждается и письмо не отправляется", () => {
    env.loadScript("VBStoreNotify.gs");
    env.sandbox.vbStoreSetup();
    const { token } = session();
    const sheet = env.sheet("ORDERS");
    const original = sheet.getRange.bind(sheet);
    sheet.getRange = (...args) => {
      const range = original(...args);
      range.setValues = () => range; // запись «молча» не доходит до таблицы
      return range;
    };

    const res = createOrder(token, orderInput());
    assert.equal(res.ok, false);
    assert.equal(res.error.code, "SERVER_ERROR");
    assert.equal(env.mails.length, 0);
    assert.ok(env.logs.some((l) => /Запись не появилась в листе «ORDERS»/.test(l)), env.logs.join("\n"));
  });

  it("письмо о заказе называет точное место записи: лист, строку и даёт ссылку на неё", () => {
    env.loadScript("VBStoreNotify.gs");
    const { token } = session();
    const res = createOrder(token, orderInput());
    assert.equal(res.ok, true, JSON.stringify(res));
    const body = env.mails[0].body;
    assert.match(body, /Запись в таблице: лист «ORDERS», строка 2 \(таблица «Тестовая таблица VB STORE»\)/);
    assert.match(body, /https:\/\/docs\.google\.com\/spreadsheets\/d\/TEST_SPREADSHEET\/edit#gid=\d+&range=A2/);
    assert.ok(env.logs.some((l) => /записано в лист «ORDERS», строка 2/.test(l)), env.logs.join("\n"));
  });

  it("vbStoreSelfTest описывает таблицу и листы и предупреждает о похожем листе (например, «order»)", () => {
    env.sandbox.vbStoreSetup();
    env.spreadsheet.insertSheet("order");
    const { token } = session();
    assert.equal(createOrder(token, orderInput()).ok, true);

    env.sandbox.vbStoreSelfTest();
    const line = env.logs.find((l) => /^Таблица «/.test(l));
    assert.ok(line, env.logs.join("\n"));
    assert.match(line, /листы: USERS, ORDERS, REVIEWS, order/);
    assert.match(line, /лист ORDERS: заказов 1, последний в строке 2/);
    assert.match(line, /лист USERS: пользователей 1, последний в строке 2/);
    assert.match(line, /ВНИМАНИЕ: есть похожие листы \(order\)/);
  });
});

describe("Отзывы покупателей", () => {
  it("создаёт отзыв только на свой доставленный товар, требует рейтинг и не требует текста", () => {
    const { token } = session();
    const orderResult = createOrder(token, orderInput());
    assert.equal(orderResult.ok, true, JSON.stringify(orderResult));
    const orderId = orderResult.data.order.orderId;
    const input = { orderId, productId: "9002", size: "42", color: null, rating: 5, text: "" };

    assert.equal(env.call({ action: "createReview", ...input }).error.code, "UNAUTHORIZED");
    assert.equal(env.call({ action: "createReview", token, ...input, rating: 0 }).error.code, "VALIDATION");
    assert.equal(env.call({ action: "createReview", token, ...input, rating: 6 }).error.code, "VALIDATION");
    assert.equal(env.call({ action: "createReview", token, ...input }).error.code, "ORDER_NOT_DELIVERED");

    setOrderStatus(orderId, "Доставлен");
    assert.equal(
      env.call({ action: "createReview", token, ...input, productId: "9001" }).error.code,
      "REVIEW_NOT_ALLOWED"
    );

    const created = env.call({ action: "createReview", token, ...input });
    assert.equal(created.ok, true, JSON.stringify(created));
    assert.equal(created.data.review.rating, 5);
    assert.equal(created.data.review.text, "");
    assert.equal(created.data.review.authorName, "Покупатель");
    assert.equal(created.data.review.orderId, orderId);
    assert.equal(env.rows("REVIEWS").length, 1);

    assert.equal(env.call({ action: "createReview", token, ...input }).error.code, "REVIEW_EXISTS");
    const mine = env.call({ action: "myReviews", token });
    assert.equal(mine.ok, true);
    assert.equal(mine.data.reviews.length, 1);
    assert.equal(mine.data.reviews[0].orderId, orderId);

    const publicReviews = env.call({ action: "productReviews", productId: "9002" });
    assert.equal(publicReviews.ok, true);
    assert.equal(publicReviews.data.reviews.length, 1);
    assert.equal(publicReviews.data.reviews[0].rating, 5);
    assert.equal(Object.hasOwn(publicReviews.data.reviews[0], "orderId"), false);
    assert.equal(Object.hasOwn(publicReviews.data.reviews[0], "userPhone"), false);
  });

  it("чужой пользователь не может оценить заказ, а неподтверждённый статус не считается доставкой", () => {
    const { token } = session();
    const order = createOrder(token, orderInput());
    assert.equal(order.ok, true, JSON.stringify(order));
    const orderId = order.data.order.orderId;
    setOrderStatus(orderId, "Не доставлен");
    const input = { orderId, productId: "9002", size: "42", color: null, rating: 4 };
    assert.equal(env.call({ action: "createReview", token, ...input }).error.code, "ORDER_NOT_DELIVERED");

    const other = register("+79187654321");
    setOrderStatus(orderId, "Доставлен");
    assert.equal(
      env.call({ action: "createReview", token: other.data.token, ...input }).error.code,
      "ORDER_NOT_FOUND"
    );
  });
});

describe("Стоимость доставки", () => {
  const CASES = [
    [{ type: "pickup", service: null, pickupAddress: PVZ }, "Бесплатно"],
    [{ type: "russia", service: "Wildberries", pickupAddress: null }, "от 96 ₽"],
    [{ type: "russia", service: "OZON", pickupAddress: null }, "от 144 ₽"],
    [{ type: "russia", service: "Яндекс", pickupAddress: null }, "от 225 ₽"],
    [{ type: "russia", service: "CDEK", pickupAddress: null }, "от 290 ₽"],
    [{ type: "russia", service: "Почта России", pickupAddress: null }, "от 249 ₽"],
  ];

  it("пункт выдачи — бесплатно, у служб «от …»; пишется в заказ, а в сумму заказа не входит", () => {
    const { token } = session();
    CASES.forEach(([delivery, label], i) => {
      const res = createOrder(token, orderInput({ delivery, paymentMethod: "prepaid" }));
      assert.equal(res.ok, true, JSON.stringify(res));
      assert.equal(res.data.order.deliveryPrice, label);
      assert.equal(res.data.order.total, 5990); // только товары: доставка в итог не входит
      const row = env.rows("ORDERS")[i];
      assert.equal(row.deliveryPrice, label);
      assert.equal(row.total, 5990);
    });
  });

  it("стоимость доставки считает сервер: подменить её с сайта нельзя, лишние поля игнорируются", () => {
    const { token } = session();
    const res = createOrder(
      token,
      orderInput({
        delivery: { type: "russia", service: "CDEK", pickupAddress: null, price: 0, deliveryPrice: "Бесплатно" },
        paymentMethod: "prepaid",
      })
    );
    assert.equal(res.ok, true, JSON.stringify(res));
    assert.equal(res.data.order.deliveryPrice, "от 290 ₽");
  });

  it("в письме указана стоимость доставки; у доставки по России — с пометкой, что в итог она не входит", () => {
    env.loadScript("VBStoreNotify.gs");
    const { token } = session();
    const russia = createOrder(
      token,
      orderInput({ delivery: { type: "russia", service: "CDEK", pickupAddress: null }, paymentMethod: "prepaid" })
    );
    assert.equal(russia.ok, true, JSON.stringify(russia));
    assert.match(env.mails[0].body, /Стоимость доставки: от 290 ₽ \(в итог не входит; точную сумму подтвердить с покупателем\)/);

    assert.equal(createOrder(token, orderInput()).ok, true);
    assert.match(env.mails[1].body, /Стоимость доставки: Бесплатно\n/);
  });

  it("история заказов: стоимость доставки берётся из таблицы, а для старых строк без неё вычисляется", () => {
    const { token } = session();
    const res = createOrder(
      token,
      orderInput({ delivery: { type: "russia", service: "OZON", pickupAddress: null }, paymentMethod: "prepaid" })
    );
    assert.equal(res.ok, true, JSON.stringify(res));

    const sheet = env.sheet("ORDERS");
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const col = headers.indexOf("deliveryPrice") + 1;
    assert.ok(col > 0);

    sheet.getRange(2, col).setValue(""); // «старая» строка: колонка со стоимостью появилась позже
    assert.equal(env.call({ action: "myOrders", token }).data.orders[0].deliveryPrice, "от 144 ₽");

    sheet.getRange(2, col).setValue("от 999 ₽"); // сохранённое в таблице показывается как есть
    assert.equal(env.call({ action: "myOrders", token }).data.orders[0].deliveryPrice, "от 999 ₽");
  });

  it("в уже существующий лист ORDERS новая колонка deliveryPrice добавляется справа, остальное не трогается", () => {
    env.sandbox.vbStoreSetup();
    const sheet = env.sheet("ORDERS");
    const before = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const idx = before.indexOf("deliveryPrice");
    // имитируем лист, созданный прежней версией: колонки deliveryPrice в нём ещё нет
    sheet.getRange(1, idx + 1).setValue("");
    const { token } = session();
    assert.equal(createOrder(token, orderInput()).ok, true);
    const after = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    assert.equal(after[after.length - 1], "deliveryPrice");
    assert.equal(env.rows("ORDERS")[0].status, "Новый");
  });
});
