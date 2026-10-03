import { useEffect, useRef, useState, type FormEvent } from "react";
import { applyPromoCode } from "../../lib/cart";
import { analytics } from "../../lib/analytics";
import { toast } from "../../lib/toast";
import Sheet from "./Sheet";

interface PromoModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Модальное окно «Введите промокод».
 * Промокод применяется только если он существует в системе (lib/promo.ts) —
 * проверка и сохранение выполняются единой функцией applyPromoCode.
 */
export default function PromoModal({ open, onClose }: PromoModalProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue("");
      setError("");
      const timer = window.setTimeout(() => inputRef.current?.focus(), 120);
      return () => window.clearTimeout(timer);
    }
  }, [open]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = applyPromoCode(value);

    if (!result.ok) {
      setError(
        result.reason === "empty" ? "Введите промокод" : "Такого промокода не существует"
      );
      analytics.applyPromo(value.trim(), false);
      return;
    }

    analytics.applyPromo(result.promo.code, true);
    toast.success(`Промокод ${result.promo.code} применён: -${result.promo.percent}%`);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Введите промокод" variant="dialog">
      <form onSubmit={submit} noValidate className="flex flex-col gap-3">
        <div>
          <label htmlFor="promo-input" className="sr-only">
            Промокод
          </label>
          <input
            ref={inputRef}
            id="promo-input"
            type="text"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              if (error) setError("");
            }}
            placeholder="Например, PROMO15"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            enterKeyHint="done"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "promo-error" : undefined}
            className={`w-full rounded-xl border bg-white/5 px-4 py-3.5 text-base uppercase tracking-wide text-white outline-none transition-colors placeholder:normal-case placeholder:tracking-normal placeholder:text-white/25 focus:border-white/30 ${
              error ? "border-rose-400/70" : "border-white/10"
            }`}
          />
          {error && (
            <p id="promo-error" role="alert" className="mt-2 text-sm text-rose-400">
              {error}
            </p>
          )}
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-white py-3.5 text-sm font-semibold text-black transition-colors hover:bg-white/90"
        >
          Применить
        </button>
      </form>
    </Sheet>
  );
}
