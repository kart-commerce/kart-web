import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { RecommendationResponse } from '../../../core/http/generated/recommendation/v1/model/recommendationResponse';
import { RecommendationService } from './recommendation.service';
import { ProductService } from './product.service';
import { ProductSummary } from './models';

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

function recommendationResponse(items: RecommendationResponse['items']): RecommendationResponse {
  return { userId: 'user-1', items, generatedAt: new Date().toISOString(), availabilityFilterApplied: true };
}

describe('RecommendationService', () => {
  let service: RecommendationService;
  let httpMock: HttpTestingController;
  let productServiceSpy: jasmine.SpyObj<Pick<ProductService, 'getBySku'>>;

  beforeEach(() => {
    productServiceSpy = jasmine.createSpyObj('ProductService', ['getBySku']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ProductService, useValue: productServiceSpy },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(RecommendationService);
  });

  afterEach(() => httpMock.verify());

  it('returns no results and never calls the backend for a guest (no userId)', () => {
    let result: readonly unknown[] = [];
    service.listForUser(null).subscribe((r) => (result = r));

    expect(result).toEqual([]);
    httpMock.expectNone(() => true);
  });

  it('calls the real GET /v1/recommendations/{userId} and hydrates recommended skus into full ProductSummary objects', () => {
    productServiceSpy.getBySku.and.callFake((sku: string) =>
      of({ ...summary(sku), description: '', images: [], attributes: {}, variants: [] }),
    );

    let result: readonly { sku: string }[] = [];
    service.listForUser('user-1', 4).subscribe((r) => (result = r));

    const req = httpMock.expectOne(
      (r) => r.method === 'GET' && r.url.includes('/recommendations/user-1') && r.params.get('limit') === '4',
    );
    req.flush(
      recommendationResponse([
        { sku: 'A', score: 0.9, source: 'Personalized' },
        { sku: 'B', score: 0.5, source: 'Fallback' },
      ]),
    );

    expect(result.map((p) => p.sku)).toEqual(['A', 'B']);
  });

  it('drops a sku that failed to hydrate (getBySku returned undefined) rather than crashing', () => {
    productServiceSpy.getBySku.and.returnValue(of(undefined));

    let result: readonly unknown[] = [];
    service.listForUser('user-1').subscribe((r) => (result = r));

    httpMock.expectOne((r) => r.method === 'GET' && r.url.includes('/recommendations/user-1')).flush(
      recommendationResponse([{ sku: 'A', score: 0.9, source: 'Personalized' }]),
    );

    expect(result).toEqual([]);
  });

  it('fails open to an empty list when the recommendations endpoint errors', () => {
    let result: readonly unknown[] = [];
    service.listForUser('user-1').subscribe((r) => (result = r));

    httpMock
      .expectOne((r) => r.method === 'GET' && r.url.includes('/recommendations/user-1'))
      .flush('boom', { status: 500, statusText: 'Server Error' });

    expect(result).toEqual([]);
  });
});
