import { createStore } from "./store";

export type ToastType = "success" | "error" | "info";

export interface ToastAction {
  label: string;
  /** Внутренняя ссылка роутера, например "/cart" */
  to?: string;
  onClick?: () => void;
}

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  action?: ToastAction;
}

interface ToastOptions {
  type?: ToastType;
  /** мс; по умолчанию 3500 (с кнопкой действия — 5500) */
  duration?: number;
  action?: ToastAction;
}

const MAX_VISIBLE = 3;

export const toastStore = createStore<ToastItem[]>([]);

let nextId = 1;
const timers = new Map<number, ReturnType<typeof setTimeout>>();

export function dismissToast(id: number): void {
  const timer = timers.get(id);
  if (timer) clearTimeout(timer);
  timers.delete(id);
  toastStore.set((prev) => prev.filter((t) => t.id !== id));
}

export function showToast(message: string, options: ToastOptions = {}): number {
  const id = nextId++;
  const type = options.type ?? "info";
  const duration = options.duration ?? (options.action ? 5500 : 3500);

  toastStore.set((prev) => {
    // одинаковое сообщение подряд не дублируем
    const withoutDuplicate = prev.filter((t) => t.message !== message);
    return [...withoutDuplicate, { id, message, type, action: options.action }].slice(
      -MAX_VISIBLE
    );
  });

  timers.set(
    id,
    setTimeout(() => dismissToast(id), duration)
  );
  return id;
}

export const toast = {
  success: (message: string, options?: Omit<ToastOptions, "type">) =>
    showToast(message, { ...options, type: "success" }),
  error: (message: string, options?: Omit<ToastOptions, "type">) =>
    showToast(message, { ...options, type: "error" }),
  info: (message: string, options?: Omit<ToastOptions, "type">) =>
    showToast(message, { ...options, type: "info" }),
};
