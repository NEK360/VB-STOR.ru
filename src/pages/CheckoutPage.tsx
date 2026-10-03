import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  LoaderCircle,
  MapPin,
  Truck,
  UserRound,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { ApiError, getErrorMessage } from "../lib/backend";
import { clearPromoCode, removeOrdered, useCart, type OrderedLineRef } from "../lib/cart";
import {
  changeLineSize,
  clearCheckoutSession,
  removeCheckoutLine,
  setDelivery,
  setPayment,
  useCheckoutSession,
  type CheckoutLine,
} from "../lib/checkoutSession";
import {
  DELIVERY_TYPE_LABELS,
  getAvailablePaymentMethods,
  getDeliveryPriceLabel,
  getRussiaPriceFromLabel,
  PAYMENT_LABELS,
  PICKUP_POINTS,
  PICKUP_PRICE_LABEL,
  RUSSIA_SERVICES,
  type DeliveryType,
} from "../lib/delivery";
import { analytics } from "../lib/analytics";
import { isOrderable, issueText, resolveLines, type ResolvedLine } from "../lib/lines";
import { createOrder, createRequestId, type CreateOrderInput } from "../lib/orders";
import { calculateTotals } from "../lib/pricing";
import { formatPhone } from "../lib/phone";
import { getMaxQuantity } from "../lib/stock";
import { toast } from "../lib/toast";
import { formatPrice, pluralize } from "../lib/utils";
import { useCatalog } from "../hooks/useCatalog";
import AuthPanel from "../components/ui/AuthPanel";
import PromoModal from "../components/ui/PromoModal";
import PromoRow from "../components/ui/PromoRow";
import Sheet from "../components/ui/Sheet";
import SizeSheet from "../components/ui/SizeSheet";
import StickyBar from "../components/ui/StickyBar";

const itemsWord = (n: number) => `${n} ${pluralize(n, "товар", "товара", "товаров")}`;

/** Коды ошибок сервера, после которых нужно заново показать актуальные цены и наличие. */
const REFRESH_CODES = new Set([
  "PRICE_CHANGED",
  "OUT_OF_STOCK",
  "SIZE_UNAVAILABLE",
  "PRODUCT_NOT_FOUND",
  "PROMO_INVALID",
]);

