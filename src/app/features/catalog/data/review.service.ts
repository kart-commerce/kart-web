import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { ProductRating, Review, ReviewSubmission } from './models';
import { MOCK_RATINGS, MOCK_REVIEWS } from './mock-catalog';

/** Stands in for kart-review-service's `GET /v1/product-ratings/{sku}`, `GET /v1/reviews`, and `POST /v1/reviews` — see mock-catalog.ts. */
@Injectable({ providedIn: 'root' })
export class ReviewService {
  getRating(sku: string): Observable<ProductRating | undefined> {
    return of(MOCK_RATINGS[sku]);
  }

  /**
   * requirement-spec.md §3.1's "moderation-aware" rule: a review pending moderation is never
   * shown to other visitors — only `published` reviews are listed here. A just-submitted
   * pending review is rendered by the submitting component from its own local response, not
   * by re-querying this list.
   */
  listReviews(sku: string): Observable<readonly Review[]> {
    return of(MOCK_REVIEWS.filter((review) => review.sku === sku && review.status === 'published'));
  }

  /** New reviews always start `pending` — publishing is a moderation decision this client never makes. */
  submitReview(sku: string, submission: ReviewSubmission): Observable<Review> {
    const review: Review = {
      reviewId: crypto.randomUUID(),
      sku,
      author: submission.author,
      rating: submission.rating,
      title: submission.title,
      body: submission.body,
      createdAt: new Date().toISOString(),
      verifiedPurchase: false,
      status: 'pending',
    };
    return of(review);
  }
}
