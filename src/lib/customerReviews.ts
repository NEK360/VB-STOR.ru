import type { Review } from "../store-data/reviews";
import { ApiError, apiPost } from "./backend";
import { authedPost } from "./auth";

export interface CustomerReview extends Review {
  productId: string;
  orderId: string;
  size: string | null;
  color: string | null;
}

export interface CreateCustomerReviewInput {
  orderId: string;
  productId: string;
  size: string | null;
  color: string | null;
  rating: number;
  text?: string;
}

function stringValue(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

function parseReview(raw: unknown): CustomerReview | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const id = stringValue(value.reviewId ?? value.id).trim();
  const productId = stringValue(value.productId).trim();
  const rating = Number(value.rating);
  if (!id || !productId || !Number.isInteger(rating) || rating < 1 || rating > 5) return null;

  const createdAt = stringValue(value.createdAt ?? value.date);
  const parsedDate = new Date(createdAt);
  const date = Number.isNaN(parsedDate.getTime()) ? new Date(0).toISOString() : parsedDate.toISOString();

  return {
    id,
    productId,
    orderId: stringValue(value.orderId),
    size: stringValue(value.size).trim() || null,
    color: stringValue(value.color).trim() || null,
    name: stringValue(value.authorName ?? value.name).trim() || "Покупатель",
    rating,
    date,
    text: stringValue(value.text),
    verified: true,
  };
}

/** Отзывы для публичной карточки товара. API не возвращает телефон или номер заказа. */
export async function fetchProductReviews(productId: string): Promise<CustomerReview[]> {
  const id = String(productId).trim();
  if (!id) return [];
  const data = await apiPost<{ reviews?: unknown[] }>("productReviews", { productId: id });
  return (Array.isArray(data?.reviews) ? data.reviews : [])
    .map(parseReview)
    .filter((review): review is CustomerReview => review !== null);
}

/** Отзывы текущего пользователя — нужны для статуса «уже оставлен» в истории заказов. */
export async function fetchMyReviews(): Promise<CustomerReview[]> {
  const data = await authedPost<{ reviews?: unknown[] }>("myReviews", {}, 30_000);
  return (Array.isArray(data?.reviews) ? data.reviews : [])
    .map(parseReview)
    .filter((review): review is CustomerReview => review !== null);
}

export async function createCustomerReview(input: CreateCustomerReviewInput): Promise<CustomerReview> {
  const data = await authedPost<{ review?: unknown }>("createReview", {
    orderId: input.orderId,
    productId: input.productId,
    size: input.size,
    color: input.color,
    rating: input.rating,
    text: input.text?.trim() ?? "",
  });
  const review = parseReview(data?.review);
  if (!review) throw new ApiError("BAD_RESPONSE");
  return review;
}

export function isDeliveredOrderStatus(status: string): boolean {
  const value = String(status || "").replace(/\s+/g, " ").trim().toLowerCase();
  if (!value || /не\s*достав|недостав|не\s*получ|возврат/.test(value)) return false;
  return /^(доставлен[аоы]?|получен[аоы]?|delivered)(?:\s|$|[.,:;!])/.test(value);
}

export function hasReviewForOrderItem(
  reviews: readonly CustomerReview[],
  orderId: string,
  item: { productId: string; size: string | null; color: string | null }
): boolean {
  return reviews.some(
    (review) => review.orderId === orderId &&
      review.productId === item.productId &&
      (review.size ?? "") === (item.size ?? "") &&
      (review.color ?? "") === (item.color ?? "")
  );
}
