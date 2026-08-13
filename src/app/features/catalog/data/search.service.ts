import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { DefaultService as SearchApi } from '../../../core/http/generated/search/v1';
import { ProductSummary } from './models';
import { toProductSummary } from './search-result-mapper';

/** Real `GET /v1/search` (kart-search-service), backed by OpenSearch. */
@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly searchApi = inject(SearchApi);

  search(query: string): Observable<readonly ProductSummary[]> {
    const term = query.trim();
    if (!term) {
      return of([]);
    }

    return this.searchApi.searchProducts(term).pipe(
      map((response) => response.results.map(toProductSummary)),
      catchError(() => of([])),
    );
  }
}
