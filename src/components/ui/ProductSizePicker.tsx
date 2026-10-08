import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Product } from "../../lib/api";
import { getProductMacroGroup, getShoeInsoleLength } from "../../lib/sizes";
import { getSizeInfo } from "../../lib/stock";

type Variant = "product" | "sheet";

type ProductSizePickerProps = {
  product: Pick<Product, "category" | "name" | "sizes">;
  selectedSize: string | null;
  onSelect: (size: string) => void;
  variant?: Variant;
};

/** Размеры товара; у доступной обуви 36–46 временно показывает длину стельки как WB. */
export default function ProductSizePicker({
  product,
  selectedSize,
  onSelect,
  variant = "product",
}: ProductSizePickerProps) {
  const [activeSize, setActiveSize] = useState<string | null>(null);
  const touchTimer = useRef<number | null>(null);
  const idPrefix = useId().replace(/:/g, "");
  const isShoe = getProductMacroGroup(product.category, product.name) === "shoes";

  const clearTouchTimer = () => {
    if (touchTimer.current !== null) {
      window.clearTimeout(touchTimer.current);
      touchTimer.current = null;
    }
  };

  const showTemporarily = (size: string, duration = 1400) => {
    clearTouchTimer();
    setActiveSize(size);
    touchTimer.current = window.setTimeout(() => {
      setActiveSize((current) => (current === size ? null : current));
      touchTimer.current = null;
    }, duration);
  };

  useEffect(() => () => {
    if (touchTimer.current !== null) window.clearTimeout(touchTimer.current);
  }, []);

  const chartSizeIndexes = isShoe
    ? product.sizes.reduce<number[]>((indexes, size, index) => {
        const info = getSizeInfo(size);
        const available = variant === "sheet" ? info.orderable : !info.unavailable;
        if (available && getShoeInsoleLength(size.value)) indexes.push(index);
        return indexes;
      }, [])
    : [];
  const hasChartSizes = chartSizeIndexes.length > 0;

  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label={isShoe ? "Размеры обуви" : "Размеры товара"}
    >
      {product.sizes.map((size, index) => {
        const info = getSizeInfo(size);
        const disabled = variant === "sheet" ? !info.orderable : info.unavailable;
        const isSelected = !disabled && String(selectedSize) === info.value;
        const insoleLength = isShoe ? getShoeInsoleLength(info.value) : null;
        const hasMeasurement = Boolean(insoleLength) && !disabled;
        const showTooltip = hasMeasurement && activeSize === info.value;
        const tooltipId = `${idPrefix}-shoe-size-${info.value.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

        const buttonClass = variant === "sheet"
          ? `min-w-[3.25rem] rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
              isSelected
                ? "border-white bg-white text-black"
                : disabled
                  ? "cursor-not-allowed border-white/5 bg-white/3 text-white/20 line-through"
                  : size.status === "low"
                    ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
                    : "border-white/20 bg-white/10 text-white hover:bg-white/20"
            }`
          : `rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
              isSelected
                ? "scale-105 border-white bg-white text-black"
                : disabled
                  ? "cursor-not-allowed border-white/5 bg-white/3 text-white/20 line-through"
                  : size.status === "low"
                    ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
                    : "border-white/20 bg-white/10 text-white hover:bg-white/20"
            }`;

        const tooltipAlign = index === chartSizeIndexes[0]
          ? "left-0"
          : index === chartSizeIndexes[chartSizeIndexes.length - 1]
            ? "right-0"
            : "left-1/2 -translate-x-1/2";

        return (
          <div
            key={info.value}
            className={`relative ${showTooltip ? "z-40" : "z-0"}`}
            onPointerEnter={(event) => {
              if (!hasMeasurement) return;
              if (event.pointerType === "mouse" || event.pointerType === "pen") {
                clearTouchTimer();
                setActiveSize(info.value);
              } else if (event.pointerType === "touch") {
                showTemporarily(info.value);
              }
            }}
            onPointerLeave={() => {
              clearTouchTimer();
              setActiveSize((current) => (current === info.value ? null : current));
            }}
          >
            <div
              className={`pointer-events-none absolute bottom-[calc(100%+9px)] z-[80] w-[148px] ${tooltipAlign}`}
            >
              <AnimatePresence>
                {showTooltip && (
                  <motion.div
                    key={`shoe-size-tooltip-${info.value}`}
                    id={tooltipId}
                    role="tooltip"
                    initial={{ opacity: 0, y: 7, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.96 }}
                    transition={{ duration: 0.16, ease: "easeOut" }}
                    className="relative overflow-visible rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-zinc-950 shadow-[0_10px_28px_rgba(0,0,0,0.28)]"
                  >
                    <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-gradient-to-r from-[#cb11ab] to-[#ff4d8d]" />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                        Размер
                      </span>
                      <span className="rounded-md bg-[#cb11ab]/10 px-1.5 py-0.5 text-[11px] font-bold text-[#a30d89]">
                        {info.value}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-baseline gap-1">
                      <span className="text-xl font-extrabold leading-none tracking-tight">
                        {insoleLength}
                      </span>
                      <span className="text-xs font-medium text-zinc-500">см</span>
                    </div>
                    <p className="mt-1 text-[10px] leading-tight text-zinc-500">
                      Длина стельки
                    </p>
                    <span className="absolute -bottom-1 left-5 h-2 w-2 rotate-45 border-b border-r border-zinc-200 bg-white" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect(info.value)}
              onPointerDown={(event) => {
                if (hasMeasurement && event.pointerType === "touch") {
                  showTemporarily(info.value);
                }
              }}
              onPointerUp={(event) => {
                if (hasMeasurement && event.pointerType === "touch") {
                  showTemporarily(info.value, 1000);
                }
              }}
              onPointerCancel={() => {
                clearTouchTimer();
                setActiveSize((current) => (current === info.value ? null : current));
              }}
              onFocus={(event) => {
                if (hasMeasurement && event.currentTarget.matches(":focus-visible")) {
                  clearTouchTimer();
                  setActiveSize(info.value);
                }
              }}
              onBlur={() => {
                clearTouchTimer();
                setActiveSize((current) => (current === info.value ? null : current));
              }}
              aria-pressed={isSelected}
              aria-disabled={disabled}
              aria-describedby={showTooltip ? tooltipId : undefined}
              className={buttonClass}
            >
              {info.value}
            </button>
          </div>
        );
      })}
      {variant === "product" && hasChartSizes && (
        <p className="basis-full pt-0.5 text-[11px] leading-snug text-white/35">
          Нажмите или наведите на размер — покажем длину стельки
        </p>
      )}
    </div>
  );
}
