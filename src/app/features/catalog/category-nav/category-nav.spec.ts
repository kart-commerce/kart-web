import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CategoryNav } from './category-nav';

describe('CategoryNav', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CategoryNav],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('shows a loading spinner before the tree resolves', () => {
    const fixture = TestBed.createComponent(CategoryNav);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('kart-spinner')).toBeTruthy();
    httpMock.expectOne((r) => r.url.endsWith('/categories')).flush([]);
  });

  it('shows an empty-state message when there are no categories', () => {
    const fixture = TestBed.createComponent(CategoryNav);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url.endsWith('/categories')).flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No categories yet.');
  });

  it('renders the top-level category names once the tree resolves', () => {
    const fixture = TestBed.createComponent(CategoryNav);
    fixture.detectChanges();
    // depth 4 so no further (unflushed) child-probe request is triggered.
    httpMock.expectOne((r) => r.url.endsWith('/categories')).flush([
      { categoryId: 'electronics', name: 'Electronics', depth: 4, status: 'active', ancestorPath: [] },
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Electronics');
  });

  it('shows a graceful error message when the request fails', () => {
    const fixture = TestBed.createComponent(CategoryNav);
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.endsWith('/categories'))
      .flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Categories are unavailable right now.');
  });
});
