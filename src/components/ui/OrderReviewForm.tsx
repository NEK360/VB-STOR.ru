import { useState, type FormEvent } from "react";
import { LoaderCircle, Star } from "lucide-react";
import { createCustomerReview, type CustomerReview } from "../../lib/customerReviews";
import { getErrorMessage } from "../../lib/backend";
import type { OrderItem } from "../../lib/orders";

interface Props {
  orderId: string;
  item: OrderItem;
  alreadyReviewed: boolean;
  onSubmitted: (review: CustomerReview) => void;
}

/** Форма доступна только из доставленного заказа; сервер повторно проверяет право на отзыв. */
export default function OrderReviewForm({ orderId, item, alreadyReviewed, onSubmitted }: Props) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || rating < 1 || rating > 5) return;

    setSubmitting(true);
    setError("");
    try {
      const review = await createCustomerReview({
        orderId,
        productId: item.productId,
        size: item.size,
        color: item.color,
        rating,
        text,
      });
      onSubmitted(review);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="min-w-0 line-clamp-2 text-xs font-medium text-white/75">
          {item.name}{item.size ? ` · размер ${item.size}` : ""}
        </p>
        {alreadyReviewed && (
          <span className="shrink-0 rounded-md bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300">
            Отзыв оставлен
          </span>
        )}
      </div>

      {alreadyReviewed ? (
        <p className="text-xs text-white/40">Спасибо, что поделились впечатлением о покупке.</p>
      ) : (
        <form onSubmit={submit}>
          <fieldset disabled={submitting}>
            <legend className="mb-1.5 text-xs text-white/45">Ваша оценка</legend>
            <div className="flex items-center gap-1" role="radiogroup" aria-label="Оценка от 1 до 5">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={rating === value}
                  aria-label={`${value} ${value === 1 ? "звезда" : "звезды"}`}
                  onClick={() => setRating(value)}
                  className="rounded-md p-1.5 transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
                >
                  <Star
                    size={19}
                    className={value <= rating ? "fill-amber-400 text-amber-400" : "text-white/20"}
                  />
                </button>
              ))}
              {rating > 0 && <span className="ml-1 text-xs text-white/45">{rating}/5</span>}
            </div>
          </fieldset>

          <label className="mt-2 block">
            <span className="mb-1 block text-xs text-white/45">Комментарий — по желанию</span>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={1000}
              rows={2}
              placeholder="Расскажите о покупке"
              className="w-full resize-y rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/30"
            />
          </label>

          {error && <p role="alert" className="mt-2 text-xs leading-relaxed text-rose-300">{error}</p>}

          <button
            type="submit"
            disabled={submitting || rating < 1}
            className="mt-2 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35"
          >
            {submitting && <LoaderCircle size={14} className="animate-spin" />}
            {submitting ? "Отправляем…" : "Оставить отзыв"}
          </button>
        </form>
      )}
    </div>
  );
}
