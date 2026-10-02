import { ChevronRight, TicketPercent, X } from "lucide-react";
import type { PromoDefinition } from "../../lib/promo";

interface PromoRowProps {
  /** Применённый промокод (null — не применён) */
  promo: PromoDefinition | null;
  onOpen: () => void;
  onClear: () => void;
}

/**
 * Строка «Промокоды». Пока промокод не применён — открывает окно ввода;
 * после применения показывает «Промокод VB5» и «-5%».
 * Общая для корзины и оформления заказа.
 */
export default function PromoRow({ promo, onOpen, onClear }: PromoRowProps) {
  return (
    <div className="glass flex items-center rounded-2xl">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5 text-left"
      >
        <TicketPercent size={20} className="shrink-0 text-white/50" />
        {promo ? (
          <>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">
              Промокод {promo.code}
            </span>
            <span className="shrink-0 text-sm font-semibold text-emerald-400">
              -{promo.percent}%
            </span>
          </>
        ) : (
          <>
            <span className="flex-1 text-sm font-medium text-white">Промокоды</span>
            <ChevronRight size={18} className="shrink-0 text-white/30" />
          </>
        )}
      </button>

      {promo && (
        <button
          type="button"
          onClick={onClear}
          className="mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white/40 transition-colors hover:text-white"
          aria-label="Удалить промокод"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
