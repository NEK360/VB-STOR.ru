import { Minus, Plus, Trash2 } from "lucide-react";

interface QuantityStepperProps {
  quantity: number;
  /** Максимум, который можно заказать */
  max: number;
  onChange: (next: number) => void;
  /** Нажатие «−» при количестве 1 удаляет позицию (с возможностью отмены) */
  onRemove: () => void;
  /** Нажатие «+» на максимуме — сообщить, что больше нет в наличии */
  onLimit: () => void;
  disabled?: boolean;
}

/** Счётчик количества [−] N [+] в стиле сайта. Кнопки 36×36 — удобно нажимать пальцем. */
export default function QuantityStepper({
  quantity,
  max,
  onChange,
  onRemove,
  onLimit,
  disabled = false,
}: QuantityStepperProps) {
  const atMax = quantity >= max;

  return (
    <div
      className="inline-flex shrink-0 items-center rounded-xl border border-white/10 bg-white/6"
      role="group"
      aria-label="Количество"
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => (quantity <= 1 ? onRemove() : onChange(quantity - 1))}
        className="flex h-9 w-9 items-center justify-center rounded-l-xl text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
        aria-label={quantity <= 1 ? "Удалить товар из корзины" : "Уменьшить количество"}
      >
        {quantity <= 1 ? <Trash2 size={15} /> : <Minus size={15} />}
      </button>

      <span
        className="min-w-[1.75rem] select-none text-center text-sm font-semibold tabular-nums text-white"
        aria-live="polite"
        aria-label={`Количество: ${quantity}`}
      >
        {quantity}
      </span>

      <button
        type="button"
        disabled={disabled}
        onClick={() => (atMax ? onLimit() : onChange(quantity + 1))}
        aria-disabled={atMax}
        className={`flex h-9 w-9 items-center justify-center rounded-r-xl transition-colors hover:bg-white/10 disabled:opacity-40 ${
          atMax ? "text-white/25" : "text-white/70 hover:text-white"
        }`}
        aria-label="Увеличить количество"
      >
        <Plus size={15} />
      </button>
    </div>
  );
}
