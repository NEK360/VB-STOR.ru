import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { EllipsisVertical } from "lucide-react";

export interface MenuItem {
  key: string;
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  danger?: boolean;
}

interface ItemMenuProps {
  items: MenuItem[];
  label?: string;
}

interface Position {
  right: number;
  top?: number;
  bottom?: number;
}

const ITEM_HEIGHT = 48;

/**
 * Кнопка «⋮» с небольшим меню действий.
 * Меню рисуется через portal и позиционируется по кнопке, поэтому его не
 * обрезают карточки с overflow и не перекрывают соседние элементы списка.
 */
export default function ItemMenu({ items, label = "Действия с товаром" }: ItemMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  const toggle = () => {
    if (open) {
      close();
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const menuHeight = items.length * ITEM_HEIGHT + 16;
    const fitsBelow = window.innerHeight - rect.bottom >= menuHeight + 16;
    setPosition({
      right: Math.max(8, window.innerWidth - rect.right),
      ...(fitsBelow
        ? { top: rect.bottom + 6 }
        : { bottom: window.innerHeight - rect.top + 6 }),
    });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;

    const focusTimer = window.setTimeout(() => {
      menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    }, 30);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        buttonRef.current?.focus();
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const nodes = Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []
      );
      if (nodes.length === 0) return;
      event.preventDefault();
      const current = nodes.indexOf(document.activeElement as HTMLElement);
      const next =
        event.key === "ArrowDown"
          ? (current + 1) % nodes.length
          : (current - 1 + nodes.length) % nodes.length;
      nodes[next].focus();
    };

    // Меню привязано к кнопке, поэтому при заметной прокрутке страницы или смене ширины
    // окна его проще закрыть. Мелкие сдвиги и смена только высоты (на телефоне так
    // «ездит» адресная строка браузера) меню не закрывают.
    const startY = window.scrollY;
    const startWidth = window.innerWidth;
    const onScroll = () => {
      if (Math.abs(window.scrollY - startY) > 24) close();
    };
    const onResize = () => {
      if (window.innerWidth !== startWidth) close();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, close]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        className={`-mr-1 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
          open ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/8 hover:text-white"
        }`}
      >
        <EllipsisVertical size={20} />
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && position && (
              <>
                {/* Прозрачная подложка: тап мимо меню закрывает его и не нажимает на элемент под ним */}
                <div className="fixed inset-0 z-[249]" onClick={close} aria-hidden="true" />

                <motion.div
                  ref={menuRef}
                  role="menu"
                  aria-label={label}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.12 }}
                  style={{
                    right: position.right,
                    top: position.top,
                    bottom: position.bottom,
                    transformOrigin: position.top !== undefined ? "top right" : "bottom right",
                  }}
                  className="fixed z-[250] w-[17rem] max-w-[calc(100vw-1rem)] rounded-2xl border border-white/12 bg-[#141414]/95 p-1.5 shadow-2xl backdrop-blur-xl"
                >
                  {items.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        close();
                        item.onSelect();
                      }}
                      className={`flex w-full items-center gap-3 whitespace-nowrap rounded-xl px-3 text-left text-sm transition-colors hover:bg-white/8 focus:bg-white/8 focus:outline-none ${
                        item.danger ? "text-rose-400" : "text-white"
                      }`}
                      style={{ height: ITEM_HEIGHT }}
                    >
                      <span className="shrink-0 opacity-80">{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
