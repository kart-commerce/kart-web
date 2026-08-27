import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, ParamMap } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs';

import { KartInput, Spinner } from '../../../shared/ui';
import { ProductCard } from '../product-card/product-card';
import { SearchFilters, SearchService, SearchSort } from '../data/search.service';

interface ParsedSearchQuery {
  readonly query: string;
  readonly category: readonly string[];
  readonly priceBucket: string | null;
  readonly ratingBucket: string | null;
  readonly sort: SearchSort | null;
  readonly filters: SearchFilters;
}

const EMPTY_PARSED_QUERY: ParsedSearchQuery = {
  query: '',
  category: [],
  priceBucket: null,
  ratingBucket: null,
  sort: null,
  filters: {},
};

/** Price facet bucket values are labels like "25-50" or an open-ended "500+" (facetBucket.ts) — parsed into the priceMin/priceMax the real endpoint actually takes. */
function parsePriceBucket(bucket: string | null): { priceMin?: number; priceMax?: number } {
  if (!bucket) {
    return {};
  }
  if (bucket.endsWith('+')) {
    const min = Number(bucket.slice(0, -1));
    return Number.isFinite(min) ? { priceMin: min } : {};
  }
  const [minPart, maxPart] = bucket.split('-');
  const min = Number(minPart);
  const max = Number(maxPart);
  return {
    ...(Number.isFinite(min) ? { priceMin: min } : {}),
    ...(Number.isFinite(max) ? { priceMax: max } : {}),
  };
}

function parseSearchQuery(params: ParamMap): ParsedSearchQuery {
  const category = params.getAll('category');
  const priceBucket = params.get('price');
  const ratingBucket = params.get('rating');
  const sort = (params.get('sort') as SearchSort | null) ?? null;

  return {
    query: params.get('q') ?? '',
    category,
    priceBucket,
    ratingBucket,
    sort,
    filters: {
      ...(category.length > 0 ? { category } : {}),
      ...parsePriceBucket(priceBucket),
      ...(ratingBucket ? { ratingMin: Number(ratingBucket) } : {}),
      ...(sort ? { sort } : {}),
    },
  };
}

@Component({
  selector: 'kart-search-page',
  imports: [Spinner, ProductCard, KartInput],
  templateUrl: './search-page.html',
  styleUrl: './search-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly searchService = inject(SearchService);

  private readonly parsedQuery = toSignal(this.route.queryParamMap.pipe(map(parseSearchQuery)), {
    initialValue: EMPTY_PARSED_QUERY,
  });

  readonly query = computed(() => this.parsedQuery().query);
  readonly selectedCategories = computed(() => this.parsedQuery().category);
  readonly selectedPriceBucket = computed(() => this.parsedQuery().priceBucket);
  readonly selectedRatingBucket = computed(() => this.parsedQuery().ratingBucket);
  readonly selectedSort = computed(() => this.parsedQuery().sort ?? 'relevance');

  readonly hasActiveFilters = computed(
    () => this.selectedCategories().length > 0 || this.selectedPriceBucket() !== null || this.selectedRatingBucket() !== null,
  );

  readonly result = toSignal(
    this.route.queryParamMap.pipe(
      map(parseSearchQuery),
      switchMap(({ query, filters }) => this.searchService.searchWithFacets(query, filters)),
    ),
    { initialValue: undefined },
  );

  readonly items = computed(() => this.result()?.items);
  readonly facets = computed(() => this.result()?.facets);
  readonly pagination = computed(() => this.result()?.pagination);
  readonly truncated = computed(() => this.result()?.truncated ?? false);
  readonly degradedFacets = computed(() => this.result()?.degradedFacets ?? []);

  toggleCategory(categoryId: string): void {
    const current = this.selectedCategories();
    const next = current.includes(categoryId) ? current.filter((id) => id !== categoryId) : [...current, categoryId];
    this.updateQueryParams({ category: next.length > 0 ? next : null });
  }

  selectPriceBucket(bucket: string): void {
    this.updateQueryParams({ price: this.selectedPriceBucket() === bucket ? null : bucket });
  }

  selectRatingBucket(bucket: string): void {
    this.updateQueryParams({ rating: this.selectedRatingBucket() === bucket ? null : bucket });
  }

  changeSort(sort: string | null): void {
    this.updateQueryParams({ sort: sort && sort !== 'relevance' ? sort : null });
  }

  clearFilters(): void {
    this.updateQueryParams({ category: null, price: null, rating: null });
  }

  private updateQueryParams(patch: Record<string, string | readonly string[] | null>): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: patch, queryParamsHandling: 'merge' });
  }
}
