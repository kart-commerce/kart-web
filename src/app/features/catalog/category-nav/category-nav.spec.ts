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

  function openPanel(fixture: ReturnType<typeof TestBed.createComponent<CategoryNav>>) {
    (fixture.nativeElement.querySelector('.kart-category-nav__trigger') as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  it('renders the trigger collapsed by default, without a panel', () => {
    const fixture = TestBed.createComponent(CategoryNav);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Categories');
    expect(fixture.nativeElement.querySelector('.kart-category-nav__panel')).toBeNull();
    httpMock.expectOne((r) => r.url.endsWith('/categories')).flush([]);
  });

  it('shows a loading spinner before the tree resolves', () => {
    const fixture = TestBed.createComponent(CategoryNav);
    fixture.detectChanges();
    openPanel(fixture);

    expect(fixture.nativeElement.querySelector('kart-spinner')).toBeTruthy();
    httpMock.expectOne((r) => r.url.endsWith('/categories')).flush([]);
  });

  it('shows an empty-state message when there are no categories', () => {
    const fixture = TestBed.createComponent(CategoryNav);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url.endsWith('/categories')).flush([]);
    openPanel(fixture);

    expect(fixture.nativeElement.textContent).toContain('No categories yet.');
  });

  it('renders the top-level category names once the tree resolves, with a single request', () => {
    const fixture = TestBed.createComponent(CategoryNav);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url.endsWith('/categories')).flush([
      { categoryId: 'electronics', name: 'Electronics', depth: 1, status: 'active', ancestorPath: [] },
    ]);
    openPanel(fixture);

    expect(fixture.nativeElement.textContent).toContain('Electronics');
    httpMock.expectNone((r) => r.params.has('parentId'));
  });

  it('shows a graceful error message when the request fails', () => {
    const fixture = TestBed.createComponent(CategoryNav);
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.endsWith('/categories'))
      .flush(null, { status: 500, statusText: 'Server Error' });
    openPanel(fixture);

    expect(fixture.nativeElement.textContent).toContain('Categories are unavailable right now.');
  });

  it('closes the panel when clicking outside it', () => {
    const fixture = TestBed.createComponent(CategoryNav);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url.endsWith('/categories')).flush([]);
    openPanel(fixture);

    expect(fixture.nativeElement.querySelector('.kart-category-nav__panel')).toBeTruthy();

    document.body.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.kart-category-nav__panel')).toBeNull();
  });
});
