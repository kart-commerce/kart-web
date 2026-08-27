import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { UNAUTHENTICATED_SESSION } from '../../../core/auth/models';
import { RecommendationService } from '../data/recommendation.service';
import { ProductSummary } from '../data/models';
import { ProductRecommendations } from './product-recommendations';

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

describe('ProductRecommendations', () => {
  let recommendationServiceSpy: jasmine.SpyObj<Pick<RecommendationService, 'listForUser'>>;
  let authServiceSpy: jasmine.SpyObj<Pick<AuthService, 'session'>>;

  beforeEach(() => {
    recommendationServiceSpy = jasmine.createSpyObj('RecommendationService', ['listForUser']);
    recommendationServiceSpy.listForUser.and.returnValue(of([summary('A'), summary('B'), summary('C')]));
    authServiceSpy = jasmine.createSpyObj('AuthService', ['session']);
    authServiceSpy.session.and.returnValue({ ...UNAUTHENTICATED_SESSION, authenticated: true, userId: 'user-1' });
    // ProductCard (rendered by ProductRecommendations for each result) transitively injects the
    // real CartService, which subscribes to AuthService.loginCompleted$ in its constructor —
    // this spy must carry that property too, or CartService's own construction throws.
    (authServiceSpy as unknown as { loginCompleted$: Subject<void> }).loginCompleted$ = new Subject<void>();

    TestBed.configureTestingModule({
      imports: [ProductRecommendations],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: RecommendationService, useValue: recommendationServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });
  });

  it('requests recommendations for the current authenticated user', () => {
    const fixture = TestBed.createComponent(ProductRecommendations);
    fixture.detectChanges();

    expect(recommendationServiceSpy.listForUser).toHaveBeenCalledWith('user-1', 8);
  });

  it('passes null (guest) when the session is unauthenticated, without a userId', () => {
    authServiceSpy.session.and.returnValue(UNAUTHENTICATED_SESSION);
    const fixture = TestBed.createComponent(ProductRecommendations);
    fixture.detectChanges();

    expect(recommendationServiceSpy.listForUser).toHaveBeenCalledWith(null, 8);
  });

  it('excludes every sku named in excludeSkus (e.g. the current PDP sku, or every item in a just-placed order)', () => {
    const fixture = TestBed.createComponent(ProductRecommendations);
    fixture.componentRef.setInput('excludeSkus', ['B', 'C']);
    fixture.detectChanges();

    expect(fixture.componentInstance.related().map((p) => p.sku)).toEqual(['A']);
  });

  it('forwards a custom limit to the service', () => {
    const fixture = TestBed.createComponent(ProductRecommendations);
    fixture.componentRef.setInput('limit', 4);
    fixture.detectChanges();

    expect(recommendationServiceSpy.listForUser).toHaveBeenCalledWith('user-1', 4);
  });
});
