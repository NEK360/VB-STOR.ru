import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { useStore } from "../../lib/store";
import { dismissToast, toastStore, type ToastType } from "../../lib/toast";

const ICONS: Record<ToastType, { icon: typeof Info; className: string }> = {
  success: { icon: CircleCheck, className: "text-emerald-400" },
  error: { icon: CircleAlert, className: "text-rose-400" },
  info: { icon: Info, className: "text-white/60" },
};

/**
 * Всплывающие уведомления. Показываются сверху (под шапкой), чтобы не
 * перекрывать нижнюю навигацию и закреплённые панели «Итого / Заказать».
 */
export default function Toaster() {
  const toasts = useStore(toastStore);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 top-[4.5rem] z-[400] flex flex-col items-center gap-2 px-3"
      role="region"
      aria-label="Уведомления"
    >
      <AnimatePresence initial={false}>
        {toasts.map((item) => {
          const { icon: Icon, className } = ICONS[item.type];
          return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: -14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              role={item.type === "error" ? "alert" : "status"}
              className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-white/15 bg-[#141414]/95 py-2.5 pl-4 pr-2 shadow-2xl backdrop-blur-xl"
            >
              <Icon size={18} className={`shrink-0 ${className}`} />
              <p className="min-w-0 flex-1 text-sm leading-snug text-white">{item.message}</p>

              {item.action &&
                (item.action.to ? (
                  <Link
                    to={item.action.to}
                    onClick={() => {
                      item.action?.onClick?.();
                      dismissToast(item.id);
                    }}
                    className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-white/90"
                  >
                    {item.action.label}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      item.action?.onClick?.();
                      dismissToast(item.id);
                    }}
                    className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-white/90"
                  >
                    {item.action.label}
                  </button>
                ))}

              <button
                type="button"
                onClick={() => dismissToast(item.id)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/40 transition-colors hover:text-white"
                aria-label="Закрыть уведомление"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>,
    document.body
  );
}
