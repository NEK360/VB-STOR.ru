import type { Product } from "./api";
import { toast } from "./toast";

/**
 * ЕДИНСТВЕННАЯ реализация «Поделиться» на сайте.
 * Используется и на карточке товара, и в меню «⋮» в корзине.
 *
 * Логика прежняя: системное меню «Поделиться» (Web Share API), а если оно
 * недоступно — ссылка копируется в буфер обмена. Ссылка всегда ведёт на
 * конкретную карточку товара.
 */

export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

/**
 * Ссылка на карточку товара. Сайт работает на HashRouter, поэтому рабочая
 * ссылка выглядит как https://домен/#/catalog/ID (ровно так же, как адрес
 * в браузере на странице товара).
 */
export function getProductUrl(productId: string): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#/catalog/${encodeURIComponent(String(productId))}`;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // нет прав / небезопасный контекст — пробуем запасной способ
  }

  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    area.style.pointerEvents = "none";
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

export async function shareProduct(product: Pick<Product, "id" | "name">): Promise<ShareResult> {
  const url = getProductUrl(product.id);
  const data = { title: product.name, url };

  // navigator.share нужно вызвать сразу, пока действует жест пользователя
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share(data);
      return "shared";
    } catch (error) {
      if ((error as { name?: string } | null)?.name === "AbortError") return "cancelled";
      // любая другая ошибка — падаем в копирование ссылки
    }
  }

  return (await copyToClipboard(url)) ? "copied" : "failed";
}

/** Поделиться + одинаковые уведомления для всех мест, где есть кнопка «Поделиться». */
export async function shareProductWithFeedback(
  product: Pick<Product, "id" | "name">
): Promise<ShareResult> {
  const result = await shareProduct(product);

  if (result === "copied") {
    toast.success("Ссылка на товар скопирована");
  } else if (result === "failed") {
    toast.error("Не удалось поделиться. Скопируйте ссылку из адресной строки браузера.");
  }
  return result;
}
