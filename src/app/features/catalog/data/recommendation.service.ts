import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';

import { DefaultService as RecommendationApi } from '../../../core/http/generated/recommendation/v1';
import { ProductService } from './product.service';
import { ProductSummary } from './models';

/**
 * Real `GET /v1/recommendations/{userId}` (kart-recommendation-service). Fails open on any
 * error, and on a guest session with no `userId` to call the per-user endpoint with (there is
 * no anonymous-recommendations endpoint on this contract) — container-diagram.md's documented
 * degraded-mode behavior for this service, api-integration-map.md's Recommendations row: a
 * timeout/down dependency, or simply nothing to show, renders nothing, never an error block.
 */
@Injectable({ providedIn: 'root' })
export class RecommendationService {
  private readonly recommendationApi = inject(RecommendationApi);
  private readonly productService = inject(ProductService);

  listForUser(userId: string | null, limit = 8): Observable<readonly ProductSummary[]> {
    if (!userId) {
      return of([]);
    }
    return this.recommendationApi.getRecommendationsForUser(userId, limit).pipe(
      switchMap((response) => this.hydrate(response.items.map((item) => item.sku))),
      catchError(() => of([])),
    );
  }

  /** `RecommendedItem` only carries sku/score/source (recommendedItem.ts) — join against kart-product-service for the full card payload `ProductCard` needs. */
  private hydrate(skus: readonly string[]): Observable<readonly ProductSummary[]> {
    if (skus.length === 0) {
      return of([]);
    }
    return forkJoin(skus.map((sku) => this.productService.getBySku(sku))).pipe(
      map((products) => products.filter((product): product is NonNullable<typeof product> => product != null)),
    );
  }
}
