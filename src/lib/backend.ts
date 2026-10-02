import { BACKEND_URL } from "./config";

/**
 * Клиент для backend на Google Apps Script (пользователи и заказы).
 *
 * Запросы отправляются POST-ом с Content-Type: text/plain — это "простой"
 * запрос, для которого браузер не делает CORS-preflight (Apps Script не умеет
 * отвечать на OPTIONS). Токен сессии передаётся в теле запроса.
 *
 * Все ошибки превращаются в ApiError с понятным русским текстом: пользователь
 * никогда не увидит "undefined", "Cannot read properties…" или "500".
 */

const GENERIC_UNAVAILABLE =
  "Сервис временно недоступен. Попробуйте позже или свяжитесь с нами в мессенджерах.";

const MESSAGES: Record<string, string> = {
  NETWORK: "Не удалось подключиться к серверу. Проверьте интернет-соединение и попробуйте ещё раз.",
  TIMEOUT: "Сервер слишком долго отвечает. Попробуйте ещё раз через минуту.",
  BAD_RESPONSE: GENERIC_UNAVAILABLE,
  SERVER_ERROR: GENERIC_UNAVAILABLE,
  CRYPTO_UNAVAILABLE:
    "Ваш браузер не поддерживает безопасный вход. Откройте сайт по защищённому адресу (https) или обновите браузер.",
  UNAUTHORIZED: "Нужно войти в аккаунт. Войдите или зарегистрируйтесь.",
  INVALID_PHONE: "Введите корректный российский номер телефона, например +7 (918) 123-45-67.",
  VALIDATION: "Проверьте введённые данные и попробуйте ещё раз.",
  PHONE_EXISTS: "Этот номер уже зарегистрирован. Войдите, используя свой пароль.",
  INVALID_CREDENTIALS: "Неверный номер телефона или пароль.",
  TOO_MANY_ATTEMPTS: "Слишком много неудачных попыток. Попробуйте снова через несколько минут.",
  EMPTY_CART: "Корзина пуста. Добавьте товары, чтобы оформить заказ.",
  PRODUCT_NOT_FOUND: "Один из товаров больше недоступен. Проверьте корзину.",
  SIZE_UNAVAILABLE: "Выбранный размер недоступен. Выберите другой размер.",
  OUT_OF_STOCK:
    "Товара нет в наличии в нужном количестве. Уменьшите количество или выберите другой размер.",
  PRICE_CHANGED: "Цена или скидка изменились. Проверьте сумму заказа и нажмите «Заказать» ещё раз.",
  PROMO_INVALID: "Такого промокода не существует.",
  DELIVERY_INVALID: "Выберите способ доставки и адрес пункта выдачи или службу доставки.",
  PAYMENT_NOT_ALLOWED: "Выбранный способ оплаты недоступен для этого способа доставки.",
  ORDER_FAILED: "Не удалось оформить заказ. Попробуйте ещё раз или свяжитесь с нами.",
};

/** Для этих кодов сервер знает название товара и размер — показываем его пояснение. */
const SERVER_MESSAGE_CODES = new Set(["OUT_OF_STOCK", "SIZE_UNAVAILABLE", "PRODUCT_NOT_FOUND"]);

export interface ApiErrorDetails {
  [key: string]: unknown;
}

export class ApiError extends Error {
  readonly code: string;
  readonly details?: ApiErrorDetails;

  constructor(code: string, details?: ApiErrorDetails, serverMessage?: string) {
    const friendly =
      SERVER_MESSAGE_CODES.has(code) &&
      typeof serverMessage === "string" &&
      serverMessage.length > 0 &&
      serverMessage.length <= 240
        ? serverMessage
        : MESSAGES[code] ?? GENERIC_UNAVAILABLE;
    super(friendly);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
  }
}

/** Безопасный текст ошибки для показа пользователю — всегда на русском и без технических деталей. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "Что-то пошло не так. Попробуйте ещё раз.";
}

interface RequestOptions {
  token?: string | null;
  timeoutMs?: number;
}

interface ApiEnvelope<T> {
  ok?: boolean;
  data?: T;
  error?: { code?: string; message?: string; details?: ApiErrorDetails };
}

export async function apiPost<T>(
  action: string,
  body: Record<string, unknown> = {},
  options: RequestOptions = {}
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000);

  try {
    let response: Response;
    try {
      response = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action, ...body, token: options.token ?? undefined }),
        signal: controller.signal,
        redirect: "follow",
      });
    } catch {
      throw new ApiError(controller.signal.aborted ? "TIMEOUT" : "NETWORK");
    }

    let payload: ApiEnvelope<T> | null;
    try {
      payload = (await response.json()) as ApiEnvelope<T>;
    } catch {
      // Google вернул HTML-страницу (например, скрипт ещё не опубликован) вместо JSON
      throw new ApiError(controller.signal.aborted ? "TIMEOUT" : "BAD_RESPONSE");
    }

    if (!payload || typeof payload !== "object") throw new ApiError("BAD_RESPONSE");
    if (payload.ok === true) return payload.data as T;

    const error = payload.error ?? {};
    throw new ApiError(String(error.code || "SERVER_ERROR"), error.details, error.message);
  } finally {
    clearTimeout(timer);
  }
}
