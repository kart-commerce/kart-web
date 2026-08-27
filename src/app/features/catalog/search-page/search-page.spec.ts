import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { SearchResult, SearchService } from '../data/search.service';
import { ProductSummary } from '../data/models';
import { SearchPage } from './search-page';

function summary(sku: string): ProductSummary {
  return {
    sku,
    groupId: '',
    name: sku,
    brand: 'Brand',
    categoryId: 'cat',
    thumbnailUrl: '',
    price: { amount: 10, currency: 'USD' },
    ratingAverage: 4.5,
    ratingCount: 10,
    inStock: true,
  };
}

function result(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    items: [summary('A')],
    facets: {
      category: [{ value: 'electronics', count: 5 }],
      price: [{ value: '0-100', count: 3 }],
      rating: [{ value: '4', count: 2 }],
    },
    pagination: { page: 1, size: 20, totalHits: 1, totalHitsIsApproximate: false },
    truncated: false,
    degradedFacets: [],
    ...overrides,
  };
}

describe('SearchPage', () => {
  let searchServiceSpy: jasmine.SpyObj<Pick<SearchService, 'searchWithFacets'>>;
  let router: Router;

  function configure(queryParams: Record<string, string | string[]> = { q: 'aura' }) {
    searchServiceSpy = jasmine.createSpyObj('SearchService', ['searchWithFacets']);
    searchServiceSpy.searchWithFacets.and.returnValue(of(result()));

    TestBed.configureTestingModule({
      imports: [SearchPage],
      providers: [
        provideRouter([]),
        { provide: SearchService, useValue: searchServiceSpy },
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap(queryParams)) } },
      ],
    });
    router = TestBed.inject(Router);
  }

  it('forwards category/price/rating/sort filters parsed from the URL to searchWithFacets', () => {
    configure({ q: 'aura', category: ['electronics', 'phones'], price: '0-100', rating: '4', sort: 'price_asc' });
    const fixture = TestBed.createComponent(SearchPage);
    fixture.detectChanges();

    expect(searchServiceSpy.searchWithFacets).toHaveBeenCalledWith('aura', {
      category: ['electronics', 'phones'],
      priceMin: 0,
      priceMax: 100,
      ratingMin: 4,
      sort: 'price_asc',
    });
  });

  it('parses an open-ended price bucket like "500+" into priceMin only', () => {
    configure({ q: 'aura', price: '500+' });
    const fixture = TestBed.createComponent(SearchPage);
    fixture.detectChanges();

    expect(searchServiceSpy.searchWithFacets).toHaveBeenCalledWith('aura', { priceMin: 500 });
  });

  it('exposes facets/pagination/truncated/degradedFacets from the result for the template', () => {
    searchServiceSpy = jasmine.createSpyObj('SearchService', ['searchWithFacets']);
    searchServiceSpy.searchWithFacets.and.returnValue(
      of(result({ truncated: true, degradedFacets: ['rating'] })),
    );
    TestBed.configureTestingModule({
      imports: [SearchPage],
      providers: [
        provideRouter([]),
        { provide: SearchService, useValue: searchServiceSpy },
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({ q: 'aura' })) } },
      ],
    });
    const fixture = TestBed.createComponent(SearchPage);
    fixture.detectChanges();

    expect(fixture.componentInstance.truncated()).toBe(true);
    expect(fixture.componentInstance.degradedFacets()).toEqual(['rating']);
    expect(fixture.componentInstance.pagination()?.totalHits).toBe(1);
  });

  it('toggleCategory navigates with the category added, and again to remove it', () => {
    configure({ q: 'aura' });
    const fixture = TestBed.createComponent(SearchPage);
    fixture.detectChanges();
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    fixture.componentInstance.toggleCategory('electronics');
    expect(navigateSpy).toHaveBeenCalledWith([], jasmine.objectContaining({ queryParams: { category: ['electronics'] } }));
  });

  it('clearFilters navigates with category/price/rating all cleared', () => {
    configure({ q: 'aura', category: 'electronics', price: '0-100', rating: '4' });
    const fixture = TestBed.createComponent(SearchPage);
    fixture.detectChanges();
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    fixture.componentInstance.clearFilters();
    expect(navigateSpy).toHaveBeenCalledWith([], jasmine.objectContaining({ queryParams: { category: null, price: null, rating: null } }));
  });
});
