import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { ProductSummary } from './models';
import { MOCK_PRODUCTS } from './mock-catalog';

/** Stands in for kart-recommendation-service's `GET /v1/recommendations/{userId}` — see mock-catalog.ts. */
@Injectable({ providedIn: 'root' })
export class RecommendationService {
  /** `userId` is unused by the mock but kept in the signature — the real endpoint is per-user. */
  listForUser(userId: string | null): Observable<readonly ProductSummary[]> {
    void userId;
    return of(MOCK_PRODUCTS.filter((product) => product.ratingAverage >= 4.5).slice(0, 8));
  }
}
