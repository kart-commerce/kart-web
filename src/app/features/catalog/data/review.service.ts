import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { ProductRating, Review } from './models';
import { MOCK_RATINGS, MOCK_REVIEWS } from './mock-catalog';

/** Stands in for kart-review-service's `GET /v1/product-ratings/{sku}` and `GET /v1/reviews` — see mock-catalog.ts. */
@Injectable({ providedIn: 'root' })
export class ReviewService {
  getRating(sku: string): Observable<ProductRating | undefined> {
    return of(MOCK_RATINGS[sku]);
  }

  listReviews(sku: string): Observable<readonly Review[]> {
    return of(MOCK_REVIEWS.filter((review) => review.sku === sku));
  }
}
