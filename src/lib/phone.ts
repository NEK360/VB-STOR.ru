/**
 * Работа с российскими номерами телефонов.
 *
 * Единый формат хранения (и на сайте, и в таблице ORDERS/USERS): +7XXXXXXXXXX.
 * Единый формат показа: +7 (918) 123-45-67.
 *
 * Принимаются любые привычные варианты ввода:
 *   +7 (918) 123-45-67 · 8 918 123 45 67 · 89181234567 · 9181234567
 */

/** Приводит ввод к 11 цифрам с кодом страны 7 (без проверки валидности). */
function toCanonicalDigits(raw: string): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits[0] === "7") return digits.slice(0, 11);
  if (digits[0] === "8") return ("7" + digits.slice(1)).slice(0, 11);
  return ("7" + digits).slice(0, 11);
}

/**
 * Возвращает номер в формате +7XXXXXXXXXX или null, если номер некорректен.
 * Российские номера: код страны +7, затем 10 цифр, первая из которых 3, 4, 8 или 9
 * (3xx/4xx/8xx — городские коды, 9xx — мобильные).
 */
export function normalizePhone(input: string): string | null {
  const raw = String(input ?? "").replace(/\D/g, "");

  let canonical: string;
  if (raw.length === 11 && (raw[0] === "7" || raw[0] === "8")) {
    canonical = "7" + raw.slice(1); // 8 918… и 7 918… → 7918…
  } else if (raw.length === 10) {
    canonical = "7" + raw; // 918… без кода страны
  } else {
    return null; // любое другое количество цифр (в т.ч. иностранные номера) — не принимаем
  }

  if (!/^7[3489]\d{9}$/.test(canonical)) return null;
  return `+${canonical}`;
}

export function isValidPhone(input: string): boolean {
  return normalizePhone(input) !== null;
}

/** +79181234567 → +7 (918) 123-45-67 */
export function formatPhone(normalized: string | null | undefined): string {
  const digits = toCanonicalDigits(normalized ?? "");
  if (digits.length !== 11) return String(normalized ?? "");
  return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
}

function maskCanonical(canonical: string): string {
  if (!canonical) return "";
  const national = canonical.slice(1);
  let out = "+7 (" + national.slice(0, 3);
  if (national.length > 3) out += ") " + national.slice(3, 6);
  if (national.length > 6) out += "-" + national.slice(6, 8);
  if (national.length > 8) out += "-" + national.slice(8, 10);
  return out;
}

/**
 * Маска для поля ввода телефона. `previous` — прошлое значение поля: нужно,
 * чтобы корректно работал Backspace (удаление символа-разделителя удаляет
 * последнюю цифру, а не "залипает").
 */
export function maskPhoneInput(next: string, previous = ""): string {
  const nextDigits = String(next ?? "").replace(/\D/g, "");

  if (next.length < previous.length) {
    // пользователь стирает: остался только код страны — очищаем поле целиком
    if (nextDigits === "" || nextDigits === "7" || nextDigits === "8") return "";
    // стёрт разделитель "(", ")", "-", " " — удаляем последнюю цифру
    if (nextDigits === String(previous).replace(/\D/g, "")) {
      const canonical = toCanonicalDigits(previous).slice(0, -1);
      return canonical.length <= 1 ? "" : maskCanonical(canonical);
    }
  }

  return maskCanonical(toCanonicalDigits(next));
}
