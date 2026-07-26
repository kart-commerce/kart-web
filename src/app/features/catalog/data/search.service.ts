import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { ProductSummary } from './models';
import { MOCK_PRODUCTS } from './mock-catalog';

/** Stands in for kart-search-service's `GET /v1/search` — see mock-catalog.ts's note. */
@Injectable({ providedIn: 'root' })
export class SearchService {
  search(query: string): Observable<readonly ProductSummary[]> {
    const term = query.trim().toLowerCase();
    if (!term) {
      return of([]);
    }

    const scored = MOCK_PRODUCTS.map((product) => ({ product, score: this.score(product, term) })).filter(
      (entry) => entry.score > 0,
    );
    scored.sort((a, b) => b.score - a.score);

    return of(scored.map((entry) => entry.product));
  }

  private score(product: ProductSummary, term: string): number {
    const name = product.name.toLowerCase();
    const brand = product.brand.toLowerCase();
    if (name.includes(term)) {
      return 3;
    }
    if (brand.includes(term)) {
      return 2;
    }
    if (product.categoryId.toLowerCase().includes(term)) {
      return 1;
    }
    return 0;
  }
}
