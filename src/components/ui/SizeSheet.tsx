import { useEffect, useMemo, useState } from "react";
import type { Product } from "../../lib/api";
import { getProductMacroGroup, getShoeInsoleLength } from "../../lib/sizes";
import { formatPrice } from "../../lib/utils";
import { getSizeInfo } from "../../lib/stock";
import ProductSizePicker from "./ProductSizePicker";
import Sheet from "./Sheet";

interface SizeSheetProps {
  open: boolean;
  product: Product | null;
  selectedSize: string | null;
  /** Подтверждает выбор размера; для обуви вызывается после просмотра подсказки */
  onSelect: (size: string) => void;
  onClose: () => void;
  /** Цена, которую показываем в шапке шторки (по умолчанию — цена товара) */
  price?: number;
}

/**
 * Шторка «Выберите размер».
 * Размеры берутся из данных товара. Выбрать можно только размеры, которые
 * реально есть в магазине (остаток stockOffline); остальные показаны, но
 * недоступны — как на карточке товара.
 */
export default function SizeSheet({
  open,
  product,
  selectedSize,
  onSelect,
  onClose,
  price,
}: SizeSheetProps) {
  const sizes = useMemo(
    () => (product ? product.sizes.map((size) => ({ size, info: getSizeInfo(size) })) : []),
    [product]
  );
  const [draftSize, setDraftSize] = useState(selectedSize);

  useEffect(() => {
    if (open) setDraftSize(selectedSize);
  }, [open, product?.id, selectedSize]);

  const hasOrderable = sizes.some(({ info }) => info.orderable);
  const hasWbOnly = sizes.some(({ info }) => info.wbOnly);
  const isShoe = Boolean(
    product && getProductMacroGroup(product.category, product.name) === "shoes"
  );
  const hasInsoleChart = Boolean(
    isShoe && sizes.some(({ size }) =>
      size.status !== "unavailable" && getShoeInsoleLength(size.value)
    )
  );
  const draftInfo = sizes.find(({ info }) => info.value === draftSize)?.info;
  const draftInsoleLength = draftSize ? getShoeInsoleLength(draftSize) : null;

  const handleSizeSelect = (size: string) => {
    if (hasInsoleChart && getShoeInsoleLength(size)) {
      setDraftSize(size);
      return;
    }
    onSelect(size);
  };

  const confirmFooter =
    hasInsoleChart && draftSize && draftInsoleLength && draftInfo?.orderable ? (
    <button
      type="button"
      onClick={() => {
        if (draftSize) onSelect(draftSize);
      }}
      className="w-full rounded-xl bg-white px-4 py-3 text-sm font-bold text-black transition-colors hover:bg-white/90"
    >
      <span className="block">Выбрать размер {draftSize}</span>
      {draftInsoleLength && (
        <span className="mt-0.5 block text-xs font-normal text-black/55">
          Длина стельки — {draftInsoleLength} см
        </span>
      )}
    </button>
  ) : undefined;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Выберите размер"
      footer={confirmFooter}
    >
      {product && (
        <>
          <div className="mb-5 flex items-center gap-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white/5">
              {product.images?.[0] && (
                <img
                  src={product.images[0]}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              )}
            </div>
            <div className="min-w-0">
              <p className="line-clamp-2 text-sm leading-snug text-white/80">{product.name}</p>
              <p className="mt-0.5 text-sm font-bold text-white">
                {formatPrice(price ?? product.price)}
              </p>
            </div>
          </div>

          {sizes.length > 0 && (
            <ProductSizePicker
              product={product}
              selectedSize={hasInsoleChart ? draftSize : selectedSize}
              onSelect={handleSizeSelect}
              variant="sheet"
            />
          )}
          {hasInsoleChart && (
            <p className="mt-2 text-xs leading-relaxed text-white/40">
              Выберите размер, чтобы увидеть длину стельки, затем подтвердите выбор кнопкой ниже.
            </p>
          )}

          {!hasOrderable && (
            <p className="mt-4 text-sm text-rose-300" role="status">
              Сейчас нет размеров, которые можно заказать на сайте.
            </p>
          )}

          {hasOrderable && hasWbOnly && (
            <p className="mt-4 text-xs leading-relaxed text-white/40">
              Зачёркнутые размеры недоступны для заказа на сайте (часть из них есть на
              Wildberries — ссылка на карточке товара).
            </p>
          )}

          {product.sizes.some((s) => s.status === "low") && hasOrderable && (
            <p className="mt-2 text-xs text-yellow-400/80">Жёлтым отмечены размеры, которых осталось мало.</p>
          )}
        </>
      )}
    </Sheet>
  );
}
