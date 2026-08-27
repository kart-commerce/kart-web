import { Money } from '../../../shared/util/money';

/** Card/grid/search-result shape — kart-product-service's list projection, not the full PDP payload. */
export interface ProductSummary {
  readonly sku: string;
  readonly groupId: string;
  readonly name: string;
  readonly brand: string;
  readonly categoryId: string;
  readonly thumbnailUrl: string;
  readonly price: Money;
  readonly listPrice?: Money;
  readonly ratingAverage: number;
  readonly ratingCount: number;
  readonly inStock: boolean;
}

export interface ProductVariant {
  readonly sku: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly price: Money;
  readonly inStock: boolean;
}

/** Full `GET /v1/products/{sku}` payload, joined client-side with its group's `GET /v1/product-groups/{id}/variants`. */
export interface Product extends ProductSummary {
  readonly description: string;
  readonly images: readonly string[];
  readonly attributes: Readonly<Record<string, string>>;
  readonly variants: readonly ProductVariant[];
}

export interface ProductRating {
  readonly sku: string;
  readonly average: number;
  readonly count: number;
  readonly distribution: Readonly<Record<1 | 2 | 3 | 4 | 5, number>>;
}

export type ReviewStatus = 'published' | 'pending';

export interface Review {
  readonly reviewId: string;
  readonly sku: string;
  readonly author: string;
  readonly rating: number;
  readonly title: string;
  readonly body: string;
  readonly createdAt: string;
  readonly verifiedPurchase: boolean;
  /** Moderation-aware rendering (requirement-spec.md §3.1) — a `pending` review only ever renders back to the author who submitted it, never to other visitors. */
  readonly status: ReviewStatus;
}

export interface ReviewSubmission {
  readonly author: string;
  readonly rating: number;
  readonly title: string;
  readonly body: string;
}
