import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { SearchResponse } from '../../../core/http/generated/search/v1/model/searchResponse';
import { SearchService } from './search.service';

function searchResponse(results: SearchResponse['results']): SearchResponse {
  return {
    results,
    facets: { category: [], price: [], rating: [] },
    pagination: { page: 1, size: 20, totalHits: results.length, totalHitsIsApproximate: false },
    truncated: false,
  };
}

describe('SearchService', () => {
  let service: SearchService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(SearchService);
  });

  afterEach(() => httpMock.verify());

  it('returns no results for a blank query without calling the backend', () => {
    let results: unknown;
    service.search('   ').subscribe((r) => (results = r));
    expect(results).toEqual([]);
  });

  it('calls the real GET /v1/search and maps results to ProductSummary', () => {
    let results: readonly { sku: string; name: string; brand: string }[] = [];
    service.search('aura').subscribe((r) => (results = r));

    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url.includes('/search'));
    req.flush(
      searchResponse([
        {
          sku: 'PHN-AURA-256-BLK',
          name: 'Aura Phone 15 Pro',
          brand: 'Nova',
          category: { categoryId: 'electronics' },
          price: { amount: 999, currency: 'USD' },
          availability: 'Active',
          rating: { avg: 4.6, count: 2140 },
        },
      ]),
    );

    expect(results.length).toBe(1);
    expect(results[0].sku).toBe('PHN-AURA-256-BLK');
    expect(results[0].brand).toBe('Nova');
  });

  it('returns an empty result set rather than throwing when the backend errors', () => {
    let results: unknown;
    service.search('anything').subscribe((r) => (results = r));

    httpMock.expectOne((r) => r.method === 'GET' && r.url.includes('/search')).flush('boom', { status: 500, statusText: 'Server Error' });

    expect(results).toEqual([]);
  });

  describe('searchWithFacets', () => {
    it('forwards category/price/rating/sort/page/size filters as real query params', () => {
      service.searchWithFacets('aura', { category: ['electronics'], priceMin: 100, priceMax: 500, ratingMin: 4, sort: 'price_asc', page: 2, size: 10 }).subscribe();

      const req = httpMock.expectOne(
        (r) =>
          r.method === 'GET' &&
          r.url.includes('/search') &&
          r.params.get('q') === 'aura' &&
          r.params.getAll('category')?.includes('electronics') === true &&
          r.params.get('priceMin') === '100' &&
          r.params.get('priceMax') === '500' &&
          r.params.get('ratingMin') === '4' &&
          r.params.get('sort') === 'price_asc' &&
          r.params.get('page') === '2' &&
          r.params.get('size') === '10',
      );
      req.flush(searchResponse([]));
    });

    it('surfaces facets, pagination, truncated, and degradedFacets rather than dropping them', () => {
      let result: { facets: unknown; pagination: unknown; truncated: boolean; degradedFacets: readonly string[] } | undefined;
      service.searchWithFacets('aura').subscribe((r) => (result = r));

      const req = httpMock.expectOne((r) => r.method === 'GET' && r.url.includes('/search'));
      req.flush({
        results: [],
        facets: { category: [{ value: 'electronics', count: 12 }], price: [], rating: [] },
        pagination: { page: 1, size: 20, totalHits: 12, totalHitsIsApproximate: false },
        truncated: true,
        degradedFacets: ['rating'],
      });

      expect(result?.facets).toEqual({ category: [{ value: 'electronics', count: 12 }], price: [], rating: [] });
      expect(result?.pagination).toEqual({ page: 1, size: 20, totalHits: 12, totalHitsIsApproximate: false });
      expect(result?.truncated).toBe(true);
      expect(result?.degradedFacets).toEqual(['rating']);
    });

    it('returns an empty result (never throws) when the backend errors', () => {
      let result: { items: readonly unknown[] } | undefined;
      service.searchWithFacets('anything').subscribe((r) => (result = r));

      httpMock.expectOne((r) => r.method === 'GET' && r.url.includes('/search')).flush('boom', { status: 500, statusText: 'Server Error' });

      expect(result?.items).toEqual([]);
    });

    it('short-circuits to an empty result for a blank query without calling the backend', () => {
      let result: { items: readonly unknown[] } | undefined;
      service.searchWithFacets('   ').subscribe((r) => (result = r));

      expect(result?.items).toEqual([]);
    });
  });
});
