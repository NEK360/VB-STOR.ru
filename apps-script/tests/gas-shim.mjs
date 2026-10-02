// Минимальная имитация сервисов Google Apps Script, достаточная, чтобы запускать РЕАЛЬНЫЙ код
// apps-script/VBStoreApi.gs в Node.js. Поведение приближено к настоящему:
//  - байты хэшей — знаковые (как в Apps Script);
//  - в ячейки с форматом "General" строка вида "+79181234567" превращается в число (как в Google Таблицах);
//  - блокировка не реентерабельна — вложенный waitLock в тестах падает с ошибкой.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const GS_DIR = path.resolve(here, "..");

class FakeSheet {
  constructor(name) {
    this.name = name;
    this.cells = new Map(); // "r,c" -> { value, format }
    this.frozenRows = 0;
  }
  _key(r, c) { return `${r},${c}`; }
  _get(r, c) { return this.cells.get(this._key(r, c)); }
  _isEmpty(v) { return v === "" || v === null || v === undefined; }
  getLastRow() {
    let last = 0;
    for (const [key, cell] of this.cells) if (!this._isEmpty(cell.value)) last = Math.max(last, Number(key.split(",")[0]));
    return last;
  }
  getLastColumn() {
    let last = 0;
    for (const [key, cell] of this.cells) if (!this._isEmpty(cell.value)) last = Math.max(last, Number(key.split(",")[1]));
    return last;
  }
  getRange(row, col, numRows = 1, numCols = 1) { return new FakeRange(this, row, col, numRows, numCols); }
  setFrozenRows(n) { this.frozenRows = n; }
  setColumnWidth() {}
}

function coerce(value, format) {
  if (value instanceof Date || typeof value === "number" || typeof value === "boolean") return value;
  const text = String(value ?? "");
  if (format === "@") return text; // формат «обычный текст» — ничего не превращается
  // Google Таблицы разбирают строки как при ручном вводе
  if (/^[+-]?\d+(\.\d+)?$/.test(text.trim())) return Number(text);
  return text;
}

class FakeRange {
  constructor(sheet, row, col, numRows, numCols) {
    Object.assign(this, { sheet, row, col, numRows, numCols });
  }
  getValues() {
    const out = [];
    for (let r = 0; r < this.numRows; r++) {
      const line = [];
      for (let c = 0; c < this.numCols; c++) line.push(this.sheet._get(this.row + r, this.col + c)?.value ?? "");
      out.push(line);
    }
    return out;
  }
  getValue() { return this.getValues()[0][0]; }
  setValues(values) {
    values.forEach((line, r) =>
      line.forEach((value, c) => {
        const key = this.sheet._key(this.row + r, this.col + c);
        const format = this.sheet.cells.get(key)?.format ?? "General";
        this.sheet.cells.set(key, { value: coerce(value, format), format });
      })
    );
    return this;
  }
  setValue(value) { return this.setValues([[value]]); }
  setNumberFormats(formats) {
    formats.forEach((line, r) =>
      line.forEach((format, c) => {
        const key = this.sheet._key(this.row + r, this.col + c);
        const cell = this.sheet.cells.get(key) ?? { value: "" };
        this.sheet.cells.set(key, { ...cell, format });
      })
    );
    return this;
  }
  setFontWeight() { return this; }
  setWrap() { return this; }
}

class FakeSpreadsheet {
  constructor() { this.sheets = new Map(); }
  getSheetByName(name) { return this.sheets.get(name) ?? null; }
  insertSheet(name) {
    const sheet = new FakeSheet(name);
    this.sheets.set(name, sheet);
    return sheet;
  }
}

function signedBytes(buffer) {
  return Array.from(buffer, (b) => (b > 127 ? b - 256 : b));
}

/**
 * Создаёт «окружение Apps Script» с загруженным VBStoreApi.gs.
 * options.catalogRows — строки каталога, которые вернёт doGet(action=catalog).
 */
