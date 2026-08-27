import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { DefaultService as SearchApi } from '../../../core/http/generated/search/v1';
import { Facets } from '../../../core/http/generated/search/v1/model/facets';
import { Pagination } from '../../../core/http/generated/search/v1/model/pagination';
import { SearchResponse } from '../../../core/http/generated/search/v1/model/searchResponse';
import { ProductSummary } from './models';
import { toProductSummary } from './search-result-mapper';

export type SearchSort = 'relevance' | 'price_asc' | 'price_desc' | 'rating_desc';

/** Facet/pagination filters accepted by `SearchService.searchWithFacets` — mirrors `GET /v1/search`'s query params 1:1 (kart-search-service's api-contract.yaml). */
export interface SearchFilters {
  readonly category?: readonly string[];
  readonly priceMin?: number;
  readonly priceMax?: number;
  readonly ratingMin?: number;
  readonly sort?: SearchSort;
  readonly page?: number;
  readonly size?: number;
}

/** Full `GET /v1/search` response mapped to view-friendly types — unlike `search()`, never drops `facets`/`pagination`. */
export interface SearchResult {
  readonly items: readonly ProductSummary[];
  readonly facets: Facets;
  readonly pagination: Pagination;
  /** `true` when the backend dropped one or more facet filters under its own 300ms query-time budget (edge-cases.md) — the facet UI must say so, not silently show a partial picture as if it were complete. */
  readonly truncated: boolean;
  readonly degradedFacets: readonly SearchResponse.DegradedFacetsEnum[];
}

const EMPTY_RESULT: SearchResult = {
  items: [],
  facets: {},
  pagination: { page: 1, size: 20, totalHits: 0, totalHitsIsApproximate: false },
  truncated: false,
  degradedFacets: [],
};

/** Real `GET /v1/search` (kart-search-service), backed by OpenSearch. */
@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly searchApi = inject(SearchApi);

  /** Suggestion/simple-results use (search-bar dropdown) — results only, no facets, no page/sort control. */
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

  /** Full search-results-page use: forwards every facet/sort/page param the backend accepts, and surfaces facets/pagination/truncation back rather than discarding them. */
  searchWithFacets(query: string, filters: SearchFilters = {}): Observable<SearchResult> {
    const term = query.trim();
    if (!term) {
      return of(EMPTY_RESULT);
    }

    return this.searchApi
      .searchProducts(
        term,
        filters.category && filters.category.length > 0 ? [...filters.category] : undefined,
        filters.priceMin,
        filters.priceMax,
        filters.ratingMin,
        filters.sort,
        filters.page,
        filters.size,
      )
      .pipe(
        map(
          (response): SearchResult => ({
            items: response.results.map(toProductSummary),
            facets: response.facets,
            pagination: response.pagination,
            truncated: response.truncated,
            degradedFacets: response.degradedFacets ?? [],
          }),
        ),
        catchError(() => of(EMPTY_RESULT)),
      );
  }
}
