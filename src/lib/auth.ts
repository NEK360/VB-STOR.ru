import { ApiError, apiPost } from "./backend";
import { normalizePhone } from "./phone";
import { createStore, persistStore, readJSON, useStore } from "./store";

/**
 * Авторизация: телефон + пароль, сессия на токене.
 *
 * Безопасность:
 *  - пароль НИГДЕ не хранится и не отправляется в открытом виде: в браузере из него
 *    выводится ключ (PBKDF2-SHA256, 150 000 итераций, соль привязана к номеру),
 *    на сервер уходит только он. Сервер хранит лишь соль и хэш от этого ключа
 *    (HMAC-SHA256 с секретом, лежащим в свойствах скрипта, а не в таблице);
 *  - после входа сервер выдаёт подписанный токен с ограниченным сроком жизни.
 *    В localStorage хранится только токен и номер телефона.
 */

const SESSION_KEY = "vb_store_session";

/** Менять нельзя: от этих параметров зависит ключ, который проверяет сервер. */
const PBKDF2_ITERATIONS = 150_000;
const PBKDF2_SALT_PREFIX = "vb-store:v1:";

export const MIN_PASSWORD_LENGTH = 6;
export const MAX_PASSWORD_LENGTH = 128;

export interface Session {
  token: string;
  /** Нормализованный номер: +7XXXXXXXXXX */
  phone: string;
  /** Имя, сохранённое в профиле пользователя */
  name: string;
  /** Время окончания сессии, мс (0 — неизвестно) */
  expiresAt: number;
}

function parseSession(raw: unknown): Session | null {
  if (!raw || typeof raw !== "object") return null;
  const { token, phone, name, expiresAt } = raw as Partial<Session>;
  if (typeof token !== "string" || !token) return null;
  if (typeof phone !== "string" || !normalizePhone(phone)) return null;

  const expires = Number(expiresAt);
  if (Number.isFinite(expires) && expires > 0 && expires < Date.now()) return null;

  return {
    token,
    phone,
    name: typeof name === "string" ? name : "",
    expiresAt: Number.isFinite(expires) ? expires : 0,
  };
}

const sessionStore = createStore<Session | null>(parseSession(readJSON(SESSION_KEY)));
persistStore(sessionStore, SESSION_KEY, parseSession);

export function getSession(): Session | null {
  return sessionStore.get();
}

export function useAuth() {
  const session = useStore(sessionStore);
  return {
    session,
    phone: session?.phone ?? null,
    name: session?.name ?? "",
    token: session?.token ?? null,
    isAuthenticated: session !== null,
  };
}

async function derivePasswordProof(phone: string, password: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new ApiError("CRYPTO_UNAVAILABLE");

  const encoder = new TextEncoder();
  const keyMaterial = await subtle.importKey(
    "raw",
    encoder.encode(password.normalize("NFKC")),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: encoder.encode(PBKDF2_SALT_PREFIX + phone),
      iterations: PBKDF2_ITERATIONS,
    },
    keyMaterial,
    256
  );

  return Array.from(new Uint8Array(bits))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

interface AuthResponse {
  token: string;
  phone: string;
  name?: string;
  /** Unix-время в секундах */
  expiresAt: number;
}

function storeSession(response: AuthResponse): Session {
  const session = parseSession({
    token: response.token,
    phone: response.phone,
    name: response.name,
    expiresAt: Number(response.expiresAt) * 1000,
  });
  if (!session) throw new ApiError("BAD_RESPONSE");
  sessionStore.set(session);
  return session;
}

/** Регистрация. После успешной регистрации пользователь сразу входит в аккаунт. */
export async function registerUser(phoneInput: string, password: string): Promise<Session> {
  const phone = normalizePhone(phoneInput);
  if (!phone) throw new ApiError("INVALID_PHONE");

  const proof = await derivePasswordProof(phone, password);
  const response = await apiPost<AuthResponse>("register", { phone, proof }, { timeoutMs: 30_000 });
  return storeSession(response);
}

export async function loginUser(phoneInput: string, password: string): Promise<Session> {
  const phone = normalizePhone(phoneInput);
  if (!phone) throw new ApiError("INVALID_PHONE");

  const proof = await derivePasswordProof(phone, password);
  const response = await apiPost<AuthResponse>("login", { phone, proof }, { timeoutMs: 30_000 });
  return storeSession(response);
}

export function logoutUser(): void {
  sessionStore.set(null);
}

/**
 * Запрос от имени пользователя. Если сервер сообщил, что сессия недействительна,
 * она сбрасывается — интерфейс сразу предложит войти заново.
 */
export async function authedPost<T>(
  action: string,
  body: Record<string, unknown> = {},
  timeoutMs?: number
): Promise<T> {
  const session = sessionStore.get();
  if (!session) throw new ApiError("UNAUTHORIZED");

  try {
    return await apiPost<T>(action, body, { token: session.token, timeoutMs });
  } catch (error) {
    if (error instanceof ApiError && error.code === "UNAUTHORIZED") sessionStore.set(null);
    throw error;
  }
}

let validated = false;

/**
 * Один раз за загрузку страницы проверяет, что сохранённая сессия ещё жива.
 * Ошибки сети игнорируются (пользователь остаётся "вошедшим"), сбрасывается
 * сессия только если сервер явно ответил UNAUTHORIZED.
 */
export async function validateSession(): Promise<void> {
  if (validated || !sessionStore.get()) return;
  validated = true;
  try {
    const profile = await authedPost<{ phone: string; name?: string }>("me", {}, 15_000);
    const session = sessionStore.get();
    if (session) sessionStore.set({ ...session, name: profile.name ?? session.name });
  } catch {
    // ошибка сети / сервис недоступен — не мешаем пользователю
  }
}

/** Изменяет имя в профиле на сервере и синхронизирует его с текущей сессией. */
export async function updateProfileName(value: string): Promise<string> {
  const name = value.trim().replace(/\s+/g, " ");
  if (!name || name.length > 60) throw new ApiError("VALIDATION");

  const profile = await authedPost<{ name?: string }>("updateProfile", { name });
  const savedName = profile.name ?? name;
  const session = sessionStore.get();
  if (session) sessionStore.set({ ...session, name: savedName });
  return savedName;
}