export function createGasEnv(options = {}) {
  const spreadsheet = new FakeSpreadsheet();
  const properties = new Map();
  const cache = new Map();
  const mails = [];
  let clockOffsetMs = 0;
  let lockHeld = false;
  let catalogRows = options.catalogRows ?? [];
  let catalogFails = false;

  class FakeDate extends Date {
    constructor(...args) {
      if (args.length === 0) super(Date.now() + clockOffsetMs);
      else super(...args);
    }
    static now() { return Date.now() + clockOffsetMs; }
  }

  const sandbox = {
    console,
    Logger: { log() {} },
    Date: FakeDate,
    Utilities: {
      DigestAlgorithm: { SHA_256: "SHA_256" },
      Charset: { UTF_8: "UTF_8" },
      computeHmacSha256Signature: (value, key) =>
        signedBytes(crypto.createHmac("sha256", String(key)).update(String(value)).digest()),
      computeDigest: (algorithm, value) => {
        if (algorithm !== "SHA_256") throw new Error("unsupported digest");
        return signedBytes(crypto.createHash("sha256").update(String(value)).digest());
      },
      getUuid: () => crypto.randomUUID(),
      formatDate: (date) => date.toISOString(),
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => (properties.has(k) ? properties.get(k) : null),
        setProperty: (k, v) => void properties.set(k, String(v)),
      }),
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => {
          const entry = cache.get(k);
          if (!entry) return null;
          if (entry.expires <= Date.now() + clockOffsetMs) { cache.delete(k); return null; }
          return entry.value;
        },
        put: (k, v, ttl = 600) => void cache.set(k, { value: String(v), expires: Date.now() + clockOffsetMs + ttl * 1000 }),
        remove: (k) => void cache.delete(k),
      }),
    },
    LockService: {
      getScriptLock: () => ({
        waitLock: () => {
          if (lockHeld) throw new Error("Вложенная блокировка: Apps Script так не умеет");
          lockHeld = true;
        },
        releaseLock: () => { lockHeld = false; },
      }),
    },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => spreadsheet,
      openById: () => spreadsheet,
    },
    ContentService: {
      MimeType: { JSON: "JSON" },
      createTextOutput: (text) => ({ setMimeType() { return this; }, getContent: () => text }),
    },
    Session: { getScriptTimeZone: () => "Europe/Moscow" },
    MailApp: { sendEmail: (message) => void mails.push(message) },
    // doGet вашего скрипта — здесь имитация: отдаёт каталог так же, как ?action=catalog
    __getCatalog: () => {
      if (catalogFails) throw new Error("catalog backend is down");
      return JSON.stringify(catalogRows);
    },
  };
  sandbox.globalThis = sandbox;

  vm.createContext(sandbox);
  vm.runInContext(
    `function doGet(e) {
       if (e && e.parameter && e.parameter.action === 'catalog') {
         return ContentService.createTextOutput(__getCatalog()).setMimeType(ContentService.MimeType.JSON);
       }
       return ContentService.createTextOutput('{}');
     }`,
    sandbox
  );
  vm.runInContext(fs.readFileSync(path.join(GS_DIR, "VBStoreApi.gs"), "utf8"), sandbox, { filename: "VBStoreApi.gs" });

  function call(body) {
    const output = sandbox.vbStoreHandlePost_({
      postData: { contents: typeof body === "string" ? body : JSON.stringify(body), type: "text/plain" },
    });
    return output ? JSON.parse(output.getContent()) : null;
  }

  return {
    sandbox,
    spreadsheet,
    properties,
    cache,
    mails,
    call,
    api: sandbox.VBStoreApi,
    sheet: (name) => spreadsheet.getSheetByName(name),
    /** Строки листа как массив объектов по заголовкам */
    rows(name) {
      const sheet = spreadsheet.getSheetByName(name);
      if (!sheet || sheet.getLastRow() < 2) return [];
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      return sheet
        .getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn())
        .getValues()
        .map((values) => Object.fromEntries(headers.map((h, i) => [h, values[i]])));
    },
    setCatalog(rows) { catalogRows = rows; },
    breakCatalog(value = true) { catalogFails = value; },
    advanceClock(ms) { clockOffsetMs += ms; },
  };
}

/** Ключ, который браузер получает из пароля (PBKDF2-SHA256, 150 000 итераций), — для тестов. */
export function derivePasswordProof(phone, password) {
  return crypto
    .pbkdf2Sync(password.normalize("NFKC"), `vb-store:v1:${phone}`, 150000, 32, "sha256")
    .toString("hex");
}

export function loadFixtureCatalog() {
  return JSON.parse(fs.readFileSync(path.join(here, "fixtures", "catalog.sample.json"), "utf8"));
}
