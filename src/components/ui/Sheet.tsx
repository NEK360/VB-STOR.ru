import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

/**
 * Модальное окно / нижняя шторка в стиле сайта (как OrderModal и SearchModal).
 *
 *  - variant="sheet"  — на телефоне выезжает снизу, на компьютере по центру;
 *  - variant="dialog" — небольшое окно по центру (например, ввод промокода).
 *
 * Рендерится через portal в <body>, поэтому не зависит от transform/overflow
 * родителей и перекрывает шапку и нижнюю навигацию (z-[300]).
 * При открытии прокрутка страницы блокируется с компенсацией ширины скроллбара —
 * вёрстка не «прыгает».
 */

let lockCount = 0;
let savedOverflow = "";
let savedPaddingRight = "";

function lockScroll() {
  if (lockCount++ > 0) return;
  const { body, documentElement } = document;
  const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
  savedOverflow = body.style.overflow;
  savedPaddingRight = body.style.paddingRight;
  body.style.overflow = "hidden";
  if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
}

function unlockScroll() {
  if (--lockCount > 0) return;
  lockCount = 0;
  document.body.style.overflow = savedOverflow;
  document.body.style.paddingRight = savedPaddingRight;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Скрыть заголовок визуально (остаётся для скринридеров) */
  hideTitle?: boolean;
  variant?: "sheet" | "dialog";
  children: ReactNode;
  /** Закреплённая нижняя часть (например, кнопка) */
  footer?: ReactNode;
}

export default function Sheet({
  open,
  onClose,
  title,
  hideTitle = false,
  variant = "sheet",
  children,
  footer,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    lockScroll();
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusTimer = window.setTimeout(() => panelRef.current?.focus(), 30);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === panelRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      unlockScroll();
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (typeof document === "undefined") return null;

  const isSheet = variant === "sheet";

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="sheet-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className={`fixed inset-0 z-[300] flex justify-center ${
            isSheet ? "items-end sm:items-center sm:p-4" : "items-center p-4"
          }`}
        >
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            onClick={() => onCloseRef.current()}
            aria-hidden="true"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            initial={isSheet ? { opacity: 0, y: 48 } : { opacity: 0, scale: 0.96 }}
            animate={isSheet ? { opacity: 1, y: 0 } : { opacity: 1, scale: 1 }}
            exit={isSheet ? { opacity: 0, y: 48 } : { opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className={`relative flex w-full flex-col overflow-hidden glass bg-[#0c0c0c]/95 outline-none ${
              isSheet
                ? "max-h-[88dvh] rounded-t-3xl sm:max-w-md sm:rounded-3xl"
                : "max-h-[88dvh] max-w-sm rounded-3xl"
            }`}
          >
            {isSheet && (
              <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-white/20 sm:hidden" />
            )}

            <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-5">
              <h2
                className={`text-lg font-bold leading-tight text-white ${hideTitle ? "sr-only" : ""}`}
              >
                {title}
              </h2>
              <button
                type="button"
                onClick={() => onCloseRef.current()}
                className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/8 text-white/60 transition-colors hover:text-white"
                aria-label="Закрыть"
              >
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-1">
              {children}
            </div>

            {footer && (
              <div className="shrink-0 border-t border-white/8 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
