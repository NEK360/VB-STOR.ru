/**
 * VB STORE — серверная часть для регистрации, входа и заказов.
 *
 * Это ДОПОЛНЕНИЕ к вашему существующему скрипту Google Apps Script (тому, что уже
 * отдаёт каталог по ?action=catalog). Каталог и его формат не меняются.
 * Как подключить — см. apps-script/README.md (3 шага, около 10 минут).
 *
 * Что умеет (все запросы — POST на тот же адрес веб-приложения):
 *   register     — регистрация по телефону и паролю (пароль не хранится и не передаётся
 *                  открытым текстом — см. «Безопасность» ниже);
 *   login        — вход, выдаёт токен сессии;
 *   me           — проверка токена;
 *   createOrder  — создание заказа: проверка цен/остатков/промокода по каталогу и
 *                  запись строки в лист ORDERS;
 *   myOrders     — история заказов текущего пользователя.
 *
 * Безопасность:
 *   - сайт отправляет не пароль, а ключ, выведенный из него в браузере (PBKDF2-SHA256,
 *     150 000 итераций). Здесь хранится только случайная соль и хэш этого ключа
 *     (HMAC-SHA256 с секретом PASSWORD_PEPPER из «Свойств скрипта», а не из таблицы);
 *   - токен сессии — подписанная (HMAC-SHA256, секрет TOKEN_SECRET) строка с номером
 *     телефона и сроком действия; телефон заказа берётся из токена, а не из запроса;
 *   - цены, наличие и промокод перепроверяются по каталогу: подменить сумму в браузере
 *     нельзя;
 *   - повторная отправка того же заказа (двойной тап, сбой сети) не создаёт дубль;
 *   - перебор пароля ограничен: 5 неудачных попыток → блокировка на 15 минут.
 *
 * ВАЖНО: не удаляйте свойства TOKEN_SECRET и PASSWORD_PEPPER (Настройки проекта →
 * Свойства скрипта) — иначе пользователям придётся регистрироваться заново.
 *
 * Все имена здесь собраны в один объект VBStoreApi, чтобы не пересекаться с функциями
 * вашего скрипта.
 */

