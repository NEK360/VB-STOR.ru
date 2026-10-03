import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Heart,
  Share2,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import {
  changeItemSize,
  clearPromoCode,
  moveToFavorites,
  removeItem,
  restoreItem,
  setAllSelected,
  setQuantity,
  setSelected,
  useCart,
  type CartItem,
} from "../lib/cart";
import { startCartCheckout } from "../lib/checkoutSession";
import { analytics } from "../lib/analytics";
import { isOrderable, issueText, resolveLines, type ResolvedLine } from "../lib/lines";
import { calculateTotals } from "../lib/pricing";
import { shareProductWithFeedback } from "../lib/share";
import { getMaxQuantity } from "../lib/stock";
import { toast } from "../lib/toast";
import { formatPrice, pluralize } from "../lib/utils";
import { useCatalog } from "../hooks/useCatalog";
import ItemMenu, { type MenuItem } from "../components/ui/ItemMenu";
import PromoModal from "../components/ui/PromoModal";
import PromoRow from "../components/ui/PromoRow";
import QuantityStepper from "../components/ui/QuantityStepper";
import SizeSheet from "../components/ui/SizeSheet";
import StickyBar from "../components/ui/StickyBar";

const itemsWord = (n: number) => `${n} ${pluralize(n, "товар", "товара", "товаров")}`;

