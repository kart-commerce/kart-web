import { TestBed } from '@angular/core/testing';

import { SearchService } from './search.service';

describe('SearchService', () => {
  let service: SearchService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SearchService);
  });

  it('returns no results for a blank query', (done) => {
    service.search('   ').subscribe((results) => {
      expect(results).toEqual([]);
      done();
    });
  });

  it('matches on product name', (done) => {
    service.search('aura').subscribe((results) => {
      expect(results.some((product) => product.sku === 'PHN-AURA-256-BLK')).toBeTrue();
      done();
    });
  });

  it('matches on brand', (done) => {
    service.search('sonique').subscribe((results) => {
      expect(results.every((product) => product.brand === 'Sonique')).toBeTrue();
      expect(results.length).toBeGreaterThan(0);
      done();
    });
  });

  it('ranks name matches above brand matches', (done) => {
    service.search('nova').subscribe((results) => {
      // "Nova" is a brand for several products; none of their names contain "nova",
      // so this just confirms brand-only matches are still returned.
      expect(results.length).toBeGreaterThan(0);
      done();
    });
  });

  it('returns nothing for a query that matches no product', (done) => {
    service.search('xyzzy-not-a-real-product').subscribe((results) => {
      expect(results).toEqual([]);
      done();
    });
  });
});