var VBStoreApi = (function () {
  'use strict';

  // ==========================================================================
  // НАСТРОЙКИ
  // ==========================================================================
  var CONFIG = {
    // ID Google Таблицы. Оставьте пустым, если скрипт создан из самой таблицы
    // (Расширения → Apps Script) — тогда используется эта таблица.
    SPREADSHEET_ID: '',

    USERS_SHEET: 'USERS',
    ORDERS_SHEET: 'ORDERS',

    // Номера заказов начинаются с этого числа (если в ORDERS уже есть заказы — продолжится после них)
    ORDER_NUMBER_START: 10001,

    SESSION_DAYS: 30,

    LOGIN_MAX_FAILS: 5,
    LOGIN_LOCK_SECONDS: 900,
    REGISTER_MAX_PER_HOUR: 60,
    ORDERS_MAX_PER_HOUR: 10,

    MAX_LINES_PER_ORDER: 30,
    // Для товаров без размеров точный остаток неизвестен — это верхний предел количества
    UNKNOWN_STOCK_CAP: 10,

    // Промокоды: код → процент скидки. Держите в соответствии с src/lib/promo.ts на сайте.
    PROMO_CODES: { VB5: 5, SKFU: 5 },

    // Пункты выдачи и службы доставки. Держите в соответствии с src/lib/delivery.ts на сайте.
    PICKUP_POINTS: [
      'г. Изобильный, Улица Кирова 2а',
      'г. Изобильный, Улица Ленина 66',
      'г. Изобильный, Улица Розы Люксембург 3б'
    ],
    // Оплата «При получении» разрешена только для этих пунктов выдачи (ПВЗ Wildberries)
    COD_PICKUP_POINTS: [
      'г. Изобильный, Улица Кирова 2а',
      'г. Изобильный, Улица Ленина 66',
      'г. Изобильный, Улица Розы Люксембург 3б'
    ],
    DELIVERY_SERVICES: ['Wildberries', 'OZON', 'Яндекс', 'CDEK', 'Почта России'],

    // Начальные статусы. Дальше вы меняете статус вручную в таблице — покупатель увидит его в «Мои заказы».
    STATUS_PREPAID: 'Ожидает оплаты',
    STATUS_ON_RECEIPT: 'Новый',

    // Необязательно: своя функция, возвращающая массив строк каталога
    // (по умолчанию каталог берётся из вашего doGet с action=catalog).
    CATALOG_LOADER: null
  };

  var LABEL = {
    pickup: 'Пункт выдачи',
    russia: 'Доставка по России',
    prepaid: 'Сразу',
    on_receipt: 'При получении'
  };

  var USER_HEADERS = ['phone', 'passwordHash', 'salt', 'createdAt', 'lastLoginAt', 'sessionVersion'];
  var USER_FORMATS = {
    phone: '@', passwordHash: '@', salt: '@',
    createdAt: 'dd.MM.yyyy HH:mm:ss', lastLoginAt: 'dd.MM.yyyy HH:mm:ss', sessionVersion: '0'
  };

  // Первые 12 колонок — ровно те, что нужны владельцу; три последних — служебные.
  var ORDER_HEADERS = [
    'orderId', 'createdAt', 'userPhone', 'items', 'total', 'promoCode', 'discount',
    'deliveryType', 'deliveryService', 'pickupAddress', 'paymentMethod', 'status',
    'subtotal', 'itemsJson', 'requestId'
  ];
  var ORDER_FORMATS = {
    orderId: '0', createdAt: 'dd.MM.yyyy HH:mm:ss', userPhone: '@', items: '@',
    total: '#,##0', promoCode: '@', discount: '#,##0', deliveryType: '@', deliveryService: '@',
    pickupAddress: '@', paymentMethod: '@', status: '@', subtotal: '#,##0', itemsJson: '@', requestId: '@'
  };

  // ==========================================================================
  // Ошибки и ответы
  // ==========================================================================
  function ApiError(code, details, message) {
    this.code = code;
    this.details = details || null;
    this.userMessage = message || '';
  }

  function jsonOut_(obj) {
    return ContentService.createTextOutput(JSON.stringify(obj))
      .setMimeType(ContentService.MimeType.JSON);
  }

  function errorResponse_(err) {
    if (err instanceof ApiError) {
      var error = { code: err.code };
      if (err.userMessage) error.message = err.userMessage;
      if (err.details) error.details = err.details;
      return { ok: false, error: error };
    }
    // Непредвиденная ошибка: детали остаются в журнале, клиенту — нейтральное сообщение
    console.error('VBStoreApi unexpected error: ' + (err && err.stack ? err.stack : err));
    return { ok: false, error: { code: 'SERVER_ERROR' } };
  }

  // ==========================================================================
  // Телефон (те же правила, что и на сайте: src/lib/phone.ts)
  // ==========================================================================
  function normalizePhone_(input) {
    var raw = String(input === null || input === undefined ? '' : input).replace(/\D/g, '');
    var canonical;
    if (raw.length === 11 && (raw.charAt(0) === '7' || raw.charAt(0) === '8')) {
      canonical = '7' + raw.slice(1);
    } else if (raw.length === 10) {
      canonical = '7' + raw;
    } else {
      return null;
    }
    if (!/^7[3489]\d{9}$/.test(canonical)) return null;
    return '+' + canonical;
  }

  // ==========================================================================
  // Криптография
  // ==========================================================================
  function bytesToHex_(bytes) {
    var out = '';
    for (var i = 0; i < bytes.length; i++) {
      var b = (bytes[i] + 256) % 256; // Apps Script возвращает знаковые байты
      out += (b < 16 ? '0' : '') + b.toString(16);
    }
    return out;
  }

  function hmacHex_(message, key) {
    return bytesToHex_(Utilities.computeHmacSha256Signature(message, key));
  }

  function sha256Hex_(text) {
    return bytesToHex_(
      Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8)
    );
  }

  function safeEqual_(a, b) {
    a = String(a);
    b = String(b);
    if (a.length !== b.length) return false;
    var diff = 0;
    for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }

  function getSecret_(name) {
    var props = PropertiesService.getScriptProperties();
    var value = props.getProperty(name);
    if (value) return value;

    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      value = props.getProperty(name);
      if (!value) {
        value = sha256Hex_(
          Utilities.getUuid() + Utilities.getUuid() + Utilities.getUuid() + new Date().getTime()
        );
        props.setProperty(name, value);
      }
    } finally {
      lock.releaseLock();
    }
    return value;
  }

  function hashPassword_(proof, salt) {
    return hmacHex_('pw:' + salt + ':' + proof, getSecret_('PASSWORD_PEPPER'));
  }

  function newSalt_() {
    return sha256Hex_(Utilities.getUuid() + Utilities.getUuid() + new Date().getTime()).slice(0, 32);
  }

  // Полезная нагрузка токена — только ASCII (цифры, +, JSON), поэтому кодируем её в hex
  function asciiToHex_(text) {
    var out = '';
    for (var i = 0; i < text.length; i++) {
      var code = text.charCodeAt(i);
      out += (code < 16 ? '0' : '') + code.toString(16);
    }
    return out;
  }

  function hexToAscii_(hex) {
    if (!/^([0-9a-f]{2})+$/.test(hex)) return '';
    var out = '';
    for (var i = 0; i < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    return out;
  }

  function nowSeconds_() {
    return Math.floor(new Date().getTime() / 1000);
  }

  function signToken_(payload) {
    var body = 'v1.' + asciiToHex_(JSON.stringify(payload));
    return body + '.' + hmacHex_(body, getSecret_('TOKEN_SECRET'));
  }

  function verifyToken_(token) {
    var unauthorized = new ApiError('UNAUTHORIZED');
    if (typeof token !== 'string' || token.length > 600) throw unauthorized;

    var parts = token.split('.');
    if (parts.length !== 3 || parts[0] !== 'v1') throw unauthorized;

    var expected = hmacHex_(parts[0] + '.' + parts[1], getSecret_('TOKEN_SECRET'));
    if (!safeEqual_(expected, parts[2])) throw unauthorized;

    var payload;
    try {
      payload = JSON.parse(hexToAscii_(parts[1]));
    } catch (e) {
      throw unauthorized;
    }
    if (!payload || typeof payload.p !== 'string' || !(payload.e > nowSeconds_())) throw unauthorized;
    return payload;
  }

  function issueSession_(phone, version) {
    var now = nowSeconds_();
    var expiresAt = now + CONFIG.SESSION_DAYS * 86400;
    return {
      token: signToken_({ p: phone, e: expiresAt, v: version, i: now }),
      phone: phone,
      expiresAt: expiresAt
    };
  }

  // ==========================================================================
  // Таблицы
  // ==========================================================================
  function getSpreadsheet_() {
    var ss = CONFIG.SPREADSHEET_ID
      ? SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
      : SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      throw new Error('Не найдена таблица: укажите SPREADSHEET_ID в настройках VBStoreApi.gs');
    }
    return ss;
  }

  /** Находит или создаёт лист и гарантирует наличие нужных колонок (лишние колонки владельца не трогаем). */
  function ensureSheet_(name, headers) {
    var ss = getSpreadsheet_();
    var sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);

    if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
      return sheet;
    }

    var existing = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
    var missing = headers.filter(function (h) { return existing.indexOf(h) < 0; });
    if (missing.length) {
      var start = existing.length + 1;
      sheet.getRange(1, start, 1, missing.length).setValues([missing]);
      sheet.getRange(1, start, 1, missing.length).setFontWeight('bold');
    }
    return sheet;
  }

  function headerMap_(sheet) {
    var names = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var map = {};
    for (var i = 0; i < names.length; i++) map[String(names[i])] = i + 1;
    return map;
  }

  function appendRecord_(sheet, map, record, formats) {
    var width = sheet.getLastColumn();
    var values = [];
    var numberFormats = [];
    for (var c = 0; c < width; c++) { values.push(''); numberFormats.push('General'); }

    Object.keys(record).forEach(function (key) {
      var col = map[key];
      if (!col) return;
      values[col - 1] = record[key];
      if (formats[key]) numberFormats[col - 1] = formats[key];
    });

    var rowIndex = sheet.getLastRow() + 1;
    var range = sheet.getRange(rowIndex, 1, 1, width);
    // Формат задаём ДО записи: так «+79181234567» остаётся текстом, а не превращается в число
    range.setNumberFormats([numberFormats]);
    range.setValues([values]);
    return rowIndex;
  }

  function ensureUsersSheet_() { return ensureSheet_(CONFIG.USERS_SHEET, USER_HEADERS); }

  function ensureOrdersSheet_() {
    var sheet = ensureSheet_(CONFIG.ORDERS_SHEET, ORDER_HEADERS);
    return sheet;
  }

  function findUserRow_(sheet, map, phone) {
    var last = sheet.getLastRow();
    if (last < 2 || !map.phone) return 0;
    var values = sheet.getRange(2, map.phone, last - 1, 1).getValues();
    for (var i = 0; i < values.length; i++) {
      if (normalizePhone_(values[i][0]) === phone) return i + 2;
    }
    return 0;
  }

  function withLock_(fn) {
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      return fn();
    } finally {
      lock.releaseLock();
    }
  }

  // ==========================================================================
  // Ограничение частоты запросов (CacheService)
  // ==========================================================================
  function counterKey_(prefix, id) {
    return prefix + ':' + sha256Hex_(String(id)).slice(0, 24);
  }

  function getCount_(key) {
    return Number(CacheService.getScriptCache().get(key)) || 0;
  }

  function bumpCount_(key, ttlSeconds) {
    var next = getCount_(key) + 1;
    CacheService.getScriptCache().put(key, String(next), ttlSeconds);
    return next;
  }

  // ==========================================================================
  // Действия: регистрация / вход / проверка сессии
  // ==========================================================================
  function readProof_(body) {
    var proof = String(body.proof || '');
    if (!/^[0-9a-f]{64}$/.test(proof)) throw new ApiError('VALIDATION');
    return proof;
  }

  function register_(body) {
    var phone = normalizePhone_(body.phone);
    if (!phone) throw new ApiError('INVALID_PHONE');
    var proof = readProof_(body);

    // защита таблицы от массовой регистрации ботами
    var globalKey = counterKey_('reg', 'all');
    if (getCount_(globalKey) >= CONFIG.REGISTER_MAX_PER_HOUR) throw new ApiError('TOO_MANY_ATTEMPTS');

    return withLock_(function () {
      var sheet = ensureUsersSheet_();
      var map = headerMap_(sheet);
      if (findUserRow_(sheet, map, phone)) throw new ApiError('PHONE_EXISTS');

      var salt = newSalt_();
      var now = new Date();
      appendRecord_(sheet, map, {
        phone: phone,
        passwordHash: hashPassword_(proof, salt),
        salt: salt,
        createdAt: now,
        lastLoginAt: now,
        sessionVersion: 1
      }, USER_FORMATS);

      bumpCount_(globalKey, 3600);
      return issueSession_(phone, 1);
    });
  }

  function login_(body) {
    var phone = normalizePhone_(body.phone);
    if (!phone) throw new ApiError('INVALID_PHONE');
    var proof = readProof_(body);

    var failKey = counterKey_('fail', phone);
    if (getCount_(failKey) >= CONFIG.LOGIN_MAX_FAILS) throw new ApiError('TOO_MANY_ATTEMPTS');

    var sheet = ensureUsersSheet_();
    var map = headerMap_(sheet);
    var rowIndex = findUserRow_(sheet, map, phone);

    var storedHash = '';
    var salt = 'no-such-user'; // хэшируем и для несуществующего номера — время ответа не выдаёт, есть ли такой номер
    var version = 1;
    if (rowIndex) {
      storedHash = String(sheet.getRange(rowIndex, map.passwordHash).getValue());
      salt = String(sheet.getRange(rowIndex, map.salt).getValue());
      version = Number(sheet.getRange(rowIndex, map.sessionVersion).getValue()) || 1;
    }

    var matches = safeEqual_(hashPassword_(proof, salt), storedHash) && rowIndex > 0;
    if (!matches) {
      bumpCount_(failKey, CONFIG.LOGIN_LOCK_SECONDS);
      throw new ApiError('INVALID_CREDENTIALS');
    }

    CacheService.getScriptCache().remove(failKey);
    sheet.getRange(rowIndex, map.lastLoginAt).setValue(new Date());
    return issueSession_(phone, version);
  }

  /** Проверяет токен и то, что пользователь существует. Возвращает { phone }. */
  function authenticate_(token) {
    var payload = verifyToken_(token);
    var sheet = ensureUsersSheet_();
    var map = headerMap_(sheet);
    var rowIndex = findUserRow_(sheet, map, payload.p);
    if (!rowIndex) throw new ApiError('UNAUTHORIZED');

    var version = Number(sheet.getRange(rowIndex, map.sessionVersion).getValue()) || 1;
    if (version !== Number(payload.v)) throw new ApiError('UNAUTHORIZED');
    return { phone: payload.p };
  }

  function me_(body) {
    var user = authenticate_(body.token);
    return { phone: user.phone };
  }

  // ==========================================================================
  // Каталог (для проверки цен и остатков)
  // ==========================================================================
  function toQty_(value) {
    var n = Number(value);
    return isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }

  function loadCatalogRows_() {
    if (typeof CONFIG.CATALOG_LOADER === 'function') return CONFIG.CATALOG_LOADER();

    if (typeof doGet !== 'function') throw new Error('Не найдена функция doGet — не из чего брать каталог');
    // Берём каталог тем же способом, каким его получает сайт: doGet с action=catalog
    var output = doGet({
      parameter: { action: 'catalog' },
      parameters: { action: ['catalog'] },
      queryString: 'action=catalog',
      contextPath: ''
    });
    var text = output && typeof output.getContent === 'function' ? output.getContent() : String(output);
    var data = JSON.parse(text);

    if (Array.isArray(data)) return data;
    var keys = ['products', 'data', 'items'];
    for (var i = 0; i < keys.length; i++) {
      if (data && Array.isArray(data[keys[i]])) return data[keys[i]];
    }
    throw new Error('Каталог вернул неожиданный формат');
  }

  /** Строит индекс товаров по id. Правила склейки размеров те же, что на сайте (src/lib/api.ts). */
  function buildCatalogIndex_(rows) {
    var index = {};

    rows.forEach(function (row) {
      if (!row) return;
      var id = String(row.id !== undefined && row.id !== null && row.id !== '' ? row.id : (row.article || '')).trim();
      if (!id) return;

      var product = index[id];
      if (!product) {
        product = index[id] = {
          id: id, article: '', name: '', brand: '', price: 0, image: '',
          available: false, hasSizes: false, sizes: {}
        };
      }

      product.article = product.article || String(row.article || '');
      product.name = product.name || String(row.name || '');
      product.brand = product.brand || String(row.brand || '');
      var price = Number(row.price);
      if (!(product.price > 0) && price > 0) product.price = price;
      if (!product.image && row.images && row.images.length) product.image = String(row.images[0]);
      if (row.available === true || String(row.available).toUpperCase() === 'TRUE') product.available = true;

      var sizes = Array.isArray(row.sizes) ? row.sizes : [];
      if (!sizes.length && row.size) sizes = [{ value: row.size, status: 'available' }];

      sizes.forEach(function (size) {
        var value = String(size && size.value !== undefined && size.value !== null ? size.value : '').trim();
        if (!value) return;
        product.hasSizes = true;

        var status = size.status === 'low' ? 'low' : size.status === 'unavailable' ? 'unavailable' : 'available';
        var shop = toQty_(size.stockOffline);
        var wb = toQty_(size.stockWB);
        var current = product.sizes[value];
        if (!current) {
          product.sizes[value] = { shop: shop, wb: wb, status: status };
        } else {
          current.shop = Math.max(current.shop, shop);
          current.wb = Math.max(current.wb, wb);
          current.status = current.status === 'available' || status === 'available' ? 'available'
            : current.status === 'low' || status === 'low' ? 'low' : 'unavailable';
        }
      });
    });

    return index;
  }

  // ==========================================================================
  // Заказы
  // ==========================================================================
  function readItems_(raw) {
    if (!Array.isArray(raw) || raw.length === 0) throw new ApiError('EMPTY_CART');

    // одинаковые товар+размер+цвет объединяем: остаток проверяется по суммарному количеству
    var merged = {};
    var order = [];
    raw.forEach(function (item) {
      if (!item || typeof item !== 'object') throw new ApiError('VALIDATION');
      var productId = String(item.productId === undefined || item.productId === null ? '' : item.productId).trim();
      var quantity = Math.floor(Number(item.quantity));
      if (!productId || !isFinite(quantity) || quantity < 1 || quantity > 1000) throw new ApiError('VALIDATION');

      var size = item.size === undefined || item.size === null || item.size === '' ? null : String(item.size).trim();
      var color = item.color === undefined || item.color === null || item.color === '' ? null : String(item.color).trim();
      var key = [productId, size || '', color || ''].join('|');
      if (merged[key]) {
        merged[key].quantity += quantity;
      } else {
        merged[key] = { productId: productId, size: size, color: color, quantity: quantity };
        order.push(key);
      }
    });

    if (order.length > CONFIG.MAX_LINES_PER_ORDER) throw new ApiError('VALIDATION');
    return order.map(function (key) { return merged[key]; });
  }

  function checkStock_(items, catalog) {
    // суммарное количество по товару+размеру (разные цвета делят один остаток)
    var totals = {};
    items.forEach(function (item) {
      var key = item.productId + '|' + (item.size || '');
      totals[key] = (totals[key] || 0) + item.quantity;
    });

    return items.map(function (item) {
      var product = catalog[item.productId];
      if (!product) throw new ApiError('PRODUCT_NOT_FOUND', { productId: item.productId });
      if (!(product.price > 0)) throw new ApiError('PRODUCT_NOT_FOUND', { productId: item.productId });

      var label = '«' + product.name + '»';
      var total = totals[item.productId + '|' + (item.size || '')];

      if (product.hasSizes) {
        if (!item.size || !product.sizes[item.size]) {
          throw new ApiError('SIZE_UNAVAILABLE', { productId: item.productId, size: item.size },
            label + ': выбранный размер недоступен.');
        }
        var info = product.sizes[item.size];
        var unavailable = info.status === 'unavailable' || info.shop + info.wb <= 0;
        var orderable = !unavailable && info.shop > 0;
        if (!orderable) {
          throw new ApiError('OUT_OF_STOCK', { productId: item.productId, size: item.size, available: 0 },
            label + ', размер ' + item.size + ': нет в наличии.');
        }
        if (total > info.shop) {
          throw new ApiError('OUT_OF_STOCK', { productId: item.productId, size: item.size, available: info.shop },
            label + ', размер ' + item.size + ': в наличии только ' + info.shop + ' шт.');
        }
      } else {
        if (!product.available) {
          throw new ApiError('OUT_OF_STOCK', { productId: item.productId, available: 0 }, label + ': нет в наличии.');
        }
        if (total > CONFIG.UNKNOWN_STOCK_CAP) {
          throw new ApiError('OUT_OF_STOCK', { productId: item.productId, available: CONFIG.UNKNOWN_STOCK_CAP },
            label + ': можно заказать не более ' + CONFIG.UNKNOWN_STOCK_CAP + ' шт.');
        }
      }

      return {
        productId: item.productId,
        article: product.article,
        name: product.name || 'Товар',
        brand: product.brand,
        image: product.image,
        size: product.hasSizes ? item.size : null,
        color: item.color,
        quantity: item.quantity,
        price: product.price
      };
    });
  }

  function readDelivery_(raw) {
    var d = raw && typeof raw === 'object' ? raw : {};
    if (d.type === 'pickup') {
      if (CONFIG.PICKUP_POINTS.indexOf(d.pickupAddress) < 0) throw new ApiError('DELIVERY_INVALID');
      return { type: 'pickup', service: '', pickupAddress: d.pickupAddress };
    }
    if (d.type === 'russia') {
      if (CONFIG.DELIVERY_SERVICES.indexOf(d.service) < 0) throw new ApiError('DELIVERY_INVALID');
      return { type: 'russia', service: d.service, pickupAddress: '' };
    }
    throw new ApiError('DELIVERY_INVALID');
  }

  function readPayment_(method, delivery) {
    if (method !== 'prepaid' && method !== 'on_receipt') throw new ApiError('PAYMENT_NOT_ALLOWED');
    // «При получении» — только для ПВЗ Wildberries из списка; для остального доступно только «Сразу»
    if (method === 'on_receipt' &&
        !(delivery.type === 'pickup' && CONFIG.COD_PICKUP_POINTS.indexOf(delivery.pickupAddress) >= 0)) {
      throw new ApiError('PAYMENT_NOT_ALLOWED');
    }
    return method;
  }

  function calculate_(lines, promoCodeRaw) {
    var subtotal = 0;
    lines.forEach(function (line) { subtotal += line.price * line.quantity; });

    var code = String(promoCodeRaw || '').replace(/\s+/g, '').toUpperCase();
    var percent = 0;
    if (code) {
      if (!Object.prototype.hasOwnProperty.call(CONFIG.PROMO_CODES, code)) throw new ApiError('PROMO_INVALID');
      percent = CONFIG.PROMO_CODES[code];
    }
    // та же формула, что на сайте (src/lib/promo.ts): скидка от общей суммы, округление до рубля
    var discount = percent ? Math.min(subtotal, Math.round(subtotal * percent / 100)) : 0;
    return { subtotal: subtotal, discount: discount, total: subtotal - discount, promoCode: code };
  }

  function itemsText_(lines) {
    return lines.map(function (line, i) {
      var parts = [(i + 1) + '. ' + (line.brand ? line.brand + ' ' : '') + line.name];
      if (line.article) parts.push(' (арт. ' + line.article + ')');
      if (line.size) parts.push(', размер ' + line.size);
      if (line.color) parts.push(', цвет ' + line.color);
      parts.push(' × ' + line.quantity + ' = ' + (line.price * line.quantity) + ' ₽');
      return parts.join('');
    }).join('\n');
  }

  function itemsJson_(lines) {
    return JSON.stringify(lines.map(function (line) {
      return {
        productId: line.productId, name: line.name, brand: line.brand, image: line.image,
        size: line.size, color: line.color, quantity: line.quantity, price: line.price
      };
    }));
  }

  function toDate_(value) {
    if (value instanceof Date) return value;
    var d = new Date(value);
    return isNaN(d.getTime()) ? new Date(0) : d;
  }

  /** Строка листа ORDERS → объект заказа в формате, который ждёт сайт. */
  function rowToOrder_(map, row) {
    function cell(name) { return map[name] ? row[map[name] - 1] : ''; }

    var items = [];
    try {
      var parsed = JSON.parse(String(cell('itemsJson') || '[]'));
      if (Array.isArray(parsed)) items = parsed;
    } catch (e) { items = []; }

    return {
      orderId: String(cell('orderId')),
      createdAt: toDate_(cell('createdAt')).toISOString(),
      userPhone: String(cell('userPhone')),
      items: items,
      subtotal: Number(cell('subtotal')) || Number(cell('total')) + Number(cell('discount')) || 0,
      discount: Number(cell('discount')) || 0,
      total: Number(cell('total')) || 0,
      promoCode: String(cell('promoCode') || '') || null,
      deliveryType: String(cell('deliveryType')) === LABEL.russia ? 'russia' : 'pickup',
      deliveryService: String(cell('deliveryService') || '') || null,
      pickupAddress: String(cell('pickupAddress') || '') || null,
      paymentMethod: String(cell('paymentMethod')) === LABEL.on_receipt ? 'on_receipt' : 'prepaid',
      status: String(cell('status') || '')
    };
  }

  function nextOrderId_(sheet, map) {
    var props = PropertiesService.getScriptProperties();
    var next = Number(props.getProperty('ORDER_SEQ'));

    if (!(next >= CONFIG.ORDER_NUMBER_START)) {
      // первый заказ (или свойство удалено): продолжаем после самого большого номера в таблице
      next = CONFIG.ORDER_NUMBER_START;
      var last = sheet.getLastRow();
      if (last >= 2 && map.orderId) {
        var ids = sheet.getRange(2, map.orderId, last - 1, 1).getValues();
        for (var i = 0; i < ids.length; i++) {
          var n = Number(ids[i][0]);
          if (isFinite(n) && n >= next) next = n + 1;
        }
      }
    }
    props.setProperty('ORDER_SEQ', String(next + 1));
    return next;
  }

  function findOrderByRequestId_(sheet, map, phone, requestId) {
    var last = sheet.getLastRow();
    if (last < 2 || !map.requestId) return null;
    var from = Math.max(2, last - 299); // повторы ищем среди последних 300 заказов
    var rows = sheet.getRange(from, 1, last - from + 1, sheet.getLastColumn()).getValues();
    for (var i = rows.length - 1; i >= 0; i--) {
      if (String(rows[i][map.requestId - 1]) === requestId &&
          normalizePhone_(rows[i][map.userPhone - 1]) === phone) {
        return rowToOrder_(map, rows[i]);
      }
    }
    return null;
  }

  function notifyOwner_(order) {
    try {
      // Необязательное уведомление на почту: работает, только если добавлен файл VBStoreNotify.gs
      if (typeof VBStoreNotify !== 'undefined' && VBStoreNotify && typeof VBStoreNotify.newOrder === 'function') {
        VBStoreNotify.newOrder(order, itemsText_(order.items));
      }
    } catch (err) {
      console.error('Не удалось отправить уведомление о заказе: ' + err);
    }
  }

  function createOrder_(body) {
    var user = authenticate_(body.token);
    var input = body.order;
    if (!input || typeof input !== 'object') throw new ApiError('VALIDATION');

    var requestId = String(input.requestId || '');
    if (!/^[A-Za-z0-9_-]{8,80}$/.test(requestId)) throw new ApiError('VALIDATION');

    var rateKey = counterKey_('ord', user.phone);
    if (getCount_(rateKey) >= CONFIG.ORDERS_MAX_PER_HOUR) throw new ApiError('TOO_MANY_ATTEMPTS');

    var items = readItems_(input.items);
    var delivery = readDelivery_(input.delivery);
    var paymentMethod = readPayment_(input.paymentMethod, delivery);

    // Каталог читаем до блокировки: чтение может занять секунды, а блокировка должна быть короткой
    var catalog = buildCatalogIndex_(loadCatalogRows_());
    var lines = checkStock_(items, catalog);
    var totals = calculate_(lines, input.promoCode);

    var client = input.clientTotals || {};
    if (Number(client.total) !== totals.total) {
      throw new ApiError('PRICE_CHANGED', { total: totals.total, subtotal: totals.subtotal, discount: totals.discount });
    }

    var result = withLock_(function () {
      var sheet = ensureOrdersSheet_();
      var map = headerMap_(sheet);

      // повторная отправка того же заказа — возвращаем уже созданный
      var existing = findOrderByRequestId_(sheet, map, user.phone, requestId);
      if (existing) return { order: existing, created: false };

      var orderId = nextOrderId_(sheet, map);
      var createdAt = new Date();
      var status = paymentMethod === 'prepaid' ? CONFIG.STATUS_PREPAID : CONFIG.STATUS_ON_RECEIPT;

      var rowIndex = appendRecord_(sheet, map, {
        orderId: orderId,
        createdAt: createdAt,
        userPhone: user.phone,
        items: itemsText_(lines),
        total: totals.total,
        promoCode: totals.promoCode,
        discount: totals.discount,
        deliveryType: LABEL[delivery.type],
        deliveryService: delivery.service,
        pickupAddress: delivery.pickupAddress,
        paymentMethod: LABEL[paymentMethod],
        status: status,
        subtotal: totals.subtotal,
        itemsJson: itemsJson_(lines),
        requestId: requestId
      }, ORDER_FORMATS);

      if (map.items) sheet.getRange(rowIndex, map.items).setWrap(true);
      bumpCount_(rateKey, 3600);

      var order = {
        orderId: String(orderId),
        createdAt: createdAt.toISOString(),
        userPhone: user.phone,
        items: lines.map(function (line) {
          return {
            productId: line.productId, name: line.name, brand: line.brand, image: line.image,
            size: line.size, color: line.color, quantity: line.quantity, price: line.price
          };
        }),
        subtotal: totals.subtotal,
        discount: totals.discount,
        total: totals.total,
        promoCode: totals.promoCode || null,
        deliveryType: delivery.type,
        deliveryService: delivery.service || null,
        pickupAddress: delivery.pickupAddress || null,
        paymentMethod: paymentMethod,
        status: status
      };

      return { order: order, created: true };
    });

    // уведомление — уже после освобождения блокировки (отправка почты может занять секунды)
    if (result.created) notifyOwner_(result.order);
    return { order: result.order };
  }

  function myOrders_(body) {
    var user = authenticate_(body.token);
    var sheet = ensureOrdersSheet_();
    var map = headerMap_(sheet);
    var last = sheet.getLastRow();
    if (last < 2) return { orders: [] };

    var rows = sheet.getRange(2, 1, last - 1, sheet.getLastColumn()).getValues();
    var orders = [];
    for (var i = rows.length - 1; i >= 0; i--) { // новые — первыми
      if (normalizePhone_(rows[i][map.userPhone - 1]) === user.phone) {
        orders.push(rowToOrder_(map, rows[i]));
        if (orders.length >= 100) break;
      }
    }
    return { orders: orders };
  }

  // ==========================================================================
  // Точки входа
  // ==========================================================================
  var ACTIONS = {
    register: register_,
    login: login_,
    me: me_,
    createOrder: createOrder_,
    myOrders: myOrders_
  };

  /**
   * Обработчик POST. Возвращает null, если запрос не наш (тогда выполняется ваш прежний код doPost).
   */
  function handlePost(e) {
    var body;
    try {
      var raw = e && e.postData && e.postData.contents;
      if (!raw || raw.length > 60000) return null;
      body = JSON.parse(raw);
    } catch (err) {
      return null;
    }
    if (!body || typeof body !== 'object' || typeof body.action !== 'string' ||
        !Object.prototype.hasOwnProperty.call(ACTIONS, body.action)) {
      return null;
    }

    var response;
    try {
      // секреты создаём заранее — до любых блокировок (вложенные блокировки в Apps Script не используем)
      getSecret_('TOKEN_SECRET');
      getSecret_('PASSWORD_PEPPER');
      response = { ok: true, data: ACTIONS[body.action](body) };
    } catch (err) {
      response = errorResponse_(err);
    }
    return jsonOut_(response);
  }

  /**
   * Обработчик GET (необязательный). Единственное, что он умеет, — ответить на проверочный
   * запрос ?action=vbPing. Для всего остального возвращает null, и работает ваш прежний doGet.
   */
  function handleGet(e) {
    if (e && e.parameter && e.parameter.action === 'vbPing') {
      return jsonOut_({ ok: true, data: { service: 'vb-store-api', version: 1 } });
    }
    return null;
  }

  /** Запустите один раз вручную: создаст листы USERS и ORDERS и секреты шифрования. */
  function setup() {
    ensureUsersSheet_();
    ensureOrdersSheet_();
    getSecret_('TOKEN_SECRET');
    getSecret_('PASSWORD_PEPPER');
    var message = 'Готово: листы ' + CONFIG.USERS_SHEET + ' и ' + CONFIG.ORDERS_SHEET + ' созданы, секреты настроены.';
    Logger.log(message);
    return message;
  }

  /** Запустите вручную после подключения: проверяет, что каталог читается. */
  function selfTest() {
    var rows = loadCatalogRows_();
    var index = buildCatalogIndex_(rows);
    var message = 'Каталог прочитан: строк ' + rows.length + ', товаров ' + Object.keys(index).length + '.';
    Logger.log(message);
    return message;
  }

  return {
    handlePost: handlePost,
    handleGet: handleGet,
    setup: setup,
    selfTest: selfTest,
    // для автотестов
    _internals: {
      CONFIG: CONFIG,
      normalizePhone: normalizePhone_,
      buildCatalogIndex: buildCatalogIndex_
    }
  };
})();

// Функции верхнего уровня — их вызывают doGet / doPost вашего скрипта и кнопка «Выполнить».
function vbStoreHandlePost_(e) { return VBStoreApi.handlePost(e); }
function vbStoreHandleGet_(e) { return VBStoreApi.handleGet(e); }
function vbStoreSetup() { return VBStoreApi.setup(); }
function vbStoreSelfTest() { return VBStoreApi.selfTest(); }