export default function CartPage() {
  const navigate = useNavigate();
  const cart = useCart();
  const { catalog, loading } = useCatalog({ fresh: true });
  const [promoOpen, setPromoOpen] = useState(false);
  const [sizeKey, setSizeKey] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Корзина — VB STORE";
  }, []);

  const lines = useMemo(() => resolveLines(cart.items, catalog), [cart.items, catalog]);
  const orderableLines = lines.filter(isOrderable);
  const selectedLines = orderableLines.filter((line) => cart.isSelected(line.source.key));
  const allSelected =
    orderableLines.length > 0 && selectedLines.length === orderableLines.length;

  const totals = calculateTotals(
    selectedLines.map((line) => ({ price: line.price, quantity: line.source.quantity })),
    cart.promoCode
  );

  // Каталог обновился, а в корзине больше, чем осталось на складе — уменьшаем до доступного
  useEffect(() => {
    if (!catalog) return;
    let reduced = false;
    for (const line of lines) {
      if (!line.issue && line.max > 0 && line.source.quantity > line.max) {
        setQuantity(line.source.key, line.max, line.max);
        reduced = true;
      }
    }
    if (reduced) toast.info("Количество уменьшено до доступного в наличии");
  }, [catalog, lines]);

  const handleRemove = (line: ResolvedLine<CartItem>) => {
    const removed = removeItem(line.source.key);
    if (!removed) return;
    analytics.removeFromCart(line.source.productId);
    toast.info("Товар удалён из корзины", {
      action: { label: "Отменить", onClick: () => restoreItem(removed) },
    });
  };

  const handleFavorite = (line: ResolvedLine<CartItem>) => {
    const result = moveToFavorites(line.source.key);
    if (!result.moved) return;
    toast.success(
      result.alreadyFavorite
        ? "Товар уже был в избранном — убран из корзины"
        : "Товар перенесён в избранное",
      { action: { label: "Избранное", to: "/favorites" } }
    );
  };

  const handleLimit = (line: ResolvedLine<CartItem>) => {
    if (line.max <= 0) toast.info("Сейчас этого товара нет в наличии");
    else if (line.maxIsCap) toast.info(`Больше ${line.max} шт. в одной позиции добавить нельзя`);
    else toast.info(`В наличии только ${line.max} шт.`);
  };

  const handleCheckout = () => {
    if (selectedLines.length === 0) {
      toast.error(
        cart.items.length > 0 && orderableLines.length === 0
          ? "Товары из корзины сейчас нельзя заказать. Выберите другой размер или удалите их."
          : "Выберите товары для оформления заказа"
      );
      return;
    }
    startCartCheckout(selectedLines.map((line) => line.source));
    analytics.beginCheckout(totals.quantity, totals.total);
    navigate("/checkout");
  };

  const sizeLine = lines.find((line) => line.source.key === sizeKey) ?? null;
  const promo = totals.promo;
  const promoApplied = cart.promoCode !== null && promo !== null;

  if (cart.items.length === 0) {
    return (
      <main className="min-h-screen pb-[calc(var(--vb-mobile-nav-h,0px)+6rem)] pt-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h1 className="pb-5 pt-6 text-3xl font-black tracking-tight text-white sm:pt-10 sm:text-5xl">
            Корзина
          </h1>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-16 text-center"
          >
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
              <ShoppingBag size={32} className="text-white/25" />
            </div>
            <p className="mb-2 text-xl text-white/60">Корзина пуста</p>
            <p className="mb-8 text-sm text-white/30">
              Добавляйте товары из каталога — они появятся здесь
            </p>
            <Link
              to="/catalog"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 font-semibold text-black transition-all hover:bg-white/90"
            >
              Перейти в каталог
              <ArrowRight size={18} />
            </Link>
          </motion.div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-[calc(var(--vb-mobile-nav-h,0px)+7rem)] pt-20 lg:pb-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <header className="pb-5 pt-6 sm:pt-10">
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">Корзина</h1>
          <p className="mt-2 text-sm text-white/40">{itemsWord(cart.count)}</p>
        </header>

        {!loading && !catalog && (
          <p className="mb-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs leading-relaxed text-white/50">
            Не удалось проверить актуальные цены и наличие. Итоговая сумма будет подтверждена при
            оформлении заказа.
          </p>
        )}

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-8">
          <section aria-label="Товары в корзине">
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                role="checkbox"
                aria-checked={allSelected}
                disabled={orderableLines.length === 0}
                onClick={() =>
                  setAllSelected(
                    orderableLines.map((line) => line.source.key),
                    !allSelected
                  )
                }
                className="flex items-center gap-3 rounded-lg py-1.5 text-sm text-white/70 transition-colors hover:text-white disabled:opacity-40"
              >
                <CheckMark checked={allSelected} />
                Выбрать все
              </button>
              <span className="text-xs text-white/30">
                Выбрано: {selectedLines.reduce((sum, line) => sum + line.source.quantity, 0)}
              </span>
            </div>

            <ul className="flex flex-col gap-3">
              <AnimatePresence initial={false}>
                {lines.map((line) => (
                  <CartLine
                    key={line.source.key}
                    line={line}
                    selected={cart.isSelected(line.source.key)}
                    onToggle={(checked) => setSelected(line.source.key, checked)}
                    onQuantity={(next) => setQuantity(line.source.key, next, line.max)}
                    onRemove={() => handleRemove(line)}
                    onLimit={() => handleLimit(line)}
                    onShare={() =>
                      void shareProductWithFeedback({ id: line.source.productId, name: line.name })
                    }
                    onFavorite={() => handleFavorite(line)}
                    onPickSize={() => setSizeKey(line.source.key)}
                  />
                ))}
              </AnimatePresence>
            </ul>
          </section>

          <aside className="mt-4 flex flex-col gap-3 lg:sticky lg:top-24 lg:mt-0">
            {/* Промокоды */}
            <PromoRow
              promo={promoApplied ? promo : null}
              onOpen={() => setPromoOpen(true)}
              onClear={() => {
                clearPromoCode();
                toast.info("Промокод удалён");
              }}
            />

            {/* Итого */}
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/50">
                  Цена товаров ({itemsWord(totals.quantity)})
                </span>
                <span className="font-medium text-white">{formatPrice(totals.subtotal)}</span>
              </div>
              {totals.discount > 0 && (
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-white/50">Скидка</span>
                  <span className="font-medium text-emerald-400">
                    -{formatPrice(totals.discount)}
                  </span>
                </div>
              )}
              <div className="mt-3 flex items-baseline justify-between border-t border-white/8 pt-3">
                <span className="text-base font-semibold text-white">Итого</span>
                <span className="text-xl font-bold text-white">{formatPrice(totals.total)}</span>
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={selectedLines.length === 0}
                className="mt-4 hidden w-full rounded-2xl bg-white py-4 text-base font-bold text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50 lg:block"
              >
                Купить
              </button>
            </div>
          </aside>
        </div>
      </div>

      <StickyBar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-white/50">
            Итого · {itemsWord(totals.quantity)}
          </p>
          <p className="text-lg font-bold leading-tight text-white">{formatPrice(totals.total)}</p>
        </div>
        <button
          type="button"
          onClick={handleCheckout}
          disabled={selectedLines.length === 0}
          className="shrink-0 rounded-2xl bg-white px-8 py-3.5 text-sm font-bold text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Купить
        </button>
      </StickyBar>

      <PromoModal open={promoOpen} onClose={() => setPromoOpen(false)} />

      <SizeSheet
        open={sizeLine !== null && sizeLine.product !== null}
        product={sizeLine?.product ?? null}
        selectedSize={sizeLine?.source.size ?? null}
        price={sizeLine?.price}
        onClose={() => setSizeKey(null)}
        onSelect={(size) => {
          if (sizeLine?.product) {
            changeItemSize(sizeLine.source.key, size, getMaxQuantity(sizeLine.product, size));
          }
          setSizeKey(null);
        }}
      />
    </main>
  );
}

// ---------------------------------------------------------------------------

