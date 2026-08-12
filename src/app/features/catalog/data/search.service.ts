import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { placeholderImage } from '../../../shared/util/placeholder-image';
import { DefaultService as SearchApi } from '../../../core/http/generated/search/v1';
import { SearchResultItem } from '../../../core/http/generated/search/v1/model/searchResultItem';
import { ProductSummary } from './models';

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

function toProductSummary(item: SearchResultItem): ProductSummary {
  return {
    sku: item.sku,
    // The search index doesn't carry a product-group id — only PDP's own real GetProduct call
    // (ProductService.getBySku) resolves it; a search-result card never needs it, only the sku.
    groupId: '',
    name: item.name,
    brand: item.brand,
    categoryId: item.category.categoryId,
    // The search index carries no image field (a content/indexing gap, not fixed this session) —
    // every result card renders a deterministic placeholder keyed off its own sku instead.
    thumbnailUrl: placeholderImage(item.sku, item.name),
    price: item.price,
    ratingAverage: item.rating.avg ?? 0,
    ratingCount: item.rating.count ?? 0,
    // Discontinued documents are excluded from the index entirely (search-service's own
    // edge-cases.md) — every result returned here is catalog-Active; real-time stock is checked
    // again at PDP/cart time, not re-fetched per search result.
    inStock: true,
  };
}