export default function CheckoutPage() {
  const navigate = useNavigate();
  const session = useCheckoutSession();
  const { isAuthenticated, phone } = useAuth();
  const cart = useCart();
  const { catalog, reload } = useCatalog({ fresh: true });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  const [sizeIndex, setSizeIndex] = useState<number | null>(null);

  const completedRef = useRef(false);
  const attemptRef = useRef<{ id: string; fingerprint: string } | null>(null);
  const sizeRef = useRef<HTMLElement>(null);
  const deliveryRef = useRef<HTMLElement>(null);
  const paymentRef = useRef<HTMLElement>(null);
  const itemsRef = useRef<HTMLElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = "Оформление заказа — VB STORE";
  }, []);

  // после входа/регистрации форма заменяет экран входа — показываем её сверху
  const wasAuthenticated = useRef(isAuthenticated);
  useEffect(() => {
    if (!wasAuthenticated.current && isAuthenticated) {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
    wasAuthenticated.current = isAuthenticated;
  }, [isAuthenticated]);

  // сообщение об ошибке отправки показываем сразу, а не где-то под закреплённой панелью
  useEffect(() => {
    if (submitError) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [submitError]);

  const lines = useMemo(
    () => (session ? resolveLines(session.lines, catalog) : []),
    [session, catalog]
  );

  if (!session && !completedRef.current) {
    return <Navigate to="/cart" replace />;
  }
  if (!session) return null;

  const delivery = session.form.delivery;
  const payment = session.form.payment;
  // --- что мешает оформить заказ ---------------------------------------------
  const sizeLines = lines.filter((line) => line.needsSize);
  // размер можно исправить прямо здесь (выбрать другой из доступных)
  const isSizeFixable = (line: ResolvedLine<CheckoutLine>) =>
    line.needsSize && line.issue !== null && line.issue !== "product_missing";
  const sizeProblems = lines.filter(isSizeFixable);
  // остальное исправить нельзя — позицию нужно убрать из заказа
  const removableProblems = lines.filter((line) => line.issue !== null && !isSizeFixable(line));
  const allowedPayments = getAvailablePaymentMethods(delivery);

  // Сумма — по тем позициям, которые покупатель может заказать (после выбора размера)
  const totals = calculateTotals(
    lines
      .filter((line) => line.issue === null || isSizeFixable(line))
      .map((line) => ({ price: line.price, quantity: line.source.quantity })),
    cart.promoCode
  );
  const promo = totals.promo;

  const deliveryError = !delivery.type
    ? "Выберите способ доставки"
    : delivery.type === "pickup" && !delivery.pickupAddress
      ? "Выберите адрес пункта выдачи"
      : delivery.type === "russia" && !delivery.service
        ? "Выберите службу доставки"
        : "";
  const paymentError = !payment ? "Выберите способ оплаты" : "";
  const sizeError = sizeProblems.length > 0 ? "Выберите размер из доступных" : "";
  const itemsError =
    removableProblems.length > 0 ? "Уберите из заказа недоступные товары" : "";

  const scrollTo = (ref: RefObject<HTMLElement | null>) =>
    ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });

  // --- отправка заказа ---------------------------------------------------------
  const submit = async () => {
    if (submitting) return;
    setSubmitError("");
    setShowErrors(true);

    if (sizeError) return scrollTo(sizeRef);
    if (itemsError) return scrollTo(itemsRef);
    if (deliveryError) return scrollTo(deliveryRef);
    if (paymentError) return scrollTo(paymentRef);
    if (!delivery.type || !payment) return;

    setSubmitting(true);
    try {
      // 1. Перед отправкой сверяем цены и остатки с актуальным каталогом
      const visibleTotal = totals.total;
      const freshList = await reload();
      const freshCatalog =
        freshList.length > 0 ? new Map(freshList.map((p) => [String(p.id), p])) : null;
      const freshLines = resolveLines(session.lines, freshCatalog);

      if (freshCatalog) {
        const unavailable = freshLines.find((line) => !isOrderable(line));
        if (unavailable) {
          setSubmitError(
            `${unavailable.name}: ${issueText(unavailable).toLowerCase()}. Измените заказ и попробуйте снова.`
          );
          return;
        }
      }

      const freshTotals = calculateTotals(
        freshLines.map((line) => ({ price: line.price, quantity: line.source.quantity })),
        cart.promoCode
      );
      if (freshTotals.total !== visibleTotal) {
        setSubmitError(
          `Цены обновились: теперь итого ${formatPrice(freshTotals.total)}. Проверьте заказ и нажмите «Заказать» ещё раз.`
        );
        return;
      }

      // 2. Один и тот же запрос при повторной попытке не создаст второй заказ
      const payloadCore = {
        items: freshLines.map((line) => ({
          productId: line.source.productId,
          size: line.source.size,
          color: line.source.color,
          quantity: line.source.quantity,
        })),
        promoCode: freshTotals.promo ? freshTotals.promo.code : null,
        delivery: {
          type: delivery.type,
          service: delivery.type === "russia" ? delivery.service : null,
          pickupAddress: delivery.type === "pickup" ? delivery.pickupAddress : null,
        },
        paymentMethod: payment,
        clientTotals: {
          subtotal: freshTotals.subtotal,
          discount: freshTotals.discount,
          total: freshTotals.total,
        },
      };
      const fingerprint = JSON.stringify(payloadCore);
      if (!attemptRef.current || attemptRef.current.fingerprint !== fingerprint) {
        attemptRef.current = { id: createRequestId(), fingerprint };
      }
      const input: CreateOrderInput = { ...payloadCore, requestId: attemptRef.current.id };

      // 3. Заказ создаётся на сервере (Google Apps Script → лист ORDERS)
      const order = await createOrder(input);

      // 4. Успех: убираем из корзины только оформленные товары
      completedRef.current = true;
      removeOrdered(orderedRefs(session.lines));
      clearPromoCode();
      clearCheckoutSession();
      analytics.purchase(order.orderId, order.total);
      navigate(`/order-success/${encodeURIComponent(order.orderId)}`, {
        replace: true,
        state: { order },
      });
    } catch (error) {
      if (error instanceof ApiError && error.code === "UNAUTHORIZED") {
        toast.error(error.message);
        return;
      }
      if (error instanceof ApiError && REFRESH_CODES.has(error.code)) {
        if (error.code === "PROMO_INVALID") clearPromoCode();
        void reload();
      }
      setSubmitError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const pickSizeLine = sizeIndex !== null ? lines[sizeIndex] : undefined;
  const orderButtonLabel = `Заказать ${formatPrice(totals.total)}`;
  const heading = (
    <header className="pb-4 pt-5 sm:pt-8">
      <BackButton />
      <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">
        Оформление заказа
      </h1>
      <p className="mt-2 text-sm text-white/40">
        {itemsWord(totals.quantity)}, {formatPrice(totals.total)}
      </p>
    </header>
  );

  // ---------------------------------------------------------------------------
  // Не авторизован: сначала вход / регистрация, затем оформление продолжается здесь же
  // ---------------------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen pb-[calc(var(--vb-mobile-nav-h,0px)+2rem)] pt-20 lg:pb-24">
        <div className="mx-auto max-w-xl px-4 sm:px-6">
          {heading}
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <UserRound size={20} className="mt-0.5 shrink-0 text-white/50" />
            <p className="text-sm leading-relaxed text-white/70">
              Чтобы оформить заказ, войдите в аккаунт или зарегистрируйтесь. Выбранные товары
              сохранятся — после входа вы продолжите оформление с этого же места.
            </p>
          </div>
          <AuthPanel initialTab="register" />
          <ul className="mt-5 flex flex-col gap-2">
            {lines.map((line, index) => (
              <ItemRow key={`${line.source.productId}-${index}`} line={line} />
            ))}
          </ul>
        </div>
      </main>
    );
  }

  const deliveryPriceLabel = getDeliveryPriceLabel(delivery);

  const summary = (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/50">Цена товаров</span>
        <span className="font-medium text-white">{formatPrice(totals.subtotal)}</span>
      </div>
      {totals.discount > 0 && (
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-white/50">Скидка</span>
          <span className="font-medium text-emerald-400">-{formatPrice(totals.discount)}</span>
        </div>
      )}
      <div className="mt-3 flex items-baseline justify-between border-t border-white/8 pt-3">
        <span className="text-base font-semibold text-white">Итого</span>
        <span className="text-xl font-bold text-white">{formatPrice(totals.total)}</span>
      </div>
      {deliveryPriceLabel && (
        <div className="mt-3 border-t border-white/8 pt-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-white/50">Доставка</span>
            <span
              className={`font-medium ${
                delivery.type === "pickup" ? "text-emerald-400" : "text-white"
              }`}
            >
              {deliveryPriceLabel}
            </span>
          </div>
          {delivery.type === "russia" && (
            <p className="mt-2 text-xs leading-relaxed text-white/40">
              Стоимость доставки не входит в итог. «От» — минимальная цена, точную сумму подтвердим
              при согласовании заказа.
            </p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <main className="min-h-screen pb-[calc(var(--vb-mobile-nav-h,0px)+7rem)] pt-20 lg:pb-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {heading}

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-8">
          <div className="flex min-w-0 flex-col gap-3">
            {/* Покупатель */}
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <UserRound size={18} className="shrink-0 text-white/50" />
              <p className="min-w-0 flex-1 truncate text-sm text-white/70">
                Заказ на номер{" "}
                <span className="font-semibold text-white">{formatPhone(phone)}</span>
              </p>
            </div>

            {/* Размер */}
            {sizeLines.length > 0 && (
              <Section
                title="Размер"
                innerRef={sizeRef}
                error={showErrors || sizeProblems.length > 0 ? sizeError : ""}
              >
                <ul className="flex flex-col gap-2">
                  {lines.map((line, index) =>
                    line.needsSize ? (
                      <li key={`${line.source.productId}-${index}`}>
                        <button
                          type="button"
                          disabled={!line.product}
                          onClick={() => setSizeIndex(index)}
                          className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition-colors hover:border-white/25 disabled:cursor-default"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-1 text-sm text-white/80">{line.name}</span>
                            {line.issue && (
                              <span className="mt-0.5 block text-xs font-medium text-rose-400">
                                {issueText(line)}
                              </span>
                            )}
                          </span>
                          <span
                            className={`shrink-0 text-sm font-semibold ${
                              line.issue || !line.source.size ? "text-rose-400" : "text-white"
                            }`}
                          >
                            {line.issue || !line.source.size
                              ? "Выберите размер"
                              : line.source.size}
                          </span>
                          {line.product && (
                            <ChevronRight size={16} className="shrink-0 text-white/30" />
                          )}
                        </button>
                      </li>
                    ) : null
                  )}
                </ul>
              </Section>
            )}

            {/* Способ доставки */}
            <Section
              title="Способ доставки"
              innerRef={deliveryRef}
              error={showErrors ? deliveryError : ""}
            >
              <div role="radiogroup" aria-label="Способ доставки" className="flex flex-col gap-2">
                {(["pickup", "russia"] as DeliveryType[]).map((type) => (
                  <div key={type}>
                    <OptionRow
                      selected={delivery.type === type}
                      onClick={() => setDelivery({ ...delivery, type })}
                      icon={type === "pickup" ? <MapPin size={18} /> : <Truck size={18} />}
                      title={DELIVERY_TYPE_LABELS[type]}
                      price={type === "pickup" ? PICKUP_PRICE_LABEL : getRussiaPriceFromLabel()}
                      priceAccent={type === "pickup"}
                    />

                    {/* Подробности выбора показываются прямо под выбранным способом */}
                    {type === "pickup" && delivery.type === "pickup" && (
                      <div className="mt-2">
                        {delivery.pickupAddress ? (
                          <button
                            type="button"
                            onClick={() => setAddressOpen(true)}
                            className="flex w-full items-center gap-3 rounded-xl border border-white bg-white/10 px-4 py-3.5 text-left"
                            aria-label={`Адрес доставки: ${delivery.pickupAddress}. Изменить`}
                          >
                            <MapPin size={18} className="shrink-0 text-white" />
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-medium text-white">
                                {delivery.pickupAddress}
                              </span>
                              <span className="block text-xs text-white/40">ПВЗ Wildberries</span>
                            </span>
                            <span className="shrink-0 text-xs font-semibold text-white/60">
                              Изменить
                            </span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setAddressOpen(true)}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/5 px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                          >
                            <MapPin size={16} />
                            Выбрать адрес доставки
                          </button>
                        )}
                      </div>
                    )}

                    {type === "russia" && delivery.type === "russia" && (
                      <div className="mt-2 rounded-xl border border-white/10 bg-black/30 p-3">
                        <p className="mb-2 text-xs text-white/40">Выберите службу доставки</p>
                        <div
                          role="radiogroup"
                          aria-label="Служба доставки"
                          className="flex flex-col gap-2"
                        >
                          {RUSSIA_SERVICES.map((service) => (
                            <OptionRow
                              key={service}
                              selected={delivery.service === service}
                              onClick={() => setDelivery({ ...delivery, service })}
                              title={service}
                              price={getDeliveryPriceLabel({ type: "russia", service }) ?? undefined}
                            />
                          ))}
                        </div>
                        <p className="mt-3 text-xs leading-relaxed text-white/35">
                          «От» — минимальная стоимость доставки. Выбранная служба передаётся вместе с
                          заказом, точную стоимость и детали мы уточним по телефону.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>

            {/* Как оплатить заказ? */}
            <Section
              title="Как оплатить заказ?"
              innerRef={paymentRef}
              error={showErrors ? paymentError : ""}
            >
              <div role="radiogroup" aria-label="Способ оплаты" className="flex flex-col gap-2">
                {allowedPayments.map((method) => (
                  <OptionRow
                    key={method}
                    selected={payment === method}
                    onClick={() => setPayment(method)}
                    title={PAYMENT_LABELS[method]}
                    description={
                      method === "prepaid"
                        ? "Мы свяжемся с вами для подтверждения способа оплаты"
                        : "Оплата заказа в пункте выдачи при получении"
                    }
                  />
                ))}
              </div>
              {!delivery.type && (
                <p className="mt-3 text-xs text-white/35">
                  Список способов оплаты зависит от способа доставки.
                </p>
              )}
            </Section>

            {/* Промокод */}
            <PromoRow
              promo={promo}
              onOpen={() => setPromoOpen(true)}
              onClear={() => {
                clearPromoCode();
                toast.info("Промокод удалён");
              }}
            />

            {/* Товары */}
            <Section title="Товары" innerRef={itemsRef} error={showErrors ? itemsError : ""}>
              <ul className="flex flex-col gap-3">
                {lines.map((line, index) => (
                  <ItemRow
                    key={`${line.source.productId}-${index}`}
                    line={line}
                    onRemove={
                      line.issue !== null && !isSizeFixable(line)
                        ? () => removeCheckoutLine(index)
                        : undefined
                    }
                  />
                ))}
              </ul>
            </Section>
          </div>

          {/* Итого */}
          <aside className="mt-3 flex flex-col gap-3 lg:sticky lg:top-24 lg:mt-0">
            {summary}

            {submitError && (
              <div
                ref={errorRef}
                role="alert"
                className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm leading-snug text-rose-300"
              >
                {submitError}
              </div>
            )}

            <button
              type="button"
              onClick={() => void submit()}
              disabled={submitting}
              className="hidden w-full items-center justify-center gap-2 rounded-2xl bg-white py-4 text-base font-bold text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60 lg:flex"
            >
              {submitting ? (
                <>
                  <LoaderCircle size={18} className="animate-spin" />
                  Оформляем…
                </>
              ) : (
                orderButtonLabel
              )}
            </button>
            <p className="hidden text-center text-xs leading-relaxed text-white/30 lg:block">
              Нажимая «Заказать», вы соглашаетесь на обработку персональных данных. Онлайн-оплаты
              на сайте нет — мы свяжемся с вами для подтверждения.
            </p>
          </aside>
        </div>

        <p className="mt-4 text-center text-xs leading-relaxed text-white/30 lg:hidden">
          Нажимая «Заказать», вы соглашаетесь на обработку персональных данных. Онлайн-оплаты на
          сайте нет — мы свяжемся с вами для подтверждения.
        </p>
      </div>

      <StickyBar>
        <div className="min-w-0 shrink-0">
          <p className="text-xs text-white/50">Итого</p>
          <p className="text-xs text-white/60">{itemsWord(totals.quantity)}</p>
        </div>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={submitting}
          className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3.5 text-sm font-bold text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <LoaderCircle size={16} className="animate-spin" />
              Оформляем…
            </>
          ) : (
            <span className="truncate">{orderButtonLabel}</span>
          )}
        </button>
      </StickyBar>

      {/* Выбор адреса пункта выдачи */}
      <Sheet open={addressOpen} onClose={() => setAddressOpen(false)} title="Адрес доставки">
        <div role="radiogroup" aria-label="Пункты выдачи" className="flex flex-col gap-2">
          {PICKUP_POINTS.map((point) => (
            <OptionRow
              key={point.id}
              selected={delivery.pickupAddress === point.address}
              onClick={() => {
                setDelivery({ ...delivery, type: "pickup", pickupAddress: point.address });
                setAddressOpen(false);
              }}
              icon={<MapPin size={18} />}
              title={point.address}
              description={point.isWildberries ? "ПВЗ Wildberries" : undefined}
            />
          ))}
        </div>
      </Sheet>

      <PromoModal open={promoOpen} onClose={() => setPromoOpen(false)} />

      <SizeSheet
        open={pickSizeLine !== undefined && pickSizeLine.product !== null}
        product={pickSizeLine?.product ?? null}
        selectedSize={pickSizeLine?.source.size ?? null}
        price={pickSizeLine?.price}
        onClose={() => setSizeIndex(null)}
        onSelect={(size) => {
          if (sizeIndex !== null && pickSizeLine?.product) {
            changeLineSize(sizeIndex, size, getMaxQuantity(pickSizeLine.product, size));
          }
          setSizeIndex(null);
        }}
      />
    </main>
  );
}

// ---------------------------------------------------------------------------

/** Какие позиции корзины считать оформленными (для очистки корзины после заказа). */
function orderedRefs(lines: readonly CheckoutLine[]): OrderedLineRef[] {
  return lines.flatMap((line): OrderedLineRef[] =>
    line.origins.length > 0
      ? line.origins.map((origin) => ({
          cartKey: origin.cartKey,
          productId: line.productId,
          size: line.size,
          color: line.color,
          quantity: origin.quantity,
        }))
      : [
          {
            cartKey: null,
            productId: line.productId,
            size: line.size,
            color: line.color,
            quantity: line.quantity,
          },
        ]
  );
}

function BackButton() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/cart"))}
      className="-ml-1 inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm text-white/50 transition-colors hover:text-white"
    >
      <ArrowLeft size={16} />
      Назад
    </button>
  );
}

function Section({
  title,
  error,
  innerRef,
  children,
}: {
  title: string;
  error?: string;
  innerRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  return (
    <section
      ref={innerRef}
      className={`glass scroll-mt-28 rounded-2xl p-4 sm:p-5 ${
        error ? "ring-1 ring-rose-400/60" : ""
      }`}
    >
      <h2 className="mb-3 text-base font-bold text-white">{title}</h2>
      {children}
      {error && (
        <p role="alert" className="mt-3 text-sm text-rose-400">
          {error}
        </p>
      )}
    </section>
  );
}

function OptionRow({
  selected,
  onClick,
  title,
  description,
  icon,
  price,
  priceAccent = false,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  /** Стоимость справа: «Бесплатно» / «от 96 ₽» */
  price?: string;
  priceAccent?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors ${
        selected
          ? "border-white bg-white/10"
          : "border-white/10 bg-white/5 hover:border-white/25"
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
          selected ? "border-white bg-white" : "border-white/30"
        }`}
      >
        {selected && <Check size={12} strokeWidth={3.5} className="text-black" />}
      </span>
      {icon && <span className="shrink-0 text-white/60">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-white">{title}</span>
        {description && <span className="mt-0.5 block text-xs text-white/40">{description}</span>}
      </span>
      {price && (
        <span
          className={`shrink-0 whitespace-nowrap text-sm font-semibold ${
            priceAccent ? "text-emerald-400" : "text-white/70"
          }`}
        >
          {price}
        </span>
      )}
    </button>
  );
}

function ItemRow({
  line,
  onRemove,
}: {
  line: ResolvedLine<CheckoutLine>;
  onRemove?: () => void;
}) {
  const { source } = line;
  const orderable = isOrderable(line);

  return (
    <li className="flex items-center gap-3">
      <Link
        to={`/catalog/${encodeURIComponent(source.productId)}`}
        className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white/5"
        aria-label={line.name}
      >
        {line.image ? (
          <img src={line.image} alt={line.name} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-2xl text-white/10">
            📦
          </span>
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm leading-snug text-white">{line.name}</p>
        <p className="mt-0.5 text-xs text-white/45">
          {source.size && <>Размер: {source.size} · </>}
          {source.color && <>Цвет: {source.color} · </>}
          {source.quantity} шт.
        </p>
        {line.issue && (
          <p className="mt-0.5 text-xs font-medium text-rose-400">
            {issueText(line)}
            {onRemove && (
              <>
                {" · "}
                <button
                  type="button"
                  onClick={onRemove}
                  className="font-semibold text-white underline underline-offset-2"
                >
                  Убрать из заказа
                </button>
              </>
            )}
          </p>
        )}
      </div>

      {orderable && (
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-white">
            {formatPrice(line.price * source.quantity)}
          </p>
          {source.quantity > 1 && (
            <p className="text-xs text-white/40">
              {formatPrice(line.price)} × {source.quantity}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