function CheckMark({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border transition-colors ${
        checked ? "border-white bg-white" : "border-white/30 bg-black/40"
      }`}
    >
      {checked && <Check size={14} strokeWidth={3} className="text-black" />}
    </span>
  );
}

interface CartLineProps {
  line: ResolvedLine<CartItem>;
  selected: boolean;
  onToggle: (checked: boolean) => void;
  onQuantity: (next: number) => void;
  onRemove: () => void;
  onLimit: () => void;
  onShare: () => void;
  onFavorite: () => void;
  onPickSize: () => void;
}

function CartLine({
  line,
  selected,
  onToggle,
  onQuantity,
  onRemove,
  onLimit,
  onShare,
  onFavorite,
  onPickSize,
}: CartLineProps) {
  const { source } = line;
  const orderable = isOrderable(line);
  const checked = selected && orderable;
  const href = `/catalog/${encodeURIComponent(source.productId)}`;
  const productMissing = line.issue === "product_missing";

  const menu: MenuItem[] = [
    ...(productMissing
      ? []
      : [
          {
            key: "share",
            label: "Поделиться",
            icon: <Share2 size={18} />,
            onSelect: onShare,
          },
          {
            key: "favorite",
            label: "Перенести в избранное",
            icon: <Heart size={18} />,
            onSelect: onFavorite,
          },
        ]),
    {
      key: "delete",
      label: "Удалить",
      icon: <Trash2 size={18} />,
      onSelect: onRemove,
      danger: true,
    },
  ];

  const canPickSize = line.product !== null && line.needsSize;

  return (
    <motion.li
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -32 }}
      transition={{ duration: 0.22 }}
      className={`glass flex gap-3 rounded-2xl p-3 sm:gap-4 sm:p-4 ${orderable ? "" : "opacity-80"}`}
    >
      {/* Миниатюра + галочка выбора */}
      <div className="relative h-[84px] w-[84px] shrink-0 sm:h-28 sm:w-28">
        <Link
          to={href}
          className="block h-full w-full overflow-hidden rounded-xl bg-white/5"
          aria-label={`Открыть товар: ${line.name}`}
        >
          {line.image ? (
            <img
              src={line.image}
              alt={line.name}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-3xl text-white/10">
              📦
            </span>
          )}
        </Link>
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          aria-label="Выбрать товар"
          disabled={!orderable}
          onClick={() => onToggle(!checked)}
          className="absolute left-0 top-0 flex h-10 w-10 items-start justify-start p-1.5 disabled:opacity-40"
        >
          <CheckMark checked={checked} />
        </button>
      </div>

      {/* Информация */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {line.brand && (
              <p className="truncate text-[11px] uppercase tracking-wider text-white/30">
                {line.brand}
              </p>
            )}
            <Link
              to={href}
              className="line-clamp-2 text-sm font-medium leading-snug text-white hover:text-white/80"
            >
              {line.name}
            </Link>
          </div>
          <ItemMenu items={menu} label={`Действия: ${line.name}`} />
        </div>

        {/* Размер / цвет */}
        {(source.size || source.color) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            {source.size &&
              (canPickSize ? (
                <button
                  type="button"
                  onClick={onPickSize}
                  className="-ml-1 inline-flex items-center gap-1 rounded-lg px-1 py-0.5 text-xs text-white/60 transition-colors hover:bg-white/8 hover:text-white"
                  aria-label={`Размер ${source.size}. Изменить размер`}
                >
                  <span>
                    Размер: <span className="font-semibold text-white">{source.size}</span>
                  </span>
                  <ChevronRight size={13} className="text-white/40" />
                </button>
              ) : (
                <span className="text-xs text-white/60">
                  Размер: <span className="font-semibold text-white">{source.size}</span>
                </span>
              ))}
            {source.color && (
              <span className="text-xs text-white/60">
                Цвет: <span className="text-white">{source.color}</span>
              </span>
            )}
          </div>
        )}

        {line.issue && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-xs font-medium text-rose-400" role="status">
              {issueText(line)}
            </p>
            {canPickSize && line.issue !== "product_missing" && (
              <button
                type="button"
                onClick={onPickSize}
                className="text-xs font-semibold text-white underline underline-offset-2"
              >
                Выбрать другой размер
              </button>
            )}
          </div>
        )}

        {/* Цена + количество */}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-2 pt-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-base font-bold text-white">{formatPrice(line.price)}</span>
              {line.oldPrice > line.price && (
                <span className="text-xs text-white/30 line-through">
                  {formatPrice(line.oldPrice)}
                </span>
              )}
            </div>
            {source.quantity > 1 && orderable && (
              <p className="text-xs text-white/40">
                Всего: {formatPrice(line.price * source.quantity)}
              </p>
            )}
          </div>

          <QuantityStepper
            quantity={source.quantity}
            max={line.max > 0 ? line.max : source.quantity}
            onChange={onQuantity}
            onRemove={onRemove}
            onLimit={onLimit}
          />
        </div>
      </div>
    </motion.li>
  );
}
